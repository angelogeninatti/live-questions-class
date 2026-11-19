/** Stato dell'autenticazione Firebase: chi è l'utente collegato (se c'è). */
import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth';
import { auth } from '../firebase';

export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; user: User };

/** Segue i cambiamenti di login/logout. */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ status: 'loading' });
  useEffect(
    () =>
      onAuthStateChanged(auth, (user) =>
        setState(user === null ? { status: 'signedOut' } : { status: 'signedIn', user }),
      ),
    [],
  );
  return state;
}

/**
 * Per gli studenti: se nessuno è collegato, entra con un account anonimo.
 * Firebase ricorda l'account nel browser, quindi dopo un ricaricamento
 * lo studente ritrova lo stesso uid e quindi la sua partita e le sue risposte.
 */
export function useAnonymousUser(): { user: User | null; error: string | null } {
  const authState = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authState.status !== 'signedOut') return;
    signInAnonymously(auth).catch(() =>
      setError('Impossibile collegarsi. Controlla la connessione e ricarica la pagina.'),
    );
  }, [authState.status]);

  return { user: authState.status === 'signedIn' ? authState.user : null, error };
}
