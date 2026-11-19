/** La partita attualmente in onda, seguita in tempo reale (`config/activeGame` → `games/{id}`). */
import type { FirestoreError } from 'firebase/firestore';
import { activeGameRef, gameRef } from '../lib/db';
import type { Game } from '../types';
import { useDocument } from './useFirestore';

export type ActiveGameState =
  | { status: 'loading' }
  | { status: 'error'; error: FirestoreError }
  | { status: 'none' } // nessun quiz in onda
  | { status: 'live'; gameId: string; game: Game };

export function useActiveGame(): ActiveGameState {
  const active = useDocument(activeGameRef());
  const gameId = active.status === 'ready' ? (active.data?.gameId ?? null) : null;
  const game = useDocument(gameId === null ? null : gameRef(gameId));

  if (active.status === 'error') return active;
  if (game.status === 'error') return game;
  if (active.status === 'loading' || game.status === 'loading') return { status: 'loading' };
  if (gameId === null || game.data === null) return { status: 'none' };
  return { status: 'live', gameId, game: game.data };
}
