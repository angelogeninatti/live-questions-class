/**
 * Simula N studenti che entrano nella partita in onda e rispondono a ogni domanda
 * dopo un ritardo casuale. Serve a verificare che il pannello del docente si aggiorni
 * in tempo reale con molti partecipanti.
 *
 * Uso:
 *   npm run simulate -- 50           sugli emulatori locali (consigliato)
 *   npm run simulate -- 50 --real    sul progetto reale (legge VITE_FIREBASE_CONFIG da .env.local)
 *
 * Attenzione con --real: ogni studente simulato crea un account anonimo, e Firebase
 * accetta al massimo circa 100 nuovi account all'ora dallo stesso indirizzo IP.
 * Interrompi con Ctrl+C.
 */
import { initializeApp, type FirebaseOptions } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInAnonymously } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  doc,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';

const args = process.argv.slice(2);
const studentCount = Number(args.find((arg) => /^\d+$/.test(arg)) ?? 50);
const useRealProject = args.includes('--real');

function readConfig(): FirebaseOptions {
  if (!useRealProject) return { apiKey: 'demo-key', projectId: 'demo-quiz' };
  process.loadEnvFile('.env.local');
  const raw = process.env.VITE_FIREBASE_CONFIG;
  if (raw === undefined) throw new Error('VITE_FIREBASE_CONFIG mancante in .env.local');
  return JSON.parse(raw) as FirebaseOptions;
}

interface GameSnapshot {
  status: string;
  currentQuestionId: string;
  currentOptionCount: number;
  currentTimeLimit: number | null;
}

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Un singolo studente simulato, con la sua app Firebase (quindi la sua connessione e il suo account). */
async function runStudent(index: number, config: FirebaseOptions): Promise<void> {
  const app = initializeApp(config, `studente-${index}`);
  const auth = getAuth(app);
  const db: Firestore = getFirestore(app);
  if (!useRealProject) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }

  // Ingressi scaglionati, come in aula.
  await sleep(randomBetween(0, 3000));
  const { user } = await signInAnonymously(auth);
  const nickname = `Bot ${String(index + 1).padStart(2, '0')}`;
  const answered = new Set<string>();
  let joinedGameId: string | null = null;
  let unsubscribeGame: Unsubscribe | null = null;

  onSnapshot(doc(db, 'config', 'activeGame'), (active) => {
    const gameId = active.get('gameId') as string | undefined;
    if (gameId === undefined || gameId === joinedGameId) return;
    unsubscribeGame?.();
    joinedGameId = gameId;
    answered.clear();

    const key = nickname.toLowerCase();
    const batch = writeBatch(db);
    batch.set(doc(db, 'games', gameId, 'nicknames', key), { uid: user.uid });
    batch.set(doc(db, 'games', gameId, 'players', user.uid), { nickname, nicknameKey: key, joinedAt: serverTimestamp() });
    batch.commit().catch((error: unknown) => console.error(`${nickname}: ingresso fallito`, error));

    unsubscribeGame = onSnapshot(doc(db, 'games', gameId), (snapshot) => {
      const game = snapshot.data() as GameSnapshot | undefined;
      if (game === undefined || game.status !== 'open' || answered.has(game.currentQuestionId)) return;
      const questionId = game.currentQuestionId;
      answered.add(questionId);
      // Risponde entro l'80% del tempo disponibile (o entro 8 secondi se non c'è limite).
      const maxDelay = (game.currentTimeLimit ?? 10) * 800;
      const choice = Math.floor(Math.random() * game.currentOptionCount);
      setTimeout(() => {
        setDoc(doc(db, 'games', gameId, 'questions', questionId, 'answers', user.uid), {
          choice,
          answeredAt: serverTimestamp(),
        }).catch(() => console.warn(`${nickname}: risposta a ${questionId} rifiutata (domanda già chiusa?)`));
      }, randomBetween(500, maxDelay));
    });
  });
}

const config = readConfig();
console.log(`Avvio ${studentCount} studenti simulati su ${useRealProject ? 'progetto reale' : 'emulatori locali'}…`);
await Promise.all(Array.from({ length: studentCount }, (_, index) => runStudent(index, config)));
console.log('Tutti collegati. Avvia le domande dal pannello docente; Ctrl+C per uscire.');
