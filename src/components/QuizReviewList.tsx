import type { PublicQuestion, Solution } from '../types';
import { optionLetter } from '../lib/options';
import { Explanation } from './Explanation';
import './QuizReviewList.css';

interface QuizReviewListProps {
  questions: readonly PublicQuestion[];
  solutions: Readonly<Record<string, Solution>>;
  /** Mostra il tempo limite di ogni domanda: utile al docente, non agli studenti. */
  showTimeLimit?: boolean;
}

/**
 * Elenco completo di domande, risposte corrette e spiegazioni.
 * Usato dalla pagina di ripasso e dall'anteprima dopo l'upload.
 */
export function QuizReviewList({ questions, solutions, showTimeLimit = false }: QuizReviewListProps) {
  return (
    <ol className="review-list">
      {questions.map((question, index) => {
        const solution = solutions[question.id];
        return (
          <li key={question.id} className="review-item">
            <h3>
              <span className="review-number">{index + 1}.</span> {question.text}
            </h3>
            <ul className="review-options">
              {question.options.map((option, optionIndex) => {
                const correct = solution?.correct.includes(optionIndex) ?? false;
                return (
                  <li key={optionIndex} className={correct ? 'review-option correct' : 'review-option'}>
                    <span className="review-letter">{optionLetter(optionIndex)}</span>
                    <span>{option}</span>
                    {correct && <span className="visually-hidden"> (risposta corretta)</span>}
                    {correct && <span aria-hidden="true"> ✓</span>}
                  </li>
                );
              })}
            </ul>
            {solution !== undefined && <Explanation text={solution.explanation} />}
            {showTimeLimit && question.timeLimit !== null && <p className="muted small">Tempo: {question.timeLimit} s</p>}
          </li>
        );
      })}
    </ol>
  );
}
