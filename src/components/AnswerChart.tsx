import type { AnswerWithUid } from '../types';
import { optionColorClass, optionLetter } from '../lib/options';
import './AnswerChart.css';

interface AnswerChartProps {
  options: readonly string[];
  answers: readonly AnswerWithUid[];
  /** Se indicate, le barre delle opzioni corrette vengono evidenziate. */
  correct?: readonly number[];
}

/**
 * Grafico a barre orizzontali: quanti studenti hanno scelto ogni opzione.
 * Nelle domande con più risposte corrette uno studente conta su più barre.
 */
export function AnswerChart({ options, answers, correct }: AnswerChartProps) {
  const counts = options.map((_, index) => answers.filter((answer) => answer.choices.includes(index)).length);
  const max = Math.max(1, ...counts);

  return (
    <ul className="answer-chart" aria-label="Distribuzione delle risposte">
      {options.map((option, index) => {
        const count = counts[index] ?? 0;
        const isCorrect = correct?.includes(index);
        return (
          <li key={index} className={correct !== undefined && !isCorrect ? 'chart-row dimmed' : 'chart-row'}>
            <span className={`chart-letter ${optionColorClass(index)}`}>{optionLetter(index)}</span>
            <div className="chart-track" title={option}>
              <div className={`chart-bar ${optionColorClass(index)}`} style={{ width: `${(count / max) * 100}%` }} />
            </div>
            <span className="chart-count">
              {count}
              {isCorrect && ' ✓'}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
