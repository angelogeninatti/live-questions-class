/** Partecipanti di una partita: l'elenco completo (docente) o il proprio profilo (studente). */
import { useMemo } from 'react';
import { playerRef, playersCollection } from '../lib/db';
import type { Player, PlayerWithUid } from '../types';
import { useCollection, useDocument, type DocState } from './useFirestore';

/** Per il docente: tutti i partecipanti, in ordine di arrivo. */
export function usePlayers(gameId: string | null): PlayerWithUid[] {
  const state = useCollection(gameId === null ? null : playersCollection(gameId));
  return useMemo(() => {
    if (state.status !== 'ready') return [];
    return state.items
      .map(({ id, data }) => ({ uid: id, ...data }))
      .sort((a, b) => a.joinedAt.toMillis() - b.joinedAt.toMillis());
  }, [state]);
}

/** Per lo studente: il proprio profilo nella partita (`null` se non è ancora entrato). */
export function useMyPlayer(gameId: string, uid: string): DocState<Player> {
  return useDocument(playerRef(gameId, uid));
}
