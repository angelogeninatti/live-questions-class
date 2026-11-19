import { useState } from 'react';

interface CopyButtonProps {
  text: string;
  label: string;
  className?: string;
}

/** Copia un testo negli appunti e mostra per qualche secondo una conferma. */
export function CopyButton({ text, label, className = 'button secondary' }: CopyButtonProps) {
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(text);
      setFeedback('Copiato!');
    } catch {
      // Ad esempio su pagine non HTTPS: mostriamo il testo da copiare a mano.
      window.prompt('Copia questo testo:', text);
    }
    setTimeout(() => setFeedback(null), 2000);
  }

  return (
    <button type="button" className={className} onClick={handleClick}>
      {feedback ?? label}
    </button>
  );
}
