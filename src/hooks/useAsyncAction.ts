/** Esegue un'operazione asincrona (es. una scrittura su Firestore) tenendo traccia di attesa ed errori. */
import { useCallback, useState } from 'react';
import { describeError } from '../lib/errors';

export function useAsyncAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setBusy(false);
    }
  }, []);

  return { run, busy, error, clearError: () => setError(null) };
}
