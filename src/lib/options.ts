/** Lettere, colori e istruzioni per le opzioni di una domanda, usati in tutte le viste. */
import type { PublicQuestion } from '../types';

/** Lettere usate per distinguere le opzioni (A, B, C, D). */
export const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

/** Classi CSS dei colori delle opzioni, definite in `styles.css`. */
const OPTION_COLOR_CLASSES = ['option-a', 'option-b', 'option-c', 'option-d'] as const;

export function optionLetter(index: number): string {
  return OPTION_LETTERS[index] ?? String(index + 1);
}

export function optionColorClass(index: number): string {
  return OPTION_COLOR_CLASSES[index] ?? 'option-a';
}

/** Cosa deve fare lo studente per rispondere: cambia se le risposte corrette sono più d'una. */
export function answerInstructions(question: PublicQuestion): string {
  return question.multipleAnswers
    ? 'Seleziona tutte le risposte corrette, poi premi "Invia risposta".'
    : 'Tocca la risposta che ritieni corretta.';
}
