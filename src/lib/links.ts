/**
 * Costruzione dei link condivisibili. L'app usa il routing "a hash" (`#/...`):
 * GitHub Pages serve sempre `index.html` e la parte dopo `#` la gestisce React,
 * così ricaricare qualsiasi pagina non produce mai un errore 404.
 */

/** Indirizzo base dell'app, es. `https://utente.github.io/live-questions-class/`. */
function appBaseUrl(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}`;
}

/** Link per gli studenti: è sempre lo stesso, qualunque quiz sia in onda. */
export function studentLink(): string {
  return `${appBaseUrl()}#/play`;
}

/** Link permanente alla pagina di ripasso di un quiz. */
export function reviewLink(quizId: string): string {
  return `${appBaseUrl()}#/review?quiz=${encodeURIComponent(quizId)}`;
}
