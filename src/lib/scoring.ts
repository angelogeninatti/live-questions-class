/**
 * Punteggi e classifica. Sono funzioni "pure": ricevono i dati e restituiscono un risultato,
 * senza leggere né scrivere su Firestore. Così si possono capire (e testare) da sole.
 */
import type { Answer, AnswerWithUid, Game, LeaderboardEntry, PlayerWithUid, PublicQuestion } from '../types';

/** Punti per una risposta corretta, più un bonus che cala con il tempo impiegato. */
export const BASE_POINTS = 500;
export const MAX_SPEED_BONUS = 500;
/** Per le domande senza limite di tempo il bonus si esaurisce dopo questi secondi. */
const BONUS_WINDOW_WITHOUT_LIMIT = 30;

export function isCorrect(choice: number, correct: readonly number[] | undefined): boolean {
  return correct?.includes(choice) ?? false;
}

/** Punti di una singola risposta: 0 se sbagliata, da 500 a 1000 se corretta. */
export function pointsFor(
  answer: Answer,
  correct: readonly number[] | undefined,
  openedAtMillis: number | undefined,
  timeLimit: number | null,
): number {
  if (!isCorrect(answer.choice, correct)) return 0;
  if (openedAtMillis === undefined) return BASE_POINTS;
  const windowSeconds = timeLimit ?? BONUS_WINDOW_WITHOUT_LIMIT;
  const elapsedSeconds = (answer.answeredAt.toMillis() - openedAtMillis) / 1000;
  // Frazione di tempo rimasto, limitata tra 0 e 1.
  const remaining = Math.min(1, Math.max(0, 1 - elapsedSeconds / windowSeconds));
  return BASE_POINTS + Math.round(MAX_SPEED_BONUS * remaining);
}

/**
 * Classifica calcolata da zero a partire da tutte le risposte alle domande già rivelate.
 * Ricalcolarla ogni volta (invece di sommare punti man mano) la rende sempre coerente,
 * anche se il docente torna indietro e rivela di nuovo una domanda.
 */
export function computeLeaderboard(
  game: Game,
  questions: readonly PublicQuestion[],
  players: readonly PlayerWithUid[],
  answersByQuestion: Readonly<Record<string, AnswerWithUid[]>>,
): LeaderboardEntry[] {
  const entries = new Map<string, LeaderboardEntry>(
    players.map((player) => [
      player.uid,
      { uid: player.uid, nickname: player.nickname, score: 0, correctCount: 0 },
    ]),
  );

  for (const question of questions) {
    const correct = game.revealed[question.id];
    if (correct === undefined) continue; // domanda non ancora rivelata: non conta
    const openedAt = game.openedAt[question.id]?.toMillis();
    for (const answer of answersByQuestion[question.id] ?? []) {
      const entry = entries.get(answer.uid);
      if (entry === undefined) continue; // studente espulso o non più in partita
      const points = pointsFor(answer, correct, openedAt, question.timeLimit);
      entry.score += points;
      if (points > 0) entry.correctCount += 1;
    }
  }

  return [...entries.values()].sort(
    (a, b) => b.score - a.score || a.nickname.localeCompare(b.nickname, 'it'),
  );
}

/** Posizione in classifica (1 = primo). A pari punteggio, pari posizione. */
export function rankOf(leaderboard: readonly LeaderboardEntry[], uid: string): number | null {
  const entry = leaderboard.find((candidate) => candidate.uid === uid);
  if (entry === undefined) return null;
  return leaderboard.filter((other) => other.score > entry.score).length + 1;
}
