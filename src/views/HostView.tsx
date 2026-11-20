/**
 * Vista del docente (`#/host`): accesso con email e password, poi due pagine:
 *  - `#/host`      libreria dei quiz (caricamento, pubblicazione soluzioni, avvio);
 *  - `#/host/game` la partita in onda, pensata per essere proiettata.
 */
import { signOut } from 'firebase/auth';
import { NavLink, Route, Routes } from 'react-router';
import { AppHeader } from '../components/AppHeader';
import { LoginForm } from '../components/LoginForm';
import { StatusMessage } from '../components/StatusMessage';
import { auth } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { GamePage } from './host/GamePage';
import { LibraryPage } from './host/LibraryPage';
import './HostView.css';

export function HostView() {
  const authState = useAuth();

  if (authState.status === 'loading') return <StatusMessage tone="loading" title="Connessione…" />;
  // Un utente anonimo (es. il docente ha provato la vista studenti nello stesso browser)
  // non è il docente: chiediamo il login.
  if (authState.status === 'signedOut' || authState.user.isAnonymous) {
    return (
      <main className="host-login">
        <LoginForm />
      </main>
    );
  }

  return (
    <div className="host-shell">
      <AppHeader title="Quiz in aula · Docente">
        <nav className="host-nav">
          <NavLink to="/host" end>
            Libreria
          </NavLink>
          <NavLink to="/host/game">Partita in onda</NavLink>
        </nav>
        <button type="button" className="button small secondary" onClick={() => void signOut(auth)}>
          Esci
        </button>
      </AppHeader>
      <main className="host-main">
        <Routes>
          <Route index element={<LibraryPage />} />
          <Route path="game" element={<GamePage />} />
        </Routes>
      </main>
    </div>
  );
}
