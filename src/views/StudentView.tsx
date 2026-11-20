/**
 * Vista degli studenti (`#/play?quiz=ID`), pensata per il telefono.
 * L'id del quiz arriva dal link (QR code o Moodle): senza, non si entra in nessuna partita.
 *
 * È divisa in componenti "a cascata": ognuno aspetta i dati di cui ha bisogno
 * e poi passa la mano al successivo:
 *   StudentView (link e login anonimo) → StudentLobby (questo quiz è in onda?)
 *   → StudentGame (sono entrato? in che fase siamo?) → StudentQuestion (la domanda corrente).
 */
import { useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { AnswerPicker } from '../components/AnswerPicker';
import { AppHeader } from '../components/AppHeader';
import { CorrectAnswer } from '../components/CorrectAnswer';
import { FeedbackBox } from '../components/FeedbackBox';
import { Leaderboard } from '../components/Leaderboard';
import { NicknameForm } from '../components/NicknameForm';
import { StatusMessage } from '../components/StatusMessage';
import { Timer } from '../components/Timer';
import { useLiveGame } from '../hooks/useActiveGame';
import { useMyAnswer } from '../hooks/useAnswers';
import { useAnonymousUser } from '../hooks/useAuth';
import { useCountdown } from '../hooks/useCountdown';
import { useMyPlayer } from '../hooks/usePlayers';
import { useQuiz } from '../hooks/useQuiz';
import { describeError } from '../lib/errors';
import { answerInstructions } from '../lib/options';
import { isCorrect, pointsFor, rankOf } from '../lib/scoring';
import { submitAnswer } from '../lib/studentActions';
import type { Answer, Game, PublicQuestion } from '../types';
import './StudentView.css';

export function StudentView() {
  const [searchParams] = useSearchParams();
  const quizId = searchParams.get('quiz');
  if (quizId === null || quizId === '') {
    return (
      <Shell>
        <StatusMessage title="Link incompleto">
          Apri il link del quiz che ti ha dato il docente (dal QR code o da Moodle).
        </StatusMessage>
      </Shell>
    );
  }
  // `key`: se cambia il quiz nell'indirizzo, la vista riparte da zero.
  return <SignedInLobby key={quizId} quizId={quizId} />;
}

function SignedInLobby({ quizId }: { quizId: string }) {
  const { user, error } = useAnonymousUser();
  if (error !== null) return <Shell><StatusMessage tone="error" title="Connessione non riuscita">{error}</StatusMessage></Shell>;
  if (user === null) return <Shell><StatusMessage tone="loading" title="Connessione…" /></Shell>;
  return <StudentLobby uid={user.uid} quizId={quizId} />;
}

/** Cornice comune: intestazione con il nickname (se già scelto) e contenuto. */
function Shell({ nickname, children }: { nickname?: string; children: ReactNode }) {
  return (
    <div className="student-shell">
      <AppHeader title="Quiz in aula">
        {nickname !== undefined && <span className="student-nickname">{nickname}</span>}
      </AppHeader>
      <main className="student-main">{children}</main>
    </div>
  );
}

function StudentLobby({ uid, quizId }: { uid: string; quizId: string }) {
  const active = useLiveGame(quizId);
  switch (active.status) {
    case 'loading':
      return <Shell><StatusMessage tone="loading" title="Cerco il quiz…" /></Shell>;
    case 'error':
      return <Shell><StatusMessage tone="error" title="Errore">{describeError(active.error)}</StatusMessage></Shell>;
    case 'none':
      return (
        <Shell>
          {/* Stesso messaggio per un id inesistente: dall'esterno non si capisce se il quiz esiste. */}
          <StatusMessage title="Quiz non in onda">
            Il docente non ha ancora avviato questo quiz. Questa pagina si aggiornerà da sola.
          </StatusMessage>
        </Shell>
      );
    case 'live':
      // `key`: se il docente avvia un'altra partita, lo stato interno riparte da zero.
      return <StudentGame key={active.gameId} uid={uid} gameId={active.gameId} game={active.game} />;
  }
}

function StudentGame({ uid, gameId, game }: { uid: string; gameId: string; game: Game }) {
  const player = useMyPlayer(gameId, uid);
  const quiz = useQuiz(game.quizId);

  if (game.kickedUids.includes(uid)) {
    return <Shell><StatusMessage tone="error" title="Sei stato rimosso dalla partita" /></Shell>;
  }
  if (player.status === 'loading') return <Shell><StatusMessage tone="loading" title="Un attimo…" /></Shell>;
  if (player.status === 'error') {
    return <Shell><StatusMessage tone="error" title="Errore">{describeError(player.error)}</StatusMessage></Shell>;
  }

  // Non ancora entrato: si sceglie il nickname (se la partita non è già finita).
  if (player.data === null) {
    if (game.status === 'finished') {
      return <Shell><StatusMessage title="La partita è terminata">Attendi che il docente ne avvii un'altra.</StatusMessage></Shell>;
    }
    return <Shell><NicknameForm gameId={gameId} uid={uid} quizTitle={game.quizTitle} /></Shell>;
  }

  const { nickname } = player.data;

  if (game.status === 'finished') {
    return (
      <Shell nickname={nickname}>
        <FinalResults game={game} uid={uid} />
      </Shell>
    );
  }

  if (game.status === 'waiting') {
    return (
      <Shell nickname={nickname}>
        <StatusMessage title={`Ciao ${nickname}!`}>
          <p>Sei in partita. Attendi che il docente avvii la prossima domanda.</p>
          <MyScore game={game} uid={uid} />
        </StatusMessage>
      </Shell>
    );
  }

  if (quiz.status !== 'ready' || quiz.data === null) {
    return <Shell nickname={nickname}><StatusMessage tone="loading" title="Carico la domanda…" /></Shell>;
  }
  const question = quiz.data.questions[game.currentIndex];
  if (question === undefined) return <Shell nickname={nickname}><StatusMessage tone="error" title="Domanda non trovata" /></Shell>;

  return (
    <Shell nickname={nickname}>
      {/* `key`: a ogni nuova domanda lo stato locale (es. la scelta in invio) si azzera. */}
      <StudentQuestion key={question.id} uid={uid} gameId={gameId} game={game} question={question} />
    </Shell>
  );
}

interface StudentQuestionProps {
  uid: string;
  gameId: string;
  game: Game;
  question: PublicQuestion;
}

function StudentQuestion({ uid, gameId, game, question }: StudentQuestionProps) {
  const myAnswer = useMyAnswer(gameId, question.id, uid);
  const openedAt = game.openedAt[question.id];
  const secondsLeft = useCountdown(game.status === 'open' ? openedAt : undefined, game.currentTimeLimit);
  // Risposta appena inviata, mostrata subito mentre la scrittura viaggia verso il server.
  const [pendingChoices, setPendingChoices] = useState<number[] | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  if (myAnswer.status === 'loading') return <StatusMessage tone="loading" title="Un attimo…" />;
  const answer = myAnswer.status === 'ready' ? myAnswer.data : null;
  const choices = answer?.choices ?? pendingChoices;
  const timeIsUp = secondsLeft === 0;
  const canAnswer = game.status === 'open' && !timeIsUp;
  const correct = game.status === 'revealed' ? game.revealed[question.id] : undefined;

  function handleSubmit(selected: number[]) {
    setPendingChoices(selected);
    setSendError(null);
    submitAnswer(gameId, question.id, uid, selected).catch((error: unknown) => {
      setPendingChoices(null);
      setSendError(`Risposta non inviata: ${describeError(error)}`);
    });
  }

  return (
    <div className="student-question">
      {secondsLeft !== null && game.currentTimeLimit !== null && (
        <Timer secondsLeft={secondsLeft} total={game.currentTimeLimit} />
      )}
      <AnswerPicker
        question={question}
        index={game.currentIndex}
        total={game.questionCount}
        submitted={choices}
        canAnswer={canAnswer}
        correct={correct}
        onSubmit={handleSubmit}
      />
      {sendError !== null && <p className="form-error" role="alert">{sendError}</p>}
      <Feedback game={game} question={question} choices={choices} answer={answer} timeIsUp={timeIsUp} uid={uid} />
    </div>
  );
}

interface FeedbackProps {
  game: Game;
  question: PublicQuestion;
  /** Opzioni inviate (anche se ancora in viaggio) e risposta confermata dal server. */
  choices: readonly number[] | null;
  answer: Answer | null;
  timeIsUp: boolean;
  uid: string;
}

/** Messaggio sotto la domanda: conferma dell'invio, attesa, oppure esito dopo la rivelazione. */
function Feedback({ game, question, choices, answer, timeIsUp, uid }: FeedbackProps) {
  if (game.status === 'open') {
    if (choices !== null) return <FeedbackBox tone="sent">✓ Risposta inviata! Attendi la soluzione.</FeedbackBox>;
    if (timeIsUp) return <FeedbackBox tone="neutral">Tempo scaduto.</FeedbackBox>;
    return <FeedbackBox tone="neutral">{answerInstructions(question)}</FeedbackBox>;
  }

  if (game.status === 'closed') {
    return (
      <FeedbackBox tone="neutral">
        {choices === null ? 'Risposte chiuse: non hai risposto a questa domanda.' : 'Risposte chiuse. Attendi la soluzione…'}
      </FeedbackBox>
    );
  }

  // Stato `revealed`.
  const correct = game.revealed[question.id] ?? [];
  const scoreLine = <MyScore game={game} uid={uid} />;

  if (choices === null) {
    return (
      <FeedbackBox tone="neutral">
        <p>
          Non hai risposto. <CorrectAnswer correct={correct} />
        </p>
        {scoreLine}
      </FeedbackBox>
    );
  }
  if (isCorrect(choices, correct)) {
    const points =
      answer === null ? null : pointsFor(answer, correct, game.openedAt[question.id]?.toMillis(), question.timeLimit);
    return (
      <FeedbackBox tone="correct" title={points === null ? 'Corretto! 🎉' : `Corretto! 🎉 +${points} punti`}>
        {scoreLine}
      </FeedbackBox>
    );
  }
  return (
    <FeedbackBox tone="wrong" title="Sbagliato">
      <p>
        <CorrectAnswer correct={correct} />
      </p>
      {scoreLine}
    </FeedbackBox>
  );
}

/** Punteggio e posizione dello studente, se la classifica è già stata calcolata. */
function MyScore({ game, uid }: { game: Game; uid: string }) {
  const entry = game.leaderboard.find((candidate) => candidate.uid === uid);
  const rank = rankOf(game.leaderboard, uid);
  if (entry === undefined || rank === null) return null;
  return (
    <p className="my-score">
      {entry.score} punti · {rank}° posto su {game.leaderboard.length}
    </p>
  );
}

function FinalResults({ game, uid }: { game: Game; uid: string }) {
  return (
    <section className="card final-results">
      <h1>Classifica finale</h1>
      <MyScore game={game} uid={uid} />
      <Leaderboard entries={game.leaderboard} highlightUid={uid} />
    </section>
  );
}
