import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import './ChoiceDialog.css';

/** Un pulsante della finestra di dialogo e il valore che restituisce se viene scelto. */
export interface DialogChoice<T extends string> {
  value: T;
  label: string;
  variant?: 'primary' | 'secondary' | 'danger';
}

interface DialogRequest<T extends string> {
  title: string;
  message: ReactNode;
  choices: DialogChoice<T>[];
}

/**
 * Finestra di dialogo modale basata sull'elemento HTML `<dialog>`.
 *
 * Si usa come una funzione asincrona, comoda nei gestori dei pulsanti:
 *
 *   const [dialog, ask] = useChoiceDialog();
 *   const choice = await ask({ title, message, choices });   // valore scelto, o null se annullata
 *   ...
 *   return <>{dialog} ...</>;
 */
export function useChoiceDialog(): [ReactNode, <T extends string>(request: DialogRequest<T>) => Promise<T | null>] {
  const [request, setRequest] = useState<DialogRequest<string> | null>(null);
  // La funzione che "risolve" la Promise restituita da `ask`, in attesa della scelta.
  const resolveRef = useRef<((value: string | null) => void) | null>(null);

  const ask = useCallback(<T extends string>(next: DialogRequest<T>) => {
    setRequest(next);
    return new Promise<T | null>((resolve) => {
      resolveRef.current = resolve as (value: string | null) => void;
    });
  }, []);

  const close = (value: string | null) => {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setRequest(null);
  };

  const dialog = request === null ? null : <ChoiceDialog request={request} onClose={close} />;
  return [dialog, ask];
}

function ChoiceDialog({ request, onClose }: { request: DialogRequest<string>; onClose: (value: string | null) => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // `showModal` rende la finestra modale: blocca il resto della pagina e gestisce il tasto Esc.
  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  return (
    <dialog ref={dialogRef} className="dialog" onCancel={() => onClose(null)}>
      <h2>{request.title}</h2>
      <div className="dialog-message">{request.message}</div>
      <div className="dialog-actions">
        <button type="button" className="button secondary" onClick={() => onClose(null)}>
          Annulla
        </button>
        {request.choices.map((choice) => (
          <button
            key={choice.value}
            type="button"
            className={`button ${choice.variant ?? 'primary'}`}
            onClick={() => onClose(choice.value)}
          >
            {choice.label}
          </button>
        ))}
      </div>
    </dialog>
  );
}
