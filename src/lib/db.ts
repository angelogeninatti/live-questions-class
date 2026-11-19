/**
 * Riferimenti tipizzati ai documenti e alle collezioni di Firestore.
 *
 * Tenere tutti i percorsi in un solo file evita stringhe sparse nel codice
 * e rende evidente la struttura del database (descritta anche in `types.ts`).
 *
 * Il "converter" dice a TypeScript che tipo hanno i dati: quelli letti e quelli scritti
 * con `setDoc`/`batch.set` sono controllati dal compilatore. Non fa controlli a runtime:
 * la forma dei dati è garantita dal fatto che scrive solo questa app e dalle regole
 * di sicurezza. Gli `updateDoc` parziali (anche con chiavi come "revealed.q1")
 * restano invece liberi, per questo il secondo tipo è il generico `DocumentData`.
 */
import {
  collection,
  doc,
  type CollectionReference,
  type DocumentData,
  type DocumentReference,
  type FirestoreDataConverter,
  type PartialWithFieldValue,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';
import type {
  ActiveGame,
  Answer,
  Game,
  LiveGame,
  ModerationDoc,
  NicknameClaim,
  Player,
  QuizDoc,
  SolutionsDoc,
} from '../types';

function converter<T extends DocumentData>(): FirestoreDataConverter<T, DocumentData> {
  return {
    toFirestore: (data: PartialWithFieldValue<T>) => data as DocumentData,
    fromFirestore: (snapshot: QueryDocumentSnapshot) =>
      // `estimate`: i timestamp del server appena scritti (ancora in volo)
      // vengono stimati con l'ora locale invece di essere `null`.
      snapshot.data({ serverTimestamps: 'estimate' }) as T,
  };
}

function typedDoc<T extends DocumentData>(path: string, ...segments: string[]): DocumentReference<T, DocumentData> {
  return doc(db, path, ...segments).withConverter(converter<T>());
}

function typedCollection<T extends DocumentData>(
  path: string,
  ...segments: string[]
): CollectionReference<T, DocumentData> {
  return collection(db, path, ...segments).withConverter(converter<T>());
}

// --- Quiz ------------------------------------------------------------------

export const quizzesCollection = () => typedCollection<QuizDoc>('quizzes');
export const quizRef = (quizId: string) => typedDoc<QuizDoc>('quizzes', quizId);
export const solutionsRef = (quizId: string) =>
  typedDoc<SolutionsDoc>('quizzes', quizId, 'private', 'solutions');

// --- Configurazione globale --------------------------------------------------

export const activeGameRef = () => typedDoc<ActiveGame>('config', 'activeGame');
export const moderationRef = () => typedDoc<ModerationDoc>('config', 'moderation');
export const liveGameRef = (quizId: string) => typedDoc<LiveGame>('live', quizId);

// --- Partite ---------------------------------------------------------------

export const gamesCollection = () => typedCollection<Game>('games');
export const gameRef = (gameId: string) => typedDoc<Game>('games', gameId);
export const playersCollection = (gameId: string) =>
  typedCollection<Player>('games', gameId, 'players');
export const playerRef = (gameId: string, uid: string) =>
  typedDoc<Player>('games', gameId, 'players', uid);
export const nicknameRef = (gameId: string, nicknameKey: string) =>
  typedDoc<NicknameClaim>('games', gameId, 'nicknames', nicknameKey);
export const answersCollection = (gameId: string, questionId: string) =>
  typedCollection<Answer>('games', gameId, 'questions', questionId, 'answers');
export const answerRef = (gameId: string, questionId: string, uid: string) =>
  typedDoc<Answer>('games', gameId, 'questions', questionId, 'answers', uid);
