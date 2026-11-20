/**
 * Validazione del file JSON caricato dal docente.
 *
 * Lo schema zod descrive le stesse regole dei tipi `QuizFile`/`QuestionFile` di `types.ts`,
 * più i vincoli che TypeScript non sa esprimere (2-4 opzioni, indici validi, id univoci...).
 * L'annotazione `z.ZodType<QuizFile>` fa sì che il compilatore segnali un errore
 * se schema e tipi smettono di essere coerenti.
 */
import { z } from 'zod';
import type { QuestionFile, QuizFile, PublicQuestion, Solution } from '../types';

export const MAX_FILE_BYTES = 200 * 1024;
export const MAX_QUESTIONS = 100;
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 4;

const optionIndex = z
  .int('l\'indice della risposta corretta deve essere un numero intero')
  .min(0, 'gli indici delle risposte partono da 0');

const questionSchema = z
  // `strictObject` rifiuta i campi sconosciuti: un refuso come "corect" diventa un errore
  // invece di essere ignorato in silenzio.
  .strictObject({
    id: z
      .string('manca l\'id della domanda')
      .regex(/^[A-Za-z0-9_-]{1,40}$/, 'l\'id può contenere solo lettere, cifre, "-" e "_" (max 40)'),
    text: z.string('manca il testo').trim().min(1, 'il testo è vuoto').max(500, 'il testo supera 500 caratteri'),
    options: z
      .array(z.string().trim().min(1, 'c\'è un\'opzione vuota').max(200, 'un\'opzione supera 200 caratteri'), 'mancano le opzioni')
      .min(MIN_OPTIONS, `servono almeno ${MIN_OPTIONS} opzioni`)
      .max(MAX_OPTIONS, `al massimo ${MAX_OPTIONS} opzioni`),
    correct: z.union([optionIndex, z.array(optionIndex).min(1, 'indica almeno una risposta corretta')], 'manca "correct": indice (o elenco di indici) della risposta corretta'),
    timeLimit: z
      .int('il tempo deve essere un numero intero di secondi')
      .min(5, 'il tempo minimo è 5 secondi')
      .max(600, 'il tempo massimo è 600 secondi')
      .optional(),
    explanation: z.string('la spiegazione deve essere un testo').max(2000, 'la spiegazione supera 2000 caratteri').optional(),
  })
  .superRefine((question, ctx) => {
    const indexes = Array.isArray(question.correct) ? question.correct : [question.correct];
    for (const index of indexes) {
      if (index >= question.options.length) {
        ctx.addIssue({
          code: 'custom',
          path: ['correct'],
          message: `l'indice ${index} non esiste: le opzioni vanno da 0 a ${question.options.length - 1}`,
        });
      }
    }
    if (new Set(indexes).size !== indexes.length) {
      ctx.addIssue({ code: 'custom', path: ['correct'], message: 'un indice corretto è ripetuto' });
    }
  }) satisfies z.ZodType<QuestionFile>;

const quizFileSchema: z.ZodType<QuizFile> = z
  .strictObject({
    title: z.string('manca il titolo del quiz').trim().min(1, 'il titolo è vuoto').max(200, 'il titolo supera 200 caratteri'),
    questions: z
      .array(questionSchema, 'manca l\'elenco "questions"')
      .min(1, 'serve almeno una domanda')
      .max(MAX_QUESTIONS, `al massimo ${MAX_QUESTIONS} domande`),
  })
  .superRefine((quiz, ctx) => {
    const seen = new Set<string>();
    quiz.questions.forEach((question, index) => {
      if (seen.has(question.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['questions', index, 'id'],
          message: `l'id "${question.id}" è già usato da un'altra domanda`,
        });
      }
      seen.add(question.id);
    });
  });

/** Esito della validazione: o il quiz valido, o un elenco di errori leggibili. */
export type ValidationResult =
  | { ok: true; quiz: QuizFile }
  | { ok: false; errors: string[] };

/** Valida il contenuto testuale di un file. Non scrive nulla: decide solo se è accettabile. */
export function validateQuizJson(text: string): ValidationResult {
  if (new Blob([text]).size > MAX_FILE_BYTES) {
    return { ok: false, errors: [`Il file supera ${MAX_FILE_BYTES / 1024} KB.`] };
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (error) {
    const detail = error instanceof Error ? error.message : '';
    return { ok: false, errors: [`Il file non è un JSON valido. ${detail}`.trim()] };
  }

  const result = quizFileSchema.safeParse(data);
  if (result.success) return { ok: true, quiz: result.data };
  return { ok: false, errors: result.error.issues.map((issue) => describeIssue(issue, data)) };
}

/** Trasforma un errore di zod in una frase che indica dove sta il problema. */
function describeIssue(issue: z.core.$ZodIssue, data: unknown): string {
  const message =
    issue.code === 'unrecognized_keys'
      ? `campo sconosciuto ${issue.keys.map((key) => `"${key}"`).join(', ')} (refuso?)`
      : issue.message;
  const [section, questionIndex, field] = issue.path;

  if (section === 'questions' && typeof questionIndex === 'number') {
    const id = questionIdAt(data, questionIndex);
    const where = `Domanda ${questionIndex + 1}${id ? ` (id "${id}")` : ''}`;
    return field === undefined ? `${where}: ${message}` : `${where}, campo "${String(field)}": ${message}`;
  }
  return section === undefined ? capitalize(message) : `Campo "${String(section)}": ${message}`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function questionIdAt(data: unknown, index: number): string | undefined {
  if (typeof data !== 'object' || data === null || !('questions' in data)) return undefined;
  const questions = (data as { questions: unknown }).questions;
  if (!Array.isArray(questions)) return undefined;
  const question: unknown = questions[index];
  if (typeof question !== 'object' || question === null || !('id' in question)) return undefined;
  const id = (question as { id: unknown }).id;
  return typeof id === 'string' ? id : undefined;
}

/** Le risposte corrette di una domanda come elenco ordinato, anche se nel file è un solo numero. */
function correctIndexes(question: QuestionFile): number[] {
  const indexes = Array.isArray(question.correct) ? question.correct : [question.correct];
  return [...indexes].sort((a, b) => a - b);
}

/**
 * Separa un quiz valido nelle due parti salvate su Firestore:
 * le domande pubbliche (leggibili dagli studenti) e le soluzioni (protette).
 */
export function splitQuiz(quiz: QuizFile): {
  questions: PublicQuestion[];
  solutions: Record<string, Solution>;
} {
  const questions = quiz.questions.map((question) => ({
    id: question.id,
    text: question.text,
    options: question.options,
    timeLimit: question.timeLimit ?? null,
    multipleAnswers: correctIndexes(question).length > 1,
  }));
  const solutions = Object.fromEntries(
    quiz.questions.map((question) => [
      question.id,
      { correct: correctIndexes(question), explanation: question.explanation ?? '' },
    ]),
  );
  return { questions, solutions };
}
