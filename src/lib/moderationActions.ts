/** Gestione, da parte del docente, dell'elenco delle parole vietate nei nickname. */
import { setDoc } from 'firebase/firestore';
import { moderationRef } from './db';

/** Salva l'elenco in `config/moderation`: su Firestore, mai nel repository pubblico. */
export async function saveBannedWords(bannedWords: string[]): Promise<void> {
  await setDoc(moderationRef(), { bannedWords });
}
