import type { ReactNode } from 'react';
import './FeedbackBox.css';

interface FeedbackBoxProps {
  /** `neutral` istruzioni e attese, `sent` risposta inviata, `correct`, `partial` e `wrong` esito della risposta. */
  tone: 'neutral' | 'sent' | 'correct' | 'partial' | 'wrong';
  /** Riga in grande in cima al riquadro (es. "Corretto!"). */
  title?: string;
  children?: ReactNode;
}

/** Riquadro colorato sotto la domanda, usato nella partita e nel ripasso. */
export function FeedbackBox({ tone, title, children }: FeedbackBoxProps) {
  return (
    <div className={`feedback feedback-${tone}`} role="status">
      {title !== undefined && <p className="feedback-title">{title}</p>}
      {children}
    </div>
  );
}
