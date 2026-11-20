import { optionLetter } from '../lib/options';

/** Frase con le risposte corrette: "La risposta corretta era B." o "Le risposte corrette erano A e D." */
export function CorrectAnswer({ correct }: { correct: readonly number[] }) {
  const letters = correct.map(optionLetter);
  const last = letters.pop() ?? '';
  const list = letters.length === 0 ? last : `${letters.join(', ')} e ${last}`;
  return (
    <>
      {correct.length > 1 ? 'Le risposte corrette erano ' : 'La risposta corretta era '}
      <strong>{list}</strong>.
    </>
  );
}
