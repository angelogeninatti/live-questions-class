import type { LeaderboardEntry } from '../types';
import { rankOf } from '../lib/scoring';
import './Leaderboard.css';

interface LeaderboardProps {
  entries: readonly LeaderboardEntry[];
  /** Quante righe mostrare (le prime N). */
  limit?: number;
  /** Uid dello studente che sta guardando: la sua riga viene evidenziata e mostrata anche se fuori dai primi N. */
  highlightUid?: string;
}

/** Classifica: posizione, nickname, punti. */
export function Leaderboard({ entries, limit = 10, highlightUid }: LeaderboardProps) {
  const top = entries.slice(0, limit);
  const me = highlightUid === undefined ? undefined : entries.find((entry) => entry.uid === highlightUid);
  const meIsHidden = me !== undefined && !top.includes(me);

  if (entries.length === 0) return <p className="muted">Nessun punteggio ancora.</p>;

  const row = (entry: LeaderboardEntry) => (
    <li key={entry.uid} className={entry.uid === highlightUid ? 'leader-row me' : 'leader-row'}>
      <span className="leader-rank">{rankOf(entries, entry.uid)}</span>
      <span className="leader-name">{entry.nickname}</span>
      <span className="leader-score">{entry.score}</span>
    </li>
  );

  return (
    <ol className="leaderboard">
      {top.map(row)}
      {meIsHidden && (
        <>
          <li className="leader-gap" aria-hidden="true">
            ⋮
          </li>
          {row(me)}
        </>
      )}
    </ol>
  );
}
