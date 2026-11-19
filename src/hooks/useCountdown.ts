/** Conto alla rovescia di una domanda a tempo. */
import { useEffect, useState } from 'react';
import type { Timestamp } from 'firebase/firestore';

/**
 * Secondi rimasti (arrotondati per eccesso), oppure `null` se la domanda non ha un limite.
 * L'istante di apertura è l'ora del server; il confronto usa l'orologio del dispositivo,
 * che sui telefoni e PC moderni è sincronizzato in rete con buona precisione.
 */
export function useCountdown(openedAt: Timestamp | undefined, timeLimit: number | null): number | null {
  const [now, setNow] = useState(() => Date.now());

  const active = openedAt !== undefined && timeLimit !== null;
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [active]);

  if (openedAt === undefined || timeLimit === null) return null;
  const elapsedSeconds = (now - openedAt.toMillis()) / 1000;
  return Math.min(timeLimit, Math.max(0, Math.ceil(timeLimit - elapsedSeconds)));
}
