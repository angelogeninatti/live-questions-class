import { useState, type FormEvent } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useAsyncAction } from '../hooks/useAsyncAction';

/** Accesso del docente con email e password (account creato a mano nella console Firebase). */
export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { run, busy, error } = useAsyncAction();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    });
  }

  return (
    <form className="card login-form" onSubmit={handleSubmit}>
      <h1>Accesso docente</h1>
      <label htmlFor="email">Email</label>
      <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <label htmlFor="password">Password</label>
      <input
        id="password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {import.meta.env.VITE_USE_EMULATORS === 'true' && (
        <p className="hint">
          Modalità emulatore: il progetto Firebase reale non viene usato. Accedi con{' '}
          <code>docente@example.com</code> / <code>password123</code>, dopo aver eseguito{' '}
          <code>npm run seed:emulator</code>.
        </p>
      )}
      <p className="form-error" role="alert">
        {error}
      </p>
      <button type="submit" className="button primary" disabled={busy}>
        {busy ? 'Accesso…' : 'Entra'}
      </button>
    </form>
  );
}
