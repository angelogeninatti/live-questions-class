/**
 * Operazioni del docente sulla libreria dei quiz (tutte scritture su Firestore).
 *
 * Ogni quiz occupa due documenti: la parte pubblica (`quizzes/{id}`) e le soluzioni
 * (`quizzes/{id}/private/solutions`). Li scriviamo sempre insieme con un "batch":
 * o vanno a buon fine entrambe le scritture, o nessuna.
 */
import { getDoc, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import type { QuizFile, QuizToStart } from '../types';
import { quizRef, solutionsRef } from './db';
import { generateQuizId } from './ids';
import { splitQuiz } from './quizValidation';

/** Crea un nuovo quiz con un id nuovo. Restituisce l'id. */
export async function createQuiz(quiz: QuizFile): Promise<string> {
  // Con 32^10 combinazioni la probabilità di generare un id già usato è trascurabile.
  const quizId = generateQuizId();
  const { questions, solutions } = splitQuiz(quiz);
  const batch = writeBatch(db);
  batch.set(quizRef(quizId), {
    title: quiz.title,
    questions,
    reviewPublished: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(solutionsRef(quizId), { byQuestion: solutions });
  await batch.commit();
  return quizId;
}

/** Sostituisce domande e soluzioni mantenendo l'id, quindi anche il link di ripasso. */
export async function replaceQuiz(quizId: string, quiz: QuizFile): Promise<void> {
  const { questions, solutions } = splitQuiz(quiz);
  const batch = writeBatch(db);
  batch.update(quizRef(quizId), { title: quiz.title, questions, updatedAt: serverTimestamp() });
  batch.set(solutionsRef(quizId), { byQuestion: solutions });
  await batch.commit();
}

/** Copia un quiz con un nuovo id. La copia parte con le soluzioni nascoste. */
export async function duplicateQuiz(quizId: string): Promise<QuizToStart> {
  const [quizSnap, solutionsSnap] = await Promise.all([getDoc(quizRef(quizId)), getDoc(solutionsRef(quizId))]);
  const quiz = quizSnap.data();
  const solutions = solutionsSnap.data();
  if (quiz === undefined || solutions === undefined) throw new Error('Quiz non trovato.');

  const copy = { id: generateQuizId(), title: `${quiz.title} (copia)`, questions: quiz.questions };
  const batch = writeBatch(db);
  batch.set(quizRef(copy.id), {
    title: copy.title,
    questions: copy.questions,
    reviewPublished: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(solutionsRef(copy.id), solutions);
  await batch.commit();
  return copy;
}

/** Elimina un quiz e le sue soluzioni. Le partite già giocate restano nello storico. */
export async function deleteQuiz(quizId: string): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(solutionsRef(quizId));
  batch.delete(quizRef(quizId));
  await batch.commit();
}

/** Interruttore del ripasso: nessuna copia dei dati, cambia solo un booleano. */
export async function setReviewPublished(quizId: string, published: boolean): Promise<void> {
  await updateDoc(quizRef(quizId), { reviewPublished: published, updatedAt: serverTimestamp() });
}
