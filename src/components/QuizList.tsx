import type { QuizSummary } from '../types';
import { reviewLink, studentLink } from '../lib/links';
import { CopyButton } from './CopyButton';

/** Le azioni possibili su un quiz della libreria. */
export interface QuizActions {
  onStart: (quiz: QuizSummary) => void;
  onTogglePublished: (quiz: QuizSummary) => void;
  onDuplicate: (quiz: QuizSummary) => void;
  onReplace: (quiz: QuizSummary) => void;
  onDelete: (quiz: QuizSummary) => void;
}

interface QuizListProps extends QuizActions {
  quizzes: readonly QuizSummary[];
  /** Id del quiz in onda: non si può sostituire né eliminare finché è in onda. */
  onAirQuizId: string | null;
  busy: boolean;
}

const dateFormatter = new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short' });

/** Libreria dei quiz caricati, con i pulsanti per gestirli. */
export function QuizList({ quizzes, onAirQuizId, busy, ...actions }: QuizListProps) {
  if (quizzes.length === 0) {
    return <p className="muted">Nessun quiz caricato. Usa "Carica quiz" per iniziare.</p>;
  }

  return (
    <ul className="quiz-list">
      {quizzes.map((quiz) => {
        const onAir = quiz.id === onAirQuizId;
        const lockedReason = onAir ? 'Togli prima il quiz dalla onda' : undefined;
        return (
          <li key={quiz.id} className={onAir ? 'quiz-item on-air' : 'quiz-item'}>
            <div className="quiz-info">
              <h3>
                {quiz.title} {onAir && <span className="badge badge-live">In onda</span>}
              </h3>
              <p className="muted small">
                {quiz.questions.length} domande · {dateFormatter.format(quiz.createdAt.toDate())} · id <code>{quiz.id}</code>
              </p>
              <span className={quiz.reviewPublished ? 'badge badge-published' : 'badge'}>
                {quiz.reviewPublished ? 'Soluzioni pubblicate' : 'Soluzioni nascoste'}
              </span>
            </div>
            <div className="quiz-actions">
              <button type="button" className="button primary" disabled={busy} onClick={() => actions.onStart(quiz)}>
                Avvia
              </button>
              <CopyButton text={studentLink(quiz.id)} label="Copia link studenti" />
              <CopyButton text={reviewLink(quiz.id)} label="Copia link di ripasso" />
              <button type="button" className="button secondary" disabled={busy} onClick={() => actions.onTogglePublished(quiz)}>
                {quiz.reviewPublished ? 'Nascondi soluzioni' : 'Pubblica soluzioni'}
              </button>
              <button type="button" className="button secondary" disabled={busy} onClick={() => actions.onDuplicate(quiz)}>
                Duplica
              </button>
              <button
                type="button"
                className="button secondary"
                disabled={busy || onAir}
                title={lockedReason}
                onClick={() => actions.onReplace(quiz)}
              >
                Sostituisci
              </button>
              <button
                type="button"
                className="button danger"
                disabled={busy || onAir}
                title={lockedReason}
                onClick={() => actions.onDelete(quiz)}
              >
                Elimina
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
