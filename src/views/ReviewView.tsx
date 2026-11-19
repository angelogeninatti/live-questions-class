/**
 * Pagina di ripasso (`#/review?quiz=ID`): tutte le domande con risposta corretta e spiegazione.
 * Funziona senza login; le regole di sicurezza la rendono leggibile solo se il docente
 * ha pubblicato le soluzioni. Leggibile su telefono e stampabile.
 */
import { useSearchParams } from 'react-router';
import { QuizReviewList } from '../components/QuizReviewList';
import { StatusMessage } from '../components/StatusMessage';
import { useReview } from '../hooks/useReview';

export function ReviewView() {
  const [searchParams] = useSearchParams();
  const quizId = searchParams.get('quiz');
  const { state, reload } = useReview(quizId);

  return (
    <main className="review-page">
      {state.status === 'loading' && <StatusMessage tone="loading" title="Carico il ripasso…" />}

      {state.status === 'unavailable' && (
        <StatusMessage title="Soluzioni non ancora disponibili">
          <p>Il docente non ha ancora pubblicato le soluzioni di questo quiz, oppure il link non è corretto.</p>
          <button type="button" className="button secondary" onClick={reload}>
            Riprova
          </button>
        </StatusMessage>
      )}

      {state.status === 'ready' && (
        <article>
          <header className="review-header">
            <p className="muted">Ripasso</p>
            <h1>{state.quiz.title}</h1>
            <button type="button" className="button secondary no-print" onClick={() => window.print()}>
              Stampa
            </button>
          </header>
          <QuizReviewList questions={state.quiz.questions} solutions={state.solutions.byQuestion} />
        </article>
      )}
    </main>
  );
}
