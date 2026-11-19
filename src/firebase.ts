/**
 * Inizializzazione di Firebase: un'unica app, un'unica istanza di Auth e di Firestore
 * condivise da tutta l'applicazione.
 *
 * La configurazione (apiKey, projectId, ...) è pubblica per natura: finisce comunque
 * nel JavaScript scaricato dal browser. Non è un segreto: la protezione dei dati
 * sta tutta nelle regole di sicurezza (`firebase.rules`).
 * La leggiamo da una variabile d'ambiente solo per non legare il codice a un progetto.
 */
import { initializeApp, type FirebaseOptions } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

const useEmulators = import.meta.env.VITE_USE_EMULATORS === 'true';

function readConfig(): FirebaseOptions {
  if (useEmulators) {
    // Gli emulatori accettano qualsiasi chiave; il nome "demo-..." evita
    // di contattare per sbaglio un progetto reale.
    return { apiKey: 'demo-key', projectId: 'demo-quiz', authDomain: 'localhost' };
  }
  const raw: unknown = import.meta.env.VITE_FIREBASE_CONFIG;
  if (typeof raw !== 'string' || raw.trim() === '') {
    throw new Error(
      'Configurazione Firebase mancante: imposta VITE_FIREBASE_CONFIG (vedi .env.example).',
    );
  }
  try {
    return JSON.parse(raw) as FirebaseOptions;
  } catch {
    throw new Error(
      'VITE_FIREBASE_CONFIG non è un JSON valido: le chiavi devono essere tra virgolette doppie.',
    );
  }
}

export const app = initializeApp(readConfig());
export const auth = getAuth(app);
export const db = getFirestore(app);

if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
