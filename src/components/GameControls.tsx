import type { GameStatus } from '../types';
import './GameControls.css';

interface GameControlsProps {
  status: GameStatus;
  isFirst: boolean;
  isLast: boolean;
  busy: boolean;
  /** Prima domanda, mentre si mostra il QR code: il passo successivo è far vedere la domanda. */
  joinPanel: boolean;
  onShowQuestion: () => void;
  onOpen: () => void;
  onClose: () => void;
  onReveal: () => void;
  onNext: () => void;
  onBack: () => void;
}

/**
 * Pulsanti del docente. In ogni fase compare in evidenza solo il passo successivo,
 * così la sequenza "domanda → voto → soluzione → avanti" è guidata. Ogni domanda
 * viene prima mostrata (stato `waiting`) e solo dopo aperta: c'è il tempo di leggerla
 * prima che parta il conto alla rovescia.
 */
export function GameControls(props: GameControlsProps) {
  const { status, isFirst, isLast, busy, joinPanel, onShowQuestion, onOpen, onClose, onReveal, onNext, onBack } = props;
  const canGoBack = !isFirst && status !== 'open' && status !== 'finished';
  return (
    <div className="game-controls">
      {canGoBack && (
        <button type="button" className="button secondary" onClick={onBack} disabled={busy}>
          ← Indietro
        </button>
      )}
      {status === 'waiting' && joinPanel && (
        <button type="button" className="button primary large" onClick={onShowQuestion}>
          Mostra la prima domanda
        </button>
      )}
      {status === 'waiting' && !joinPanel && (
        <button type="button" className="button primary large" onClick={onOpen} disabled={busy}>
          Avvia domanda
        </button>
      )}
      {status === 'open' && (
        <button type="button" className="button primary large" onClick={onClose} disabled={busy}>
          Chiudi risposte
        </button>
      )}
      {status === 'closed' && (
        <button type="button" className="button primary large" onClick={onReveal} disabled={busy}>
          Rivela soluzione
        </button>
      )}
      {status === 'revealed' && (
        <button type="button" className="button primary large" onClick={onNext} disabled={busy}>
          {isLast ? 'Classifica finale' : 'Domanda successiva →'}
        </button>
      )}
    </div>
  );
}
