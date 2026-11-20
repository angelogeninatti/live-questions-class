import { useState } from 'react';
import type { PublicQuestion } from '../types';
import { QuestionCard } from './QuestionCard';
import './AnswerPicker.css';

interface AnswerPickerProps {
  question: PublicQuestion;
  /** Posizione della domanda (da 0) e totale, per l'intestazione. */
  index: number;
  total: number;
  /** Risposta già inviata, oppure `null` se lo studente non ha ancora risposto. */
  submitted: readonly number[] | null;
  /** `false` quando non si può più rispondere (domanda chiusa, tempo scaduto). */
  canAnswer: boolean;
  /** Opzioni corrette, da evidenziare dopo la rivelazione. */
  correct?: readonly number[];
  onSubmit: (choices: number[]) => void;
}

/**
 * La domanda con le opzioni da toccare, usata nella partita e nel ripasso.
 *  - Una sola risposta corretta: toccare un'opzione invia subito la risposta.
 *  - Più risposte corrette: ogni tocco seleziona o deseleziona un'opzione,
 *    e la risposta parte solo con il pulsante "Invia risposta".
 *
 * La selezione in corso è stato locale: il genitore usa `key={question.id}`
 * perché riparta vuota a ogni nuova domanda.
 */
export function AnswerPicker({ question, index, total, submitted, canAnswer, correct, onSubmit }: AnswerPickerProps) {
  const [draft, setDraft] = useState<number[]>([]);
  const editable = canAnswer && submitted === null;

  function handleSelect(option: number) {
    if (!question.multipleAnswers) {
      onSubmit([option]);
      return;
    }
    setDraft((previous) =>
      previous.includes(option)
        ? previous.filter((selected) => selected !== option)
        : [...previous, option].sort((a, b) => a - b),
    );
  }

  return (
    <>
      <QuestionCard
        question={question}
        index={index}
        total={total}
        onSelect={handleSelect}
        disabled={!editable}
        // Una selezione mai inviata non va mostrata come risposta data.
        selected={submitted ?? (editable ? draft : [])}
        correct={correct}
      />
      {question.multipleAnswers && editable && (
        <div className="answer-submit">
          <button type="button" className="button primary large" disabled={draft.length === 0} onClick={() => onSubmit(draft)}>
            Invia risposta
          </button>
        </div>
      )}
    </>
  );
}
