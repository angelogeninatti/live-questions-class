import './Explanation.css';

/**
 * Spiegazione di una soluzione, scritta dal docente nel file del quiz.
 * Non mostra nulla se la spiegazione è vuota.
 */
export function Explanation({ text }: { text: string }) {
  if (text === '') return null;
  return (
    <p className="explanation">
      <strong>Spiegazione:</strong> {text}
    </p>
  );
}
