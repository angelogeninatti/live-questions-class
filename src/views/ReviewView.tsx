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
import { QuestionCard } from '../components/QuestionCard';
import { QuizReviewList } from '../components/QuizReviewList';
import { StatusMessage } from '../components/StatusMessage';
import { useReview } from '../hooks/useReview';
import { optionLetter } from '../lib/options';
import { isCorrect } from '../lib/scoring';
import type { PublicQuestion, QuizDoc, Solution, SolutionsDoc } from '../types';

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

/** Le risposte date finora: per ogni domanda (nell'ordine del quiz) l'opzione scelta. */
type Choices = readonly number[];

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
      {/* `key`: a ogni nuova domanda il componente riparte senza scelta. */}
      <PracticeQuestion
        key={question.id}
        question={question}
        index={step}
        total={questions.length}
        solution={solutions.byQuestion[question.id]}
        choice={choices[step] ?? null}
        onAnswer={(choice) => setChoices((previous) => [...previous.slice(0, step), choice])}
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
  /** Opzione scelta, `null` finché lo studente non risponde. */
  choice: number | null;
  onAnswer: (choice: number) => void;
  onNext: () => void;
}

/** Una domanda del ripasso: si risponde una volta sola e la soluzione compare subito. */
function PracticeQuestion({ question, index, total, solution, choice, onAnswer, onNext }: PracticeQuestionProps) {
  const correct = solution?.correct ?? [];
  const answered = choice !== null;
  const isLast = index === total - 1;

  return (
    <div className="student-question">
      <QuestionCard
        question={question}
        index={index}
        total={total}
        onSelect={onAnswer}
        disabled={answered}
        selected={choice}
        correct={answered ? correct : undefined}
      />

      {!answered && <p className="feedback feedback-neutral">Tocca la risposta che ritieni corretta.</p>}

      {answered && (
        <>
          {isCorrect(choice, correct) ? (
            <div className="feedback feedback-correct" role="status">
              <p className="feedback-title">Corretto! 🎉</p>
            </div>
          ) : (
            <div className="feedback feedback-wrong" role="status">
              <p className="feedback-title">Sbagliato</p>
              <p>
                La risposta corretta era <strong>{correct.map(optionLetter).join(', ')}</strong>.
              </p>
            </div>
          )}
          {solution !== undefined && solution.explanation !== '' && (
            <p className="review-explanation">
              <strong>Spiegazione:</strong> {solution.explanation}
            </p>
          )}
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
  const correctCount = quiz.questions.filter((question, index) => {
    const choice = choices[index];
    return choice !== undefined && isCorrect(choice, solutions.byQuestion[question.id]?.correct);
  }).length;

  return (
    <article>
      <header className="review-header">
        <p className="muted">Ripasso</p>
        <h1>{quiz.title}</h1>
        <p className="my-score no-print">
          Hai risposto correttamente a {correctCount} domande su {quiz.questions.length}.
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
