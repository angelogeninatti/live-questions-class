import type { AnswerWithUid, PlayerWithUid } from '../types';
import './PlayerList.css';

interface PlayerListProps {
  players: readonly PlayerWithUid[];
  /** Risposte alla domanda corrente: chi ha già risposto viene segnato. */
  answers: readonly AnswerWithUid[];
  onKick: (player: PlayerWithUid) => void;
}

/** Elenco dei partecipanti, con il pulsante per espellere un nickname inappropriato. */
export function PlayerList({ players, answers, onKick }: PlayerListProps) {
  const answered = new Set(answers.map((answer) => answer.uid));
  if (players.length === 0) return <p className="muted">Nessun partecipante.</p>;
  return (
    <ul className="player-list">
      {players.map((player) => (
        <li key={player.uid}>
          <span>
            {answered.has(player.uid) && <span title="Ha risposto">✓ </span>}
            {player.nickname}
          </span>
          <button type="button" className="button small danger-text" onClick={() => onKick(player)}>
            Espelli
          </button>
        </li>
      ))}
    </ul>
  );
}
