/** Punto di ingresso: monta l'app React nella pagina. */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Gli stili globali vanno importati per primi: così i fogli dei componenti, caricati dopo,
// possono sovrascriverne le regole.
import './styles.css';
import { StatusMessage } from './components/StatusMessage';

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
      <main>
        <StatusMessage tone="error" title="L'app non è configurata correttamente">
          {error instanceof Error ? error.message : String(error)}
        </StatusMessage>
      </main>,
    ),
  );
