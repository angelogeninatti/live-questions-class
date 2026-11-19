import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serve il sito di progetto in `https://<utente>.github.io/<nome-repo>/`.
// `base` deve quindi coincidere con il nome del repository (con le barre).
// Se rinomini il repository, cambia questa riga.
const REPO_NAME = 'live-questions-class';

export default defineConfig({
  base: `/${REPO_NAME}/`,
  plugins: [react()],
  build: {
    // L'SDK di Firebase da solo pesa circa 200 kB compressi: alziamo la soglia
    // dell'avviso sulla dimensione dei file per non ricevere un falso allarme.
    chunkSizeWarningLimit: 1000,
  },
});
