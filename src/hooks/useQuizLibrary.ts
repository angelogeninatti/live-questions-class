/** Per il docente: tutti i quiz caricati, dal più recente. */
import { useMemo } from 'react';
import type { FirestoreError } from 'firebase/firestore';
import { quizzesCollection } from '../lib/db';
import type { QuizSummary } from '../types';
import { useCollection } from './useFirestore';

export type QuizLibraryState =
  | { status: 'loading' }
  | { status: 'error'; error: FirestoreError }
  | { status: 'ready'; quizzes: QuizSummary[] };

export function useQuizLibrary(): QuizLibraryState {
  const state = useCollection(quizzesCollection());
  return useMemo(() => {
    if (state.status !== 'ready') return state;
    const quizzes = state.items
      .map(({ id, data }) => ({ id, ...data }))
      .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
    return { status: 'ready', quizzes };
  }, [state]);
}
