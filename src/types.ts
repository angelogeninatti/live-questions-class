/**
 * Modello dati condiviso dall'intera applicazione.
 *
 * Ci sono due famiglie di tipi:
 *  1. il formato del FILE JSON caricato dal docente (`QuizFile`), validato con zod
 *     in `lib/quizValidation.ts` (lo schema è vincolato a questi tipi dal compilatore);
 *  2. i DOCUMENTI salvati su Firestore (`QuizDoc`, `SolutionsDoc`, `Game`, ...).
 *
 * Mappa dei percorsi su Firestore (vedi anche `lib/db.ts` e `firebase.rules`):
 *
 *   quizzes/{quizId}                                   QuizDoc       parte pubblica + metadati
 *   quizzes/{quizId}/private/solutions                 SolutionsDoc  risposte corrette e spiegazioni
 *   config/activeGame                                  ActiveGame    quale partita è "in onda"
 *   config/moderation                                  ModerationDoc parole vietate nei nickname
 *   games/{gameId}                                     Game          stato della partita
 *   games/{gameId}/players/{uid}                       Player        un documento per studente
 *   games/{gameId}/nicknames/{nicknameKey}             NicknameClaim garantisce nickname univoci
 *   games/{gameId}/questions/{questionId}/answers/{uid} Answer       una risposta per studente
 */
import type { Timestamp } from 'firebase/firestore';

// ---------------------------------------------------------------------------
// 1. Formato del file di upload
// ---------------------------------------------------------------------------

/** Una domanda così come scritta dal docente nel file JSON. */
export interface QuestionFile {
  /** Identificativo univoco nel quiz (lettere, cifre, `-` e `_`). */
  id: string;
  text: string;
  /** Da 2 a 4 opzioni. */
  options: string[];
  /** Indice (da 0) dell'opzione corretta, oppure più indici se le corrette sono più d'una. */
  correct: number | number[];
  /** Secondi a disposizione; se assente la domanda resta aperta finché il docente la chiude. */
  timeLimit?: number;
  /** Spiegazione mostrata nella pagina di ripasso. */
  explanation?: string;
}

/** L'intero file JSON caricato dal docente. */
export interface QuizFile {
  title: string;
  questions: QuestionFile[];
}

// ---------------------------------------------------------------------------
// 2. Documenti su Firestore
// ---------------------------------------------------------------------------

/** Parte di una domanda che gli studenti possono leggere: niente soluzione. */
export interface PublicQuestion {
  id: string;
  text: string;
  options: string[];
  /** `null` = nessun limite di tempo (Firestore non accetta `undefined`). */
  timeLimit: number | null;
}

/** `quizzes/{quizId}`: metadati del quiz e domande senza soluzioni. */
export interface QuizDoc {
  title: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  /** Interruttore del ripasso: se `true` chiunque abbia il link legge le soluzioni. */
  reviewPublished: boolean;
  questions: PublicQuestion[];
}

/** Soluzione di una singola domanda. */
export interface Solution {
  /** Indici delle opzioni corrette (almeno uno). */
  correct: number[];
  explanation: string;
}

/** `quizzes/{quizId}/private/solutions`: soluzioni indicizzate per id della domanda. */
export interface SolutionsDoc {
  byQuestion: Record<string, Solution>;
}

/** Un quiz della libreria, con il suo id. */
export interface QuizSummary extends QuizDoc {
  id: string;
}

/** I soli dati di un quiz necessari per metterlo in onda. */
export type QuizToStart = Pick<QuizSummary, 'id' | 'title' | 'questions'>;

/** `config/activeGame`: la partita in onda (il documento non esiste se non c'è nulla in onda). */
export interface ActiveGame {
  gameId: string;
  quizId: string;
}

/** `config/moderation`: parole vietate nei nickname, gestite dal docente e mai salvate nel repository. */
export interface ModerationDoc {
  /** Parole in minuscolo e senza spazi, vedi `parseBannedWordsInput` in `lib/nickname.ts`. */
  bannedWords: string[];
}

/**
 * Fasi di una partita, nell'ordine in cui il docente le attraversa per ogni domanda:
 *  - `waiting`  la domanda corrente non è ancora stata mostrata agli studenti;
 *  - `open`     gli studenti vedono la domanda e possono rispondere;
 *  - `closed`   risposte chiuse, la soluzione non è ancora visibile;
 *  - `revealed` la soluzione della domanda corrente è visibile a tutti;
 *  - `finished` partita conclusa: si mostra la classifica finale.
 */
export type GameStatus = 'waiting' | 'open' | 'closed' | 'revealed' | 'finished';

/** Una riga della classifica, calcolata dal docente e copiata nel documento della partita. */
export interface LeaderboardEntry {
  uid: string;
  nickname: string;
  score: number;
  correctCount: number;
}

/** `games/{gameId}`: lo stato della partita, letto in tempo reale da tutti. Scrive solo il docente. */
export interface Game {
  quizId: string;
  quizTitle: string;
  questionCount: number;
  createdAt: Timestamp;
  status: GameStatus;

  // Dati della domanda corrente, copiati qui perché le regole di sicurezza
  // devono verificarli quando uno studente invia una risposta.
  currentIndex: number;
  currentQuestionId: string;
  currentOptionCount: number;
  currentTimeLimit: number | null;

  /** Istante di apertura di ogni domanda (serve per timer e bonus velocità). */
  openedAt: Record<string, Timestamp>;
  /** Risposte corrette, scritte dal docente solo al momento della rivelazione. */
  revealed: Record<string, number[]>;
  leaderboard: LeaderboardEntry[];
  /** Studenti espulsi dal docente: non possono rientrare in questa partita. */
  kickedUids: string[];
}

/** `games/{gameId}/players/{uid}`: creato dallo studente stesso quando entra. */
export interface Player {
  nickname: string;
  /** Versione normalizzata del nickname, usata per garantire l'unicità. */
  nicknameKey: string;
  joinedAt: Timestamp;
}

/** `games/{gameId}/nicknames/{nicknameKey}`: "prenota" un nickname per un solo studente. */
export interface NicknameClaim {
  uid: string;
}

/** `games/{gameId}/questions/{questionId}/answers/{uid}`: risposta di uno studente. */
export interface Answer {
  /** Indice dell'opzione scelta. */
  choice: number;
  /** Ora del server al momento dell'invio (le regole impediscono di falsificarla). */
  answeredAt: Timestamp;
}

/** Una risposta con l'uid del suo autore, come la riceve il docente. */
export interface AnswerWithUid extends Answer {
  uid: string;
}

/** Un partecipante con il suo uid, come lo vede il docente. */
export interface PlayerWithUid extends Player {
  uid: string;
}
