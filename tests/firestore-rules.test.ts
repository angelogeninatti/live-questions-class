/**
 * Test delle regole di sicurezza (`firebase.rules`) sull'emulatore di Firestore.
 * Avvio: `npm run test:rules` (scarica e avvia l'emulatore, esegue i test, lo spegne).
 *
 * Ogni test simula un utente diverso: il docente, uno studente anonimo, un visitatore
 * non autenticato. Per preparare i dati si usa un contesto che ignora le regole.
 */
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, it } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  setLogLevel,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';

/** Le regole da verificare e l'UID del docente scritto in `isHost()` (il segnaposto o quello vero). */
const RULES = readFileSync('firebase.rules', 'utf8');
const HOST_UID = /request\.auth\.uid == '([^']+)'/.exec(RULES)?.[1] ?? 'INSERISCI_QUI_UID_DOCENTE';
const QUIZ = 'quiz123abc';
const OTHER_QUIZ = 'quiz999zzz';
const GAME = 'game1';

let env: RulesTestEnvironment;

const host = () => env.authenticatedContext(HOST_UID, { firebase: { sign_in_provider: 'password' } }).firestore();
const student = (uid: string) => env.authenticatedContext(uid, { firebase: { sign_in_provider: 'anonymous' } }).firestore();
const visitor = () => env.unauthenticatedContext().firestore();

/**
 * Prepara un quiz in onda con una partita alla prima domanda, nello stato indicato.
 * Con `multipleAnswers` la domanda corrente ha più risposte corrette.
 */
async function seed(
  options: { status?: string; reviewPublished?: boolean; openedSecondsAgo?: number; multipleAnswers?: boolean } = {},
) {
  const multipleAnswers = options.multipleAnswers ?? false;
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const quiz = {
      title: 'Quiz',
      reviewPublished: options.reviewPublished ?? false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      questions: [{ id: 'q1', text: 'Domanda?', options: ['A', 'B', 'C'], timeLimit: 20, multipleAnswers }],
    };
    await setDoc(doc(db, 'quizzes', QUIZ), quiz);
    await setDoc(doc(db, 'quizzes', QUIZ, 'private', 'solutions'), { byQuestion: { q1: { correct: multipleAnswers ? [0, 2] : [1], explanation: '' } } });
    await setDoc(doc(db, 'quizzes', OTHER_QUIZ), { ...quiz, title: 'Altro quiz' });
    await setDoc(doc(db, 'quizzes', OTHER_QUIZ, 'private', 'solutions'), { byQuestion: {} });
    await setDoc(doc(db, 'config', 'activeGame'), { gameId: GAME, quizId: QUIZ });
    await setDoc(doc(db, 'live', QUIZ), { gameId: GAME });
    await setDoc(doc(db, 'config', 'moderation'), { bannedWords: ['brutto', 'xyz'] });
    await setDoc(doc(db, 'games', GAME), {
      quizId: QUIZ,
      quizTitle: 'Quiz',
      questionCount: 1,
      createdAt: Timestamp.now(),
      status: options.status ?? 'open',
      currentIndex: 0,
      currentQuestionId: 'q1',
      currentOptionCount: 3,
      currentTimeLimit: 20,
      currentMultipleAnswers: multipleAnswers,
      openedAt: { q1: Timestamp.fromMillis(Date.now() - (options.openedSecondsAgo ?? 1) * 1000) },
      revealed: {},
      leaderboard: [],
      kickedUids: ['kicked'],
    });
  });
}

/** Ingresso in partita come fa l'app: nickname "prenotato" + profilo, in un'unica scrittura. */
function join(db: ReturnType<typeof student>, uid: string, nickname: string) {
  const key = nickname.toLowerCase();
  const batch = writeBatch(db);
  batch.set(doc(db, 'games', GAME, 'nicknames', key), { uid });
  batch.set(doc(db, 'games', GAME, 'players', uid), { nickname, nicknameKey: key, joinedAt: serverTimestamp() });
  return batch.commit();
}

/** Inserisce direttamente un giocatore (senza passare dalle regole). */
async function seedPlayer(uid: string, nickname: string) {
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'games', GAME, 'players', uid), { nickname, nicknameKey: nickname.toLowerCase(), joinedAt: Timestamp.now() });
  });
}

/** Risposta come la invia l'app: una o più opzioni (un numero solo vale come `[numero]`). */
const answer = (db: ReturnType<typeof student>, uid: string, choices: number | number[], questionId = 'q1') =>
  setDoc(doc(db, 'games', GAME, 'questions', questionId, 'answers', uid), {
    choices: typeof choices === 'number' ? [choices] : choices,
    answeredAt: serverTimestamp(),
  });

before(async () => {
  setLogLevel('silent'); // i rifiuti attesi verrebbero altrimenti stampati come errori
  env = await initializeTestEnvironment({
    projectId: 'demo-quiz',
    firestore: { rules: RULES },
  });
});

beforeEach(async () => {
  await env.clearFirestore();
});

after(async () => {
  await env.cleanup();
});

describe('soluzioni', () => {
  it('uno studente anonimo NON legge le soluzioni non pubblicate', async () => {
    await seed();
    await assertFails(getDoc(doc(student('s1'), 'quizzes', QUIZ, 'private', 'solutions')));
  });

  it('un visitatore non autenticato NON legge le soluzioni non pubblicate', async () => {
    await seed();
    await assertFails(getDoc(doc(visitor(), 'quizzes', QUIZ, 'private', 'solutions')));
  });

  it('dopo la pubblicazione chiunque legge quiz e soluzioni (anche senza login)', async () => {
    await seed({ reviewPublished: true });
    await assertSucceeds(getDoc(doc(visitor(), 'quizzes', QUIZ, 'private', 'solutions')));
    await assertSucceeds(getDoc(doc(visitor(), 'quizzes', QUIZ)));
  });

  it('un id inesistente dà lo stesso errore di un quiz non pubblicato', async () => {
    await seed();
    await assertFails(getDoc(doc(visitor(), 'quizzes', 'nonesiste', 'private', 'solutions')));
    await assertFails(getDoc(doc(visitor(), 'quizzes', 'nonesiste')));
  });

  it('il docente legge e scrive le soluzioni; lo studente non le scrive', async () => {
    await seed();
    await assertSucceeds(getDoc(doc(host(), 'quizzes', QUIZ, 'private', 'solutions')));
    await assertFails(setDoc(doc(student('s1'), 'quizzes', QUIZ, 'private', 'solutions'), { byQuestion: {} }));
  });
});

describe('quiz e libreria', () => {
  it('lo studente legge la parte pubblica del quiz in onda, non quella degli altri', async () => {
    await seed();
    await assertSucceeds(getDoc(doc(student('s1'), 'quizzes', QUIZ)));
    await assertFails(getDoc(doc(student('s1'), 'quizzes', OTHER_QUIZ)));
  });

  it('solo il docente elenca la libreria e modifica i quiz', async () => {
    await seed();
    await assertSucceeds(getDocs(collection(host(), 'quizzes')));
    await assertFails(getDocs(collection(student('s1'), 'quizzes')));
    await assertFails(updateDoc(doc(student('s1'), 'quizzes', QUIZ), { reviewPublished: true }));
  });

  it('lo studente trova la partita solo conoscendo l\'id del quiz in onda', async () => {
    await seed();
    await assertSucceeds(getDoc(doc(student('s1'), 'live', QUIZ)));
    // Un quiz non in onda: il documento non esiste, la lettura è permessa ma vuota.
    await assertSucceeds(getDoc(doc(student('s1'), 'live', OTHER_QUIZ)));
    // Senza l'id non si scopre nulla: niente elenco dei puntatori né config/activeGame.
    await assertFails(getDocs(collection(student('s1'), 'live')));
    await assertFails(getDoc(doc(student('s1'), 'config', 'activeGame')));
    await assertSucceeds(getDoc(doc(host(), 'config', 'activeGame')));
  });

  it('solo il docente cambia la partita in onda e il suo stato', async () => {
    await seed();
    await assertFails(setDoc(doc(student('s1'), 'config', 'activeGame'), { gameId: 'x', quizId: 'y' }));
    await assertFails(setDoc(doc(student('s1'), 'live', OTHER_QUIZ), { gameId: GAME }));
    await assertSucceeds(setDoc(doc(host(), 'live', OTHER_QUIZ), { gameId: GAME }));
    await assertFails(updateDoc(doc(student('s1'), 'games', GAME), { status: 'revealed' }));
    await assertSucceeds(updateDoc(doc(host(), 'games', GAME), { status: 'closed' }));
  });
});

describe('ingresso in partita', () => {
  it('uno studente entra con un nickname libero', async () => {
    await seed();
    await assertSucceeds(join(student('s1'), 's1', 'Mario'));
  });

  it('un nickname già usato (anche con maiuscole diverse) viene rifiutato', async () => {
    await seed();
    await assertSucceeds(join(student('s1'), 's1', 'Mario'));
    await assertFails(join(student('s2'), 's2', 'MARIO'));
  });

  it('non si crea il profilo di un altro studente', async () => {
    await seed();
    await assertFails(join(student('s1'), 's2', 'Luigi'));
  });

  it('un nickname con una parola vietata viene rifiutato dalle regole', async () => {
    await seed();
    await assertFails(join(student('s1'), 's1', 'Sei brutto'));
    await assertFails(join(student('s2'), 's2', 'xyz'));
    await assertSucceeds(join(student('s3'), 's3', 'Bello'));
  });

  it('senza elenco di parole vietate lo stesso nickname è accettato (controprova)', async () => {
    await seed();
    await env.withSecurityRulesDisabled((context) => deleteDoc(doc(context.firestore(), 'config', 'moderation')));
    await assertSucceeds(join(student('s1'), 's1', 'Sei brutto'));
  });

  it('uno studente espulso non rientra', async () => {
    await seed();
    await assertFails(join(student('kicked'), 'kicked', 'Di nuovo'));
  });

  it('il nickname non si può cambiare dopo l\'ingresso', async () => {
    await seed();
    await assertSucceeds(join(student('s1'), 's1', 'Mario'));
    await assertFails(updateDoc(doc(student('s1'), 'games', GAME, 'players', 's1'), { nickname: 'Altro' }));
  });

  it('ognuno legge solo il proprio profilo; il docente li elenca tutti', async () => {
    await seed();
    await seedPlayer('s1', 'Mario');
    await assertSucceeds(getDoc(doc(student('s1'), 'games', GAME, 'players', 's1')));
    await assertFails(getDoc(doc(student('s2'), 'games', GAME, 'players', 's1')));
    await assertFails(getDocs(collection(student('s1'), 'games', GAME, 'players')));
    await assertSucceeds(getDocs(collection(host(), 'games', GAME, 'players')));
  });
});

describe('risposte', () => {
  it('lo studente risponde una volta sola e non può cambiare risposta', async () => {
    await seed();
    await seedPlayer('s1', 'Mario');
    await assertSucceeds(answer(student('s1'), 's1', 2));
    await assertFails(answer(student('s1'), 's1', 1));
    await assertFails(deleteDoc(doc(student('s1'), 'games', GAME, 'questions', 'q1', 'answers', 's1')));
  });

  it('non si risponde a nome di un altro', async () => {
    await seed();
    await seedPlayer('s1', 'Mario');
    await seedPlayer('s2', 'Luigi');
    await assertFails(answer(student('s1'), 's2', 0));
  });

  it('chi non è entrato in partita non può rispondere', async () => {
    await seed();
    await assertFails(answer(student('intruso'), 'intruso', 0));
  });

  it('non si risponde se la domanda non è aperta', async () => {
    await seed({ status: 'closed' });
    await seedPlayer('s1', 'Mario');
    await assertFails(answer(student('s1'), 's1', 0));
  });

  it('non si risponde a una domanda diversa da quella corrente', async () => {
    await seed();
    await seedPlayer('s1', 'Mario');
    await assertFails(answer(student('s1'), 's1', 0, 'q2'));
  });

  it('un indice di opzione inesistente viene rifiutato', async () => {
    await seed();
    await seedPlayer('s1', 'Mario');
    await assertFails(answer(student('s1'), 's1', 3));
    await assertFails(answer(student('s1'), 's1', -1));
  });

  it('una risposta vuota viene rifiutata', async () => {
    await seed({ multipleAnswers: true });
    await seedPlayer('s1', 'Mario');
    await assertFails(answer(student('s1'), 's1', []));
  });

  it('con una sola risposta corretta non si possono scegliere più opzioni', async () => {
    await seed();
    await seedPlayer('s1', 'Mario');
    await assertFails(answer(student('s1'), 's1', [0, 1]));
  });

  it('con più risposte corrette si inviano più opzioni insieme', async () => {
    await seed({ multipleAnswers: true });
    await seedPlayer('s1', 'Mario');
    await assertSucceeds(answer(student('s1'), 's1', [0, 2]));
  });

  it('con più risposte corrette, opzioni ripetute o inesistenti vengono rifiutate', async () => {
    await seed({ multipleAnswers: true });
    await seedPlayer('s1', 'Mario');
    await assertFails(answer(student('s1'), 's1', [1, 1]));
    await assertFails(answer(student('s1'), 's1', [0, 3]));
    await assertFails(answer(student('s1'), 's1', [0, 1, 2, 3]));
  });

  it('una risposta entro la tolleranza di 3 secondi dopo la scadenza è accettata', async () => {
    await seed({ openedSecondsAgo: 21 }); // tempo limite 20 s
    await seedPlayer('s1', 'Mario');
    await assertSucceeds(answer(student('s1'), 's1', 0));
  });

  it('una risposta oltre il tempo limite viene rifiutata', async () => {
    await seed({ openedSecondsAgo: 60 }); // tempo limite 20 s
    await seedPlayer('s1', 'Mario');
    await assertFails(answer(student('s1'), 's1', 0));
  });

  it("l'ora della risposta deve essere quella del server", async () => {
    await seed();
    await seedPlayer('s1', 'Mario');
    const db = student('s1');
    await assertFails(
      setDoc(doc(db, 'games', GAME, 'questions', 'q1', 'answers', 's1'), { choices: [0], answeredAt: Timestamp.fromMillis(0) }),
    );
  });

  it('lo studente legge solo la propria risposta; il docente le legge tutte', async () => {
    await seed();
    await seedPlayer('s1', 'Mario');
    await assertSucceeds(answer(student('s1'), 's1', 1));
    await assertSucceeds(getDoc(doc(student('s1'), 'games', GAME, 'questions', 'q1', 'answers', 's1')));
    await assertFails(getDoc(doc(student('s2'), 'games', GAME, 'questions', 'q1', 'answers', 's1')));
    await assertFails(getDocs(collection(student('s1'), 'games', GAME, 'questions', 'q1', 'answers')));
    await assertSucceeds(getDocs(collection(host(), 'games', GAME, 'questions', 'q1', 'answers')));
  });

  it('lo studente può leggere la propria risposta anche se non esiste ancora', async () => {
    await seed();
    await assertSucceeds(getDoc(doc(student('s1'), 'games', GAME, 'questions', 'q1', 'answers', 's1')));
  });
});

describe('moderazione', () => {
  it("l'elenco delle parole vietate si legge da autenticati e si scrive solo dal docente", async () => {
    await seed();
    await assertSucceeds(getDoc(doc(student('s1'), 'config', 'moderation')));
    await assertFails(getDoc(doc(visitor(), 'config', 'moderation')));
    await assertFails(setDoc(doc(student('s1'), 'config', 'moderation'), { bannedWords: [] }));
    await assertSucceeds(setDoc(doc(host(), 'config', 'moderation'), { bannedWords: ['nuova'] }));
  });
});
