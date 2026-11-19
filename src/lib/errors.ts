/** Traduce gli errori (soprattutto quelli di Firebase, in inglese) in messaggi per l'utente. */
import { FirebaseError } from 'firebase/app';

const FIREBASE_MESSAGES: Record<string, string> = {
  'permission-denied': 'Permesso negato dalle regole di sicurezza.',
  unavailable: 'Connessione al database non disponibile. Controlla la rete.',
  'not-found': 'Elemento non trovato.',
  'auth/invalid-credential': 'Email o password non corretti.',
  'auth/user-not-found': 'Nessun account con questa email.',
  'auth/wrong-password': 'Email o password non corretti.',
  'auth/invalid-email': 'Indirizzo email non valido.',
  'auth/too-many-requests': 'Troppi tentativi: riprova tra qualche minuto.',
  'auth/network-request-failed': 'Errore di rete: controlla la connessione.',
};

export function describeError(error: unknown): string {
  if (error instanceof FirebaseError) return FIREBASE_MESSAGES[error.code] ?? `Errore (${error.code}).`;
  if (error instanceof Error) return error.message;
  return 'Operazione non riuscita.';
}
