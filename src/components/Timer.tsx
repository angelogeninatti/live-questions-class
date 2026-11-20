import type { CSSProperties } from 'react';
import './Timer.css';

interface TimerProps {
  secondsLeft: number;
  total: number;
}

/** Conto alla rovescia circolare. Diventa rosso negli ultimi 5 secondi. */
export function Timer({ secondsLeft, total }: TimerProps) {
  const fraction = total > 0 ? secondsLeft / total : 0;
  const urgent = secondsLeft <= 5;
  return (
    <div
      className={`timer${urgent ? ' timer-urgent' : ''}`}
      style={{ '--progress': fraction } as CSSProperties}
      role="timer"
      aria-label={`${secondsLeft} secondi rimasti`}
    >
      <span>{secondsLeft}</span>
    </div>
  );
}
