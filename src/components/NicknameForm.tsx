import { useState, type FormEvent } from 'react';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { useBannedWords } from '../hooks/useModeration';
import { cleanNickname, containsBannedWord, NICKNAME_MAX_LENGTH, nicknameFormatError } from '../lib/nickname';
import { joinGame } from '../lib/studentActions';

/** Chiave in sessionStorage: dopo un ricaricamento il campo è già compilato. */
const STORAGE_KEY = 'quiz.nickname';

function readSavedNickname(): string {
  try {
    return sessionStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return ''; // es. navigazione privata con archiviazione bloccata
  }
}

function saveNickname(nickname: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, nickname);
  } catch {
    // Non è essenziale: lo studente viene comunque riconosciuto dal suo account anonimo.
  }
}

interface NicknameFormProps {
  gameId: string;
  uid: string;
  quizTitle: string;
}

/** Primo passo dello studente: scegliere un nickname ed entrare nella partita. */
export function NicknameForm({ gameId, uid, quizTitle }: NicknameFormProps) {
  const [value, setValue] = useState(readSavedNickname);
  const [validationError, setValidationError] = useState<string | null>(null);
  const bannedWords = useBannedWords();
  const { run, busy, error } = useAsyncAction();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nickname = cleanNickname(value);
    const formatError = nicknameFormatError(nickname);
    if (formatError !== null) {
      setValidationError(formatError);
      return;
    }
    if (containsBannedWord(nickname, bannedWords ?? [])) {
      setValidationError('Questo nickname non è consentito. Scegline un altro.');
      return;
    }
    setValidationError(null);
    saveNickname(nickname);
    void run(() => joinGame(gameId, uid, nickname));
  }

  const message = validationError ?? error;
  return (
    <form className="card nickname-form" onSubmit={handleSubmit}>
      <p className="muted">In onda</p>
      <h1>{quizTitle}</h1>
      <label htmlFor="nickname">Scegli un nickname</label>
      <input
        id="nickname"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        maxLength={NICKNAME_MAX_LENGTH}
        autoComplete="off"
        autoCapitalize="words"
        autoFocus
        aria-invalid={message !== null}
        aria-describedby="nickname-error"
      />
      <p id="nickname-error" className="form-error" role="alert">
        {message}
      </p>
      <button type="submit" className="button primary large" disabled={busy || bannedWords === null}>
        {busy ? 'Entro…' : 'Entra'}
      </button>
    </form>
  );
}
