import type { ReactNode } from 'react';

interface StatusMessageProps {
  title: string;
  children?: ReactNode;
  /** `loading` aggiunge un indicatore animato; `error` usa i colori d'errore. */
  tone?: 'info' | 'loading' | 'error' | 'success';
}

/** Riquadro centrale per i messaggi di stato ("Attendi...", "Nessun quiz in onda", errori). */
export function StatusMessage({ title, children, tone = 'info' }: StatusMessageProps) {
  return (
    <div className={`status-message status-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      {tone === 'loading' && <div className="spinner" aria-hidden="true" />}
      <h2>{title}</h2>
      {children !== undefined && <div className="status-body">{children}</div>}
    </div>
  );
}
