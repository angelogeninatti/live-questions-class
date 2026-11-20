/** Libreria dei quiz: caricamento, gestione e avvio. */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useChoiceDialog } from '../../components/ChoiceDialog';
import { CopyButton } from '../../components/CopyButton';
import { ModerationPanel } from '../../components/ModerationPanel';
import { QuizList } from '../../components/QuizList';
import { QuizUploader } from '../../components/QuizUploader';
import { StatusMessage } from '../../components/StatusMessage';
import { useActiveGame } from '../../hooks/useActiveGame';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useQuizLibrary } from '../../hooks/useQuizLibrary';
import { auth } from '../../firebase';
import { describeError } from '../../lib/errors';
import { startGame } from '../../lib/gameActions';
import { deleteQuiz, duplicateQuiz, setReviewPublished } from '../../lib/quizActions';
import type { QuizSummary, QuizToStart } from '../../types';
import './LibraryPage.css';

/** Pannello di caricamento: chiuso, nuovo quiz, oppure sostituzione di uno esistente. */
type UploadPanel = { kind: 'closed' } | { kind: 'new' } | { kind: 'replace'; quiz: QuizSummary };

export function LibraryPage() {
  const library = useQuizLibrary();
  const active = useActiveGame();
  const navigate = useNavigate();
  const [dialog, ask] = useChoiceDialog();
  const { run, busy, error } = useAsyncAction();
  const [upload, setUpload] = useState<UploadPanel>({ kind: 'closed' });
  const [notice, setNotice] = useState<string | null>(null);

  const live = active.status === 'live' ? active : null;

  async function handleStart(quiz: QuizSummary) {
    // 1. Riuso sicuro: se le soluzioni sono pubbliche, gli studenti potrebbero leggerle.
    let reuse: 'duplicate' | 'hide' | null = null;
    if (quiz.reviewPublished) {
      reuse = await ask({
        title: 'Le soluzioni di questo quiz sono pubblicate',
        message: (
          <p>
            Chi ha il link di ripasso può leggere le risposte corrette durante la partita. Puoi avviare una copia
            (il link di ripasso originale resta valido, ma la copia ha un nuovo link per gli studenti) oppure
            nascondere le soluzioni.
          </p>
        ),
        choices: [
          { value: 'duplicate', label: 'Duplica e avvia la copia' },
          { value: 'hide', label: 'Nascondi le soluzioni e avvia', variant: 'secondary' },
        ],
      });
      if (reuse === null) return;
    }

    // 2. Un solo quiz in onda: avviarne uno chiude la partita in corso.
    if (live !== null && live.game.status !== 'finished') {
      const confirmed = await ask({
        title: 'C\'è già una partita in onda',
        message: <p>Avviando questo quiz verrà chiusa la partita di «{live.game.quizTitle}».</p>,
        choices: [{ value: 'start', label: 'Chiudi e avvia', variant: 'danger' }],
      });
      if (confirmed === null) return;
    }

    await run(async () => {
      let toStart: QuizToStart = quiz;
      if (reuse === 'duplicate') toStart = await duplicateQuiz(quiz.id);
      if (reuse === 'hide') await setReviewPublished(quiz.id, false);
      await startGame(toStart, live === null ? null : { gameId: live.gameId, quizId: live.game.quizId });
      navigate('/host/game');
    });
  }

  async function handleDelete(quiz: QuizSummary) {
    const confirmed = await ask({
      title: 'Eliminare il quiz?',
      message: <p>«{quiz.title}» e le sue soluzioni verranno eliminati. Il link di ripasso smetterà di funzionare.</p>,
      choices: [{ value: 'delete', label: 'Elimina', variant: 'danger' }],
    });
    if (confirmed !== null) await run(() => deleteQuiz(quiz.id));
  }

  function handleUploadDone(message: string) {
    setUpload({ kind: 'closed' });
    setNotice(message);
  }

  return (
    <div className="library-page">
      {dialog}

      {live !== null && (
        <div className="on-air-banner">
          <span>
            <span className="badge badge-live">In onda</span> {live.game.quizTitle}
            {live.game.status === 'finished' && ' (terminata)'}
          </span>
          <Link to="/host/game" className="button small primary">
            Vai alla partita
          </Link>
        </div>
      )}

      <div className="page-title-row">
        <h1>Libreria quiz</h1>
        <button type="button" className="button primary" onClick={() => setUpload({ kind: 'new' })}>
          Carica quiz
        </button>
      </div>

      {notice !== null && <p className="success-box">{notice}</p>}
      {error !== null && <p className="error-box" role="alert">{error}</p>}

      {upload.kind !== 'closed' && (
        <QuizUploader
          replacing={upload.kind === 'replace' ? upload.quiz : null}
          onDone={handleUploadDone}
          onCancel={() => setUpload({ kind: 'closed' })}
        />
      )}

      {library.status === 'loading' && <StatusMessage tone="loading" title="Carico la libreria…" />}
      {library.status === 'error' && (
        <StatusMessage tone="error" title="Impossibile leggere la libreria">
          <p>{describeError(library.error)}</p>
          {library.error.code === 'permission-denied' && <RulesHint uid={auth.currentUser?.uid ?? ''} />}
        </StatusMessage>
      )}
      {library.status === 'ready' && (
        <QuizList
          quizzes={library.quizzes}
          onAirQuizId={live?.game.quizId ?? null}
          busy={busy}
          onStart={(quiz) => void handleStart(quiz)}
          onTogglePublished={(quiz) => void run(() => setReviewPublished(quiz.id, !quiz.reviewPublished))}
          onDuplicate={(quiz) =>
            void run(async () => {
              await duplicateQuiz(quiz.id);
            })
          }
          onReplace={(quiz) => setUpload({ kind: 'replace', quiz })}
          onDelete={(quiz) => void handleDelete(quiz)}
        />
      )}

      <ModerationPanel />
    </div>
  );
}

/**
 * Il "permesso negato" sulla libreria quasi sempre significa che le regole non sono
 * state pubblicate, oppure che contengono un UID diverso da quello del docente collegato.
 */
function RulesHint({ uid }: { uid: string }) {
  return (
    <>
      <p>
        Le regole di sicurezza non riconoscono questo account come docente. Nella console Firebase
        (Firestore Database → Regole) incolla il contenuto di <code>firebase.rules</code>, sostituisci{' '}
        <code>INSERISCI_QUI_UID_DOCENTE</code> con l'UID qui sotto e premi Pubblica.
      </p>
      <p>
        UID di questo account: <code>{uid}</code>
      </p>
      <CopyButton text={uid} label="Copia UID" />
    </>
  );
}
