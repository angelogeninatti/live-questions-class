/**
 * Routing dell'applicazione. Usiamo `HashRouter`: l'indirizzo della pagina sta dopo il `#`
 * (es. `.../#/host`). Il server (GitHub Pages) vede sempre e solo `index.html`, quindi
 * ricaricare qualsiasi pagina funziona senza errori 404.
 *
 *   #/play               studenti: il quiz in onda (link fisso, da mettere su Moodle)
 *   #/host               docente: libreria e partita
 *   #/review?quiz=ID     ripasso di un quiz con soluzioni pubblicate
 */
import { HashRouter, Navigate, Route, Routes } from 'react-router';
import { HostView } from './views/HostView';
import { ReviewView } from './views/ReviewView';
import { StudentView } from './views/StudentView';

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/play" element={<StudentView />} />
        <Route path="/host/*" element={<HostView />} />
        <Route path="/review" element={<ReviewView />} />
        {/* Qualsiasi altro indirizzo (anche quello "nudo" del sito) porta alla vista studenti. */}
        <Route path="*" element={<Navigate to="/play" replace />} />
      </Routes>
    </HashRouter>
  );
}
