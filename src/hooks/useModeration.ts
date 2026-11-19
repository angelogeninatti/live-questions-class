/** Elenco delle parole vietate nei nickname (`config/moderation`). */
import { useMemo } from 'react';
import { moderationRef } from '../lib/db';
import { useDocument } from './useFirestore';

/** `null` finché l'elenco non è stato letto; `[]` se il docente non ne ha impostato uno. */
export function useBannedWords(): string[] | null {
  const state = useDocument(moderationRef());
  return useMemo(() => {
    if (state.status === 'loading') return null;
    // In caso di errore di lettura non blocchiamo l'ingresso:
    // resta comunque il controllo delle regole di sicurezza.
    if (state.status === 'error') return [];
    return state.data?.bannedWords ?? [];
  }, [state]);
}
