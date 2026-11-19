/** Punto di ingresso: monta l'app React nella pagina. */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const root = createRoot(document.getElementById('root')!);

// Importiamo l'app in modo "dinamico" per poter mostrare un messaggio chiaro
// se manca la configurazione di Firebase (errore lanciato da `firebase.ts`).
import('./App')
  .then(({ App }) =>
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
  )
  .catch((error: unknown) =>
    root.render(
      <main className="status-message status-error">
        <h2>L'app non è configurata correttamente</h2>
        <p>{error instanceof Error ? error.message : String(error)}</p>
      </main>,
    ),
  );
