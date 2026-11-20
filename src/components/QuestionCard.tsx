import type { PublicQuestion } from '../types';
import { optionColorClass, optionLetter } from '../lib/options';
import './QuestionCard.css';

interface QuestionCardProps {
  question: PublicQuestion;
  /** Posizione della domanda (da 0) e totale, per l'intestazione "Domanda 2 di 5". */
  index: number;
  total: number;
  /** Se presente, le opzioni sono pulsanti cliccabili (vista studente). */
  onSelect?: (choice: number) => void;
  disabled?: boolean;
  /** Opzione scelta dallo studente. */
  selected?: number | null;
  /** Opzioni corrette, da evidenziare dopo la rivelazione. */
  correct?: readonly number[];
}

/** Testo della domanda e opzioni colorate, usato sia dagli studenti sia sul proiettore. */
export function QuestionCard({ question, index, total, onSelect, disabled = false, selected = null, correct }: QuestionCardProps) {
  return (
    <section className="question-card">
      <p className="question-counter">
        Domanda {index + 1} di {total}
      </p>
      <h2 className="question-text">{question.text}</h2>
      <ol className="option-grid">
        {question.options.map((option, optionIndex) => {
          const classes = ['option', optionColorClass(optionIndex)];
          if (selected === optionIndex) classes.push('option-selected');
          if (correct !== undefined) classes.push(correct.includes(optionIndex) ? 'option-correct' : 'option-wrong');

          const content = (
            <>
              <span className="option-letter" aria-hidden="true">
                {optionLetter(optionIndex)}
              </span>
              <span className="option-text">{option}</span>
              {correct?.includes(optionIndex) && <span className="option-badge">✓</span>}
            </>
          );

          return (
            <li key={optionIndex}>
              {onSelect === undefined ? (
                <div className={classes.join(' ')}>{content}</div>
              ) : (
                <button
                  type="button"
                  className={classes.join(' ')}
                  disabled={disabled}
                  aria-pressed={selected === optionIndex}
                  onClick={() => onSelect(optionIndex)}
                >
                  {content}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
