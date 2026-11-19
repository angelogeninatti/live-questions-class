/**
 * Costruzione dei link condivisibili. L'app usa il routing "a hash" (`#/...`):
 * GitHub Pages serve sempre `index.html` e la parte dopo `#` la gestisce React,
 * così ricaricare qualsiasi pagina non produce mai un errore 404.
 */

/** Indirizzo base dell'app, es. `https://utente.github.io/live-questions-class/`. */
function appBaseUrl(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}`;
}

/**
 * Link per gli studenti: porta al quiz indicato, quando è in onda.
 * Si può preparare prima della lezione (es. su Moodle): l'id resta lo stesso.
 */
export function studentLink(quizId: string): string {
  return `${appBaseUrl()}#/play?quiz=${encodeURIComponent(quizId)}`;
}

/** Link permanente alla pagina di ripasso di un quiz. */
export function reviewLink(quizId: string): string {
  return `${appBaseUrl()}#/review?quiz=${encodeURIComponent(quizId)}`;
}
