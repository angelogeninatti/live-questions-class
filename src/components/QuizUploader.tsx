import { useState, type ChangeEvent } from 'react';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { createQuiz, replaceQuiz } from '../lib/quizActions';
import { MAX_FILE_BYTES, splitQuiz, validateQuizJson, type ValidationResult } from '../lib/quizValidation';
import type { QuizSummary } from '../types';
import { QuizReviewList } from './QuizReviewList';
import './QuizUploader.css';

interface QuizUploaderProps {
  /** Se indicato, il file sostituisce questo quiz mantenendone l'id (e il link di ripasso). */
  replacing: QuizSummary | null;
  onDone: (message: string) => void;
  onCancel: () => void;
}

/**
 * Caricamento di un quiz da file JSON: lettura → validazione → anteprima → salvataggio.
 * Nulla viene scritto su Firestore finché il file non è valido e il docente non conferma.
 */
export function QuizUploader({ replacing, onDone, onCancel }: QuizUploaderProps) {
  const [result, setResult] = useState<ValidationResult | null>(null);
  const { run, busy, error } = useAsyncAction();

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file === undefined) return;
    if (file.size > MAX_FILE_BYTES) {
      setResult({ ok: false, errors: [`Il file supera ${MAX_FILE_BYTES / 1024} KB.`] });
      return;
    }
    setResult(validateQuizJson(await file.text()));
  }

  function handleSave() {
    if (result === null || !result.ok) return;
    const quiz = result.quiz;
    void run(async () => {
      if (replacing === null) {
        await createQuiz(quiz);
        onDone(`Quiz "${quiz.title}" caricato.`);
      } else {
        await replaceQuiz(replacing.id, quiz);
        onDone(`Quiz "${quiz.title}" sostituito: il link di ripasso non cambia.`);
      }
    });
  }

  const preview = result?.ok === true ? splitQuiz(result.quiz) : null;

  return (
    <section className="card uploader">
      <h2>{replacing === null ? 'Carica un nuovo quiz' : `Sostituisci "${replacing.title}"`}</h2>
      <p className="muted">
        File JSON con titolo e domande (vedi <code>examples/quiz.example.json</code>).
      </p>
      <input type="file" accept="application/json,.json" onChange={handleFile} />

      {result?.ok === false && (
        <div className="error-box" role="alert">
          <p>
            <strong>Il file non è valido</strong> ({result.errors.length} {result.errors.length === 1 ? 'errore' : 'errori'}).
            Nulla è stato salvato.
          </p>
          <ul>
            {result.errors.map((message, index) => (
              <li key={index}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      {result?.ok === true && preview !== null && (
        <>
          <p className="warning-box">
            ⚠️ L'anteprima mostra le soluzioni: non farla vedere se stai proiettando.
          </p>
          <h3>
            {result.quiz.title} · {result.quiz.questions.length} domande
          </h3>
          <QuizReviewList questions={preview.questions} solutions={preview.solutions} showTimeLimit />
        </>
      )}

      {error !== null && <p className="form-error" role="alert">{error}</p>}
      <div className="button-row">
        <button type="button" className="button secondary" onClick={onCancel} disabled={busy}>
          Annulla
        </button>
        <button type="button" className="button primary" onClick={handleSave} disabled={busy || result?.ok !== true}>
          {busy ? 'Salvataggio…' : 'Salva'}
        </button>
      </div>
    </section>
  );
}
