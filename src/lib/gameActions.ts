/**
 * Comandi del docente durante una partita. Ogni funzione corrisponde a un pulsante
 * del pannello e si limita a scrivere su Firestore: tutti i client in ascolto
 * (studenti e proiettore) si aggiornano da soli grazie a `onSnapshot`.
 *
 * Ciclo di ogni domanda:  waiting → open → closed → revealed → (domanda successiva) waiting ...
 */
import { arrayUnion, doc, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import type { ActiveGame, Game, GameStatus, LeaderboardEntry, PlayerWithUid, QuizToStart } from '../types';
import { activeGameRef, gameRef, gamesCollection, liveGameRef, nicknameRef, playerRef } from './db';

/**
 * Mette in onda un quiz: crea una nuova partita e la rende quella attiva.
 * L'eventuale partita precedente viene chiusa nella stessa scrittura atomica.
 *
 * Due "puntatori" alla partita: `config/activeGame` per il docente e `live/{quizId}`
 * per gli studenti, che lo trovano solo se conoscono l'id del quiz (dal link).
 */
export async function startGame(quiz: QuizToStart, previous: ActiveGame | null): Promise<string> {
  const firstQuestion = quiz.questions[0];
  if (firstQuestion === undefined) throw new Error('Il quiz non contiene domande.');

  const newGameRef = doc(gamesCollection()); // id generato da Firestore
  const game: Omit<Game, 'createdAt'> = {
    quizId: quiz.id,
    quizTitle: quiz.title,
    questionCount: quiz.questions.length,
    status: 'waiting',
    currentIndex: 0,
    currentQuestionId: firstQuestion.id,
    currentOptionCount: firstQuestion.options.length,
    currentTimeLimit: firstQuestion.timeLimit,
    currentMultipleAnswers: firstQuestion.multipleAnswers,
    openedAt: {},
    revealed: {},
    leaderboard: [],
    kickedUids: [],
  };

  const batch = writeBatch(db);
  batch.set(newGameRef, { ...game, createdAt: serverTimestamp() });
  if (previous !== null) {
    batch.update(gameRef(previous.gameId), { status: 'finished' });
    // Il link del quiz precedente smette di portare a una partita.
    if (previous.quizId !== quiz.id) batch.delete(liveGameRef(previous.quizId));
  }
  batch.set(activeGameRef(), { gameId: newGameRef.id, quizId: quiz.id });
  batch.set(liveGameRef(quiz.id), { gameId: newGameRef.id });
  await batch.commit();
  return newGameRef.id;
}

/** Toglie dalla onda la partita: gli studenti vedranno "quiz non in onda". */
export async function stopBroadcast(active: ActiveGame): Promise<void> {
  const batch = writeBatch(db);
  batch.update(gameRef(active.gameId), { status: 'finished' });
  batch.delete(activeGameRef());
  batch.delete(liveGameRef(active.quizId));
  await batch.commit();
}

/** "Avvia domanda": la domanda corrente diventa visibile e si accettano risposte. */
export async function openQuestion(gameId: string, questionId: string): Promise<void> {
  await updateDoc(gameRef(gameId), {
    status: 'open',
    // Notazione con il punto: aggiorna una sola chiave della mappa `openedAt`.
    [`openedAt.${questionId}`]: serverTimestamp(),
  });
}

/** "Chiudi risposte": da qui in poi le regole rifiutano nuove risposte. */
export async function closeAnswers(gameId: string): Promise<void> {
  await updateDoc(gameRef(gameId), { status: 'closed' });
}

/**
 * "Rivela soluzione": copia nella partita la risposta corretta della domanda corrente
 * (finora leggibile solo dal docente) e aggiorna la classifica.
 */
export async function revealSolution(
  gameId: string,
  questionId: string,
  correct: number[],
  leaderboard: LeaderboardEntry[],
): Promise<void> {
  await updateDoc(gameRef(gameId), {
    status: 'revealed',
    [`revealed.${questionId}`]: correct,
    leaderboard,
  });
}

/** "Domanda successiva" e "Indietro": sposta la partita su un'altra domanda. */
export async function goToQuestion(gameId: string, game: Game, quiz: QuizToStart, index: number): Promise<void> {
  const question = quiz.questions[index];
  if (question === undefined) return;
  // Se torniamo su una domanda già giocata, ripartiamo dallo stato in cui l'avevamo lasciata.
  let status: GameStatus = 'waiting';
  if (game.revealed[question.id] !== undefined) status = 'revealed';
  else if (game.openedAt[question.id] !== undefined) status = 'closed';

  await updateDoc(gameRef(gameId), {
    status,
    currentIndex: index,
    currentQuestionId: question.id,
    currentOptionCount: question.options.length,
    currentTimeLimit: question.timeLimit,
    currentMultipleAnswers: question.multipleAnswers,
  });
}

/** Termina la partita e mostra a tutti la classifica finale. */
export async function finishGame(gameId: string, leaderboard: LeaderboardEntry[]): Promise<void> {
  await updateDoc(gameRef(gameId), { status: 'finished', leaderboard });
}

/**
 * Espelle uno studente (es. nickname inappropriato sfuggito al filtro): ne cancella
 * il profilo e gli impedisce di rientrare nella stessa partita.
 */
export async function kickPlayer(gameId: string, player: PlayerWithUid): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(playerRef(gameId, player.uid));
  batch.delete(nicknameRef(gameId, player.nicknameKey));
  batch.update(gameRef(gameId), { kickedUids: arrayUnion(player.uid) });
  await batch.commit();
}
