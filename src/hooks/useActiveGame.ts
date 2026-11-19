/**
 * La partita in onda, seguita in tempo reale. Due punti di vista:
 *  - il docente parte da `config/activeGame` (quale quiz è in onda, qualunque sia);
 *  - lo studente parte da `live/{quizId}`, con l'id del quiz preso dal link.
 * In entrambi i casi si segue un "puntatore" e poi il documento `games/{id}` a cui punta.
 */
import type { DocumentData, DocumentReference, FirestoreError } from 'firebase/firestore';
import { activeGameRef, gameRef, liveGameRef } from '../lib/db';
import type { Game } from '../types';
import { useDocument } from './useFirestore';

export type ActiveGameState =
  | { status: 'loading' }
  | { status: 'error'; error: FirestoreError }
  | { status: 'none' } // nessun quiz in onda (o non quello richiesto)
  | { status: 'live'; gameId: string; game: Game };

/** Per il docente: la partita in onda, qualunque quiz sia. */
export function useActiveGame(): ActiveGameState {
  return useGamePointedBy(activeGameRef());
}

/** Per gli studenti: la partita del quiz indicato, se è quello in onda. */
export function useLiveGame(quizId: string): ActiveGameState {
  return useGamePointedBy(liveGameRef(quizId));
}

function useGamePointedBy<T extends { gameId: string }>(pointerRef: DocumentReference<T, DocumentData>): ActiveGameState {
  const pointer = useDocument(pointerRef);
  const gameId = pointer.status === 'ready' ? (pointer.data?.gameId ?? null) : null;
  const game = useDocument(gameId === null ? null : gameRef(gameId));

  if (pointer.status === 'error') return pointer;
  if (game.status === 'error') return game;
  if (pointer.status === 'loading' || game.status === 'loading') return { status: 'loading' };
  if (gameId === null || game.data === null) return { status: 'none' };
  return { status: 'live', gameId, game: game.data };
}
