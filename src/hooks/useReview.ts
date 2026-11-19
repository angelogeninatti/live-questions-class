/** Dati della pagina di ripasso: domande e soluzioni di un quiz, se pubblicate. */
import { useCallback, useEffect, useState } from 'react';
import { getDoc } from 'firebase/firestore';
import { quizRef, solutionsRef } from '../lib/db';
import type { QuizDoc, SolutionsDoc } from '../types';

export type ReviewState =
  | { status: 'loading' }
  /** Quiz inesistente OPPURE soluzioni non pubblicate: volutamente indistinguibili. */
  | { status: 'unavailable' }
  | { status: 'ready'; quiz: QuizDoc; solutions: SolutionsDoc };

/**
 * Lettura singola (non in tempo reale): il ripasso non cambia durante la consultazione.
 * `reload` permette di riprovare, ad esempio dopo che il docente ha pubblicato le soluzioni.
 */
export function useReview(quizId: string | null): { state: ReviewState; reload: () => void } {
  const [state, setState] = useState<ReviewState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (quizId === null) {
      setState({ status: 'unavailable' });
      return;
    }
    let cancelled = false; // evita di aggiornare lo stato se nel frattempo l'id è cambiato
    setState({ status: 'loading' });

    async function load(id: string) {
      try {
        // Prima le soluzioni: le regole le concedono solo se il ripasso è pubblicato.
        const solutions = await getDoc(solutionsRef(id));
        const quiz = await getDoc(quizRef(id));
        const quizData = quiz.data();
        const solutionsData = solutions.data();
        if (cancelled) return;
        if (quizData === undefined || solutionsData === undefined || !quizData.reviewPublished) {
          setState({ status: 'unavailable' });
        } else {
          setState({ status: 'ready', quiz: quizData, solutions: solutionsData });
        }
      } catch {
        // "Permesso negato" = quiz inesistente o soluzioni non pubblicate.
        if (!cancelled) setState({ status: 'unavailable' });
      }
    }
    void load(quizId);
    return () => {
      cancelled = true;
    };
  }, [quizId, attempt]);

  const reload = useCallback(() => setAttempt((count) => count + 1), []);
  return { state, reload };
}
