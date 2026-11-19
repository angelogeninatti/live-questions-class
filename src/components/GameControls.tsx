import type { GameStatus } from '../types';

interface GameControlsProps {
  status: GameStatus;
  isFirst: boolean;
  isLast: boolean;
  busy: boolean;
  onOpen: () => void;
  onClose: () => void;
  onReveal: () => void;
  onNext: () => void;
  onBack: () => void;
}

/**
 * Pulsanti del docente. In ogni fase compare in evidenza solo il passo successivo,
 * così la sequenza "domanda → voto → soluzione → avanti" è guidata.
 */
export function GameControls({ status, isFirst, isLast, busy, onOpen, onClose, onReveal, onNext, onBack }: GameControlsProps) {
  const canGoBack = !isFirst && status !== 'open' && status !== 'finished';
  return (
    <div className="game-controls">
      {canGoBack && (
        <button type="button" className="button secondary" onClick={onBack} disabled={busy}>
          ← Indietro
        </button>
      )}
      {status === 'waiting' && (
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
