import { useState } from 'react';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { useBannedWords } from '../hooks/useModeration';
import { saveBannedWords } from '../lib/moderationActions';
import { parseBannedWordsInput } from '../lib/nickname';
import './ModerationPanel.css';

/**
 * Gestione delle parole vietate nei nickname. Il pannello è chiuso di default:
 * l'elenco non deve comparire sullo schermo proiettato.
 */
export function ModerationPanel() {
  const bannedWords = useBannedWords();
  return (
    <details className="card moderation-panel">
      <summary>Filtro nickname ({bannedWords === null ? '…' : `${bannedWords.length} parole vietate`})</summary>
      {/* L'editor compare solo quando l'elenco è stato letto, così parte dai valori salvati. */}
      {bannedWords !== null && <BannedWordsEditor initialWords={bannedWords} />}
    </details>
  );
}

function BannedWordsEditor({ initialWords }: { initialWords: string[] }) {
  const [text, setText] = useState(initialWords.join('\n'));
  const [saved, setSaved] = useState(false);
  const { run, busy, error } = useAsyncAction();

  function handleSave() {
    setSaved(false);
    void run(async () => {
      await saveBannedWords(parseBannedWordsInput(text));
      setSaved(true);
    });
  }

  return (
    <div className="moderation-editor">
      <p className="warning-box">⚠️ Non aprire questo pannello mentre proietti.</p>
      <p className="muted small">
        Una parola per riga. L'elenco è salvato su Firebase, non nel repository. Le parole di almeno 4 lettere
        vengono cercate anche dentro altre parole e nelle varianti con accenti o cifre (es. "4" al posto di "a");
        quelle più corte solo come parole intere. Il docente può comunque espellere un partecipante dalla partita.
      </p>
      <textarea rows={8} value={text} onChange={(event) => setText(event.target.value)} spellCheck={false} />
      {error !== null && <p className="form-error" role="alert">{error}</p>}
      <div className="button-row">
        {saved && <span className="muted">Salvato ✓</span>}
        <button type="button" className="button primary" onClick={handleSave} disabled={busy}>
          Salva elenco
        </button>
      </div>
    </div>
  );
}
