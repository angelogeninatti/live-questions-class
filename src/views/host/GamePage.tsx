/**
 * La partita in onda, vista dal docente e pensata per il proiettore.
 *
 * Il docente tiene in memoria (in tempo reale) partecipanti e risposte di tutte le domande;
 * grafico, classifica e CSV sono calcolati da questi dati con funzioni pure (`lib/scoring.ts`).
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { AnswerChart } from '../../components/AnswerChart';
import { useChoiceDialog } from '../../components/ChoiceDialog';
import { Explanation } from '../../components/Explanation';
import { GameControls } from '../../components/GameControls';
import { Leaderboard } from '../../components/Leaderboard';
import { PlayerList } from '../../components/PlayerList';
import { QRCodeBox } from '../../components/QRCodeBox';
import { QuestionCard } from '../../components/QuestionCard';
import { StatusMessage } from '../../components/StatusMessage';
import { Timer } from '../../components/Timer';
import { useActiveGame } from '../../hooks/useActiveGame';
import { useAnswers } from '../../hooks/useAnswers';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useCountdown } from '../../hooks/useCountdown';
import { usePlayers } from '../../hooks/usePlayers';
import { useQuiz, useSolutions } from '../../hooks/useQuiz';
import { buildResultsCsv, downloadTextFile } from '../../lib/csv';
import { describeError } from '../../lib/errors';
import {
  closeAnswers,
  finishGame,
  goToQuestion,
  kickPlayer,
  openQuestion,
  revealSolution,
  stopBroadcast,
} from '../../lib/gameActions';
import { studentLink } from '../../lib/links';
import { computeLeaderboard } from '../../lib/scoring';
import type { Game, PlayerWithUid } from '../../types';
import './GamePage.css';

export function GamePage() {
  const active = useActiveGame();
  switch (active.status) {
    case 'loading':
      return <StatusMessage tone="loading" title="Carico la partita…" />;
    case 'error':
      return <StatusMessage tone="error" title="Errore">{describeError(active.error)}</StatusMessage>;
    case 'none':
      return (
        <StatusMessage title="Nessuna partita in onda">
          <Link to="/host" className="button primary">
            Vai alla libreria e avvia un quiz
          </Link>
        </StatusMessage>
      );
    case 'live':
      return <LiveGame key={active.gameId} gameId={active.gameId} game={active.game} />;
  }
}

function LiveGame({ gameId, game }: { gameId: string; game: Game }) {
  const quizState = useQuiz(game.quizId);
  const solutionsState = useSolutions(game.quizId);
  const players = usePlayers(gameId);
  const quiz = quizState.status === 'ready' ? quizState.data : null;
  const questions = quiz?.questions ?? [];
  const answersByQuestion = useAnswers(
    gameId,
    questions.map((question) => question.id),
  );

  const navigate = useNavigate();
  const [dialog, ask] = useChoiceDialog();
  const { run, busy, error } = useAsyncAction();
  // Mostrare la distribuzione mentre si vota può influenzare chi non ha ancora risposto.
  const [showLiveChart, setShowLiveChart] = useState(true);

  const questionId = game.currentQuestionId;
  const secondsLeft = useCountdown(game.status === 'open' ? game.openedAt[questionId] : undefined, game.currentTimeLimit);

  // Allo scadere del tempo il docente chiude automaticamente le risposte.
  useEffect(() => {
    if (game.status === 'open' && secondsLeft === 0) void closeAnswers(gameId);
  }, [game.status, secondsLeft, gameId]);

  if (quiz === null) {
    return quizState.status === 'error' ? (
      <StatusMessage tone="error" title="Quiz non leggibile">{describeError(quizState.error)}</StatusMessage>
    ) : (
      <StatusMessage tone="loading" title="Carico il quiz…" />
    );
  }
  const question = questions[game.currentIndex];
  if (question === undefined) return <StatusMessage tone="error" title="Domanda non trovata" />;

  const answers = answersByQuestion[questionId] ?? [];
  const solution = solutionsState.status === 'ready' ? solutionsState.data?.byQuestion[questionId] : undefined;
  const revealedCorrect = game.revealed[questionId];
  const leaderboard = computeLeaderboard(game, questions, players, answersByQuestion);
  const isLast = game.currentIndex === questions.length - 1;
  const neverOpened = game.status === 'waiting' && game.currentIndex === 0 && game.openedAt[questionId] === undefined;

  // --- comandi --------------------------------------------------------------

  function handleReveal() {
    if (solution === undefined) return;
    const revealed = { ...game.revealed, [questionId]: solution.correct };
    const updated = computeLeaderboard({ ...game, revealed }, questions, players, answersByQuestion);
    void run(() => revealSolution(gameId, questionId, solution.correct, updated));
  }

  function handleNext() {
    if (isLast || quiz === null) void run(() => finishGame(gameId, leaderboard));
    else void run(() => goToQuestion(gameId, game, quiz, game.currentIndex + 1));
  }

  async function handleKick(player: PlayerWithUid) {
    const confirmed = await ask({
      title: `Espellere «${player.nickname}»?`,
      message: <p>Non potrà più rientrare in questa partita.</p>,
      choices: [{ value: 'kick', label: 'Espelli', variant: 'danger' }],
    });
    if (confirmed !== null) await run(() => kickPlayer(gameId, player));
  }

  async function handleStop() {
    const confirmed = await ask({
      title: 'Togliere il quiz dalla onda?',
      message: <p>Gli studenti vedranno "Quiz non in onda". Se ti servono i risultati, esportali prima in CSV.</p>,
      choices: [{ value: 'stop', label: 'Togli dalla onda', variant: 'danger' }],
    });
    if (confirmed === null) return;
    await run(async () => {
      await stopBroadcast({ gameId, quizId: game.quizId });
      navigate('/host');
    });
  }

  function handleExport() {
    const csv = buildResultsCsv(game, questions, leaderboard, answersByQuestion);
    const date = new Date().toISOString().slice(0, 10);
    downloadTextFile(`risultati-${date}-${quiz?.id ?? gameId}.csv`, csv);
  }

  // --- interfaccia -----------------------------------------------------------

  return (
    <div className="game-page">
      {dialog}
      <header className="game-header">
        <h1>{game.quizTitle}</h1>
        <div className="game-stats">
          {game.status !== 'finished' && (
            <span>
              Domanda <strong>{game.currentIndex + 1}</strong>/{questions.length}
            </span>
          )}
          <span>
            <strong>{players.length}</strong> partecipanti
          </span>
          {game.status !== 'waiting' && game.status !== 'finished' && (
            <span>
              <strong>{answers.length}</strong>/{players.length} risposte
            </span>
          )}
        </div>
      </header>

      {error !== null && <p className="error-box" role="alert">{error}</p>}

      <div className="game-layout">
        <section className="game-stage">
          {game.status === 'finished' ? (
            <div className="final-board">
              <h2>Classifica finale</h2>
              <Leaderboard entries={game.leaderboard} limit={10} />
            </div>
          ) : neverOpened ? (
            <div className="join-panel">
              <h2>Entra con il telefono</h2>
              <QRCodeBox url={studentLink(game.quizId)} size={320} />
              <ul className="nickname-cloud">
                {players.map((player) => (
                  <li key={player.uid}>{player.nickname}</li>
                ))}
              </ul>
            </div>
          ) : (
            <>
              <div className="stage-top">
                {secondsLeft !== null && game.currentTimeLimit !== null && (
                  <Timer secondsLeft={secondsLeft} total={game.currentTimeLimit} />
                )}
              </div>
              <QuestionCard question={question} index={game.currentIndex} total={questions.length} correct={revealedCorrect} />
              {(game.status !== 'open' || showLiveChart) && game.status !== 'waiting' && (
                <AnswerChart options={question.options} answers={answers} correct={revealedCorrect} />
              )}
              {revealedCorrect !== undefined && solution !== undefined && <Explanation text={solution.explanation} />}
            </>
          )}

          {game.status !== 'finished' && (
            <GameControls
              status={game.status}
              isFirst={game.currentIndex === 0}
              isLast={isLast}
              busy={busy || (game.status === 'closed' && solution === undefined)}
              onOpen={() => void run(() => openQuestion(gameId, questionId))}
              onClose={() => void run(() => closeAnswers(gameId))}
              onReveal={handleReveal}
              onNext={handleNext}
              onBack={() => void run(() => goToQuestion(gameId, game, quiz, game.currentIndex - 1))}
            />
          )}
        </section>

        <aside className="game-sidebar">
          {game.status === 'revealed' && (
            <section className="card">
              <h2>Classifica</h2>
              <Leaderboard entries={game.leaderboard} limit={5} />
            </section>
          )}

          {!neverOpened && (
            <details className="card">
              <summary>QR code per entrare</summary>
              <QRCodeBox url={studentLink(game.quizId)} size={180} />
            </details>
          )}

          <details className="card">
            <summary>Partecipanti ({players.length})</summary>
            <PlayerList players={players} answers={answers} onKick={(player) => void handleKick(player)} />
          </details>

          <section className="card sidebar-actions">
            <label className="checkbox">
              <input type="checkbox" checked={showLiveChart} onChange={(event) => setShowLiveChart(event.target.checked)} />
              Mostra il grafico mentre si vota
            </label>
            <button type="button" className="button secondary" onClick={handleExport}>
              Esporta risultati (CSV)
            </button>
            <button type="button" className="button danger" onClick={() => void handleStop()} disabled={busy}>
              Togli dalla onda
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}
