/** Le due sole scritture che può fare uno studente: entrare in partita e rispondere. */
import { getDoc, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { answerRef, nicknameRef, playerRef } from './db';
import { nicknameKey } from './nickname';

/** Errore con un messaggio già pronto da mostrare allo studente. */
export class JoinError extends Error {}

/**
 * Entra nella partita con un nickname.
 *
 * L'unicità è garantita da un documento `nicknames/{chiave}` per ogni nickname:
 * lo creiamo nella stessa scrittura atomica del giocatore e le regole permettono
 * di crearlo solo se non esiste già. Se due studenti scelgono lo stesso nome
 * nello stesso istante, uno dei due riceve un errore.
 */
export async function joinGame(gameId: string, uid: string, nickname: string): Promise<void> {
  const key = nicknameKey(nickname);

  // Controllo preventivo, solo per dare un messaggio chiaro nel caso più comune.
  const existing = await getDoc(nicknameRef(gameId, key));
  if (existing.exists() && existing.data().uid !== uid) {
    throw new JoinError('Questo nickname è già usato da un altro partecipante.');
  }

  const batch = writeBatch(db);
  batch.set(nicknameRef(gameId, key), { uid });
  batch.set(playerRef(gameId, uid), { nickname, nicknameKey: key, joinedAt: serverTimestamp() });
  try {
    await batch.commit();
  } catch {
    // Le regole rifiutano: nickname appena preso da qualcun altro, parola vietata
    // sfuggita al controllo locale, oppure studente espulso dal docente.
    throw new JoinError('Impossibile entrare con questo nickname. Prova con un altro.');
  }
}

/**
 * Invia la risposta alla domanda corrente: l'opzione scelta, o tutte quelle selezionate
 * se la domanda ha più risposte corrette. Il documento ha come id l'uid dello studente:
 * le regole permettono di crearlo una sola volta e mai di modificarlo.
 */
export async function submitAnswer(gameId: string, questionId: string, uid: string, choices: readonly number[]): Promise<void> {
  await setDoc(answerRef(gameId, questionId, uid), { choices: [...choices], answeredAt: serverTimestamp() });
}
