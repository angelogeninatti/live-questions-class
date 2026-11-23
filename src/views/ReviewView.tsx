/**
 * Pagina di ripasso (`#/review?quiz=ID`). Funziona senza login; le regole di sicurezza
 * la rendono leggibile solo se il docente ha pubblicato le soluzioni.
 *
 * Lo studente rifà il quiz da solo: una domanda alla volta, e dopo ogni risposta vede subito
 * se è corretta e la spiegazione. Non c'è nickname né classifica, e nulla viene scritto
 * su Firestore: le risposte restano nello stato del componente. Alla fine compare l'elenco
 * completo di domande e soluzioni, leggibile su telefono e stampabile.
 */
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { AnswerPicker } from '../components/AnswerPicker';
import { CorrectAnswer } from '../components/CorrectAnswer';
import { Explanation } from '../components/Explanation';
import { FeedbackBox } from '../components/FeedbackBox';
import { QuizReviewList } from '../components/QuizReviewList';
import { StatusMessage } from '../components/StatusMessage';
import { useReview } from '../hooks/useReview';
import { answerInstructions } from '../lib/options';
import { isCorrect, isPartiallyCorrect, partialText } from '../lib/scoring';
import type { PublicQuestion, QuizDoc, Solution, SolutionsDoc } from '../types';
import './ReviewView.css';

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

      {/* `key`: se cambia il quiz nell'indirizzo, il ripasso riparte dalla prima domanda. */}
      {state.status === 'ready' && <ReviewSession key={quizId} quiz={state.quiz} solutions={state.solutions} />}
    </main>
  );
}

/** Le risposte date finora: per ogni domanda (nell'ordine del quiz) le opzioni scelte. */
type Choices = readonly (readonly number[])[];

function ReviewSession({ quiz, solutions }: { quiz: QuizDoc; solutions: SolutionsDoc }) {
  const [choices, setChoices] = useState<Choices>([]);
  // Indice della domanda mostrata; `questions.length` significa "ripasso finito".
  const [step, setStep] = useState(0);
  const { questions } = quiz;

  function restart() {
    setChoices([]);
    setStep(0);
    window.scrollTo(0, 0);
  }

  const question = questions[step];
  if (question === undefined) {
    return <Summary quiz={quiz} solutions={solutions} choices={choices} onRestart={restart} />;
  }

  return (
    <article>
      <header className="review-header">
        <p className="muted">Ripasso</p>
        <h1>{quiz.title}</h1>
      </header>
      {/* `key`: a ogni nuova domanda il componente riparte senza selezione. */}
      <PracticeQuestion
        key={question.id}
        question={question}
        index={step}
        total={questions.length}
        solution={solutions.byQuestion[question.id]}
        submitted={choices[step] ?? null}
        onSubmit={(selected) => setChoices((previous) => [...previous.slice(0, step), selected])}
        onNext={() => {
          setStep((current) => current + 1);
          window.scrollTo(0, 0);
        }}
      />
    </article>
  );
}

interface PracticeQuestionProps {
  question: PublicQuestion;
  index: number;
  total: number;
  solution: Solution | undefined;
  /** Opzioni inviate, `null` finché lo studente non risponde. */
  submitted: readonly number[] | null;
  onSubmit: (choices: number[]) => void;
  onNext: () => void;
}

/** Una domanda del ripasso: si risponde una volta sola e la soluzione compare subito. */
function PracticeQuestion({ question, index, total, solution, submitted, onSubmit, onNext }: PracticeQuestionProps) {
  const correct = solution?.correct ?? [];
  const isLast = index === total - 1;

  return (
    <div className="student-question">
      <AnswerPicker
        question={question}
        index={index}
        total={total}
        submitted={submitted}
        canAnswer
        correct={submitted !== null ? correct : undefined}
        onSubmit={onSubmit}
      />

      {submitted === null && <FeedbackBox tone="neutral">{answerInstructions(question)}</FeedbackBox>}

      {submitted !== null && (
        <>
          {isCorrect(submitted, correct) ? (
            <FeedbackBox tone="correct" title="Corretto! 🎉" />
          ) : isPartiallyCorrect(submitted, correct) ? (
            <FeedbackBox tone="partial" title={`Quasi! ${partialText(submitted, correct)}.`}>
              <p>
                <CorrectAnswer correct={correct} />
              </p>
            </FeedbackBox>
          ) : (
            <FeedbackBox tone="wrong" title="Sbagliato">
              <p>
                <CorrectAnswer correct={correct} />
              </p>
            </FeedbackBox>
          )}
          {solution !== undefined && <Explanation text={solution.explanation} />}
          <div className="button-row review-next">
            <button type="button" className="button primary large" onClick={onNext}>
              {isLast ? 'Vedi tutte le soluzioni' : 'Prossima domanda'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

interface SummaryProps {
  quiz: QuizDoc;
  solutions: SolutionsDoc;
  choices: Choices;
  onRestart: () => void;
}

/** Fine del ripasso: quante risposte corrette, poi tutte le domande con le soluzioni. */
function Summary({ quiz, solutions, choices, onRestart }: SummaryProps) {
  const countWhere = (test: typeof isCorrect) =>
    quiz.questions.filter((question, index) => {
      const selected = choices[index];
      return selected !== undefined && test(selected, solutions.byQuestion[question.id]?.correct);
    }).length;
  const correctCount = countWhere(isCorrect);
  const partialCount = countWhere(isPartiallyCorrect);

  return (
    <article>
      <header className="review-header">
        <p className="muted">Ripasso</p>
        <h1>{quiz.title}</h1>
        <p className="review-score no-print">
          Hai risposto correttamente a {correctCount} domande su {quiz.questions.length}
          {partialCount > 0 && `, e in parte ad altre ${partialCount}`}.
        </p>
        <div className="button-row no-print">
          <button type="button" className="button secondary" onClick={onRestart}>
            Ricomincia
          </button>
          <button type="button" className="button secondary" onClick={() => window.print()}>
            Stampa
          </button>
        </div>
      </header>
      <QuizReviewList questions={quiz.questions} solutions={solutions.byQuestion} />
    </article>
  );
}
