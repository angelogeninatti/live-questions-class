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

/**
 * Quota di punti meritata da una risposta, tra 0 e 1.
 * - Una sola opzione sbagliata (o nessuna opzione) vale 0.
 * - Altrimenti vale la frazione di opzioni corrette selezionate: con 3 corrette,
 *   selezionarne 2 vale 2/3. Con una sola corretta è quindi 0 oppure 1.
 */
export function creditFor(choices: readonly number[], correct: readonly number[] | undefined): number {
  if (correct === undefined || correct.length === 0 || choices.length === 0) return 0;
  if (choices.some((index) => !correct.includes(index))) return 0;
  return new Set(choices).size / correct.length;
}

/** Una risposta è corretta (del tutto) se seleziona tutte le opzioni corrette e nessuna sbagliata. */
export function isCorrect(choices: readonly number[], correct: readonly number[] | undefined): boolean {
  return creditFor(choices, correct) === 1;
}

/** Una risposta è parzialmente corretta se seleziona solo alcune delle opzioni corrette, e nessuna sbagliata. */
export function isPartiallyCorrect(choices: readonly number[], correct: readonly number[] | undefined): boolean {
  const credit = creditFor(choices, correct);
  return credit > 0 && credit < 1;
}

/** Messaggio per una risposta parzialmente corretta, es. "Hai trovato 2 risposte corrette su 3". */
export function partialText(choices: readonly number[], correct: readonly number[]): string {
  return `Hai trovato ${new Set(choices).size} risposte corrette su ${correct.length}`;
}

/**
 * Punti di una singola risposta: da 500 a 1000 se corretta (più è veloce, più punti),
 * moltiplicati per la quota meritata se è solo parzialmente corretta; 0 se sbagliata.
 */
export function pointsFor(
  answer: Answer,
  correct: readonly number[] | undefined,
  openedAtMillis: number | undefined,
  timeLimit: number | null,
): number {
  const credit = creditFor(answer.choices, correct);
  if (credit === 0) return 0;
  if (openedAtMillis === undefined) return Math.round(BASE_POINTS * credit);
  const windowSeconds = timeLimit ?? BONUS_WINDOW_WITHOUT_LIMIT;
  const elapsedSeconds = (answer.answeredAt.toMillis() - openedAtMillis) / 1000;
  // Frazione di tempo rimasto, limitata tra 0 e 1.
  const remaining = Math.min(1, Math.max(0, 1 - elapsedSeconds / windowSeconds));
  return Math.round((BASE_POINTS + MAX_SPEED_BONUS * remaining) * credit);
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
      entry.score += pointsFor(answer, correct, openedAt, question.timeLimit);
      // `correctCount` conta solo le risposte del tutto corrette, non quelle parziali.
      if (isCorrect(answer.choices, correct)) entry.correctCount += 1;
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
