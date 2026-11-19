/** Parte pubblica di un quiz (testi e opzioni) e, per il docente, le sue soluzioni. */
import { quizRef, solutionsRef } from '../lib/db';
import type { QuizSummary, SolutionsDoc } from '../types';
import { useDocument, type DocState } from './useFirestore';

export function useQuiz(quizId: string | null): DocState<QuizSummary> {
  const state = useDocument(quizId === null ? null : quizRef(quizId));
  if (state.status !== 'ready') return state;
  // Aggiungiamo l'id, che in Firestore non sta dentro il documento ma nel suo percorso.
  const data = state.data === null || quizId === null ? null : { id: quizId, ...state.data };
  return { status: 'ready', data };
}

/** Solo per il docente: per gli altri le regole rifiutano la lettura (finché il ripasso non è pubblicato). */
export function useSolutions(quizId: string | null): DocState<SolutionsDoc> {
  return useDocument(quizId === null ? null : solutionsRef(quizId));
}
