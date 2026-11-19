/**
 * Regole sui nickname degli studenti: forma ammessa, unicità e parole vietate.
 *
 * L'elenco delle parole vietate NON sta nel repository (che è pubblico): il docente lo
 * gestisce dal pannello e viene salvato su Firestore in `config/moderation`.
 * Il controllo avviene in due punti:
 *  - qui, nel browser, con un confronto tollerante (accenti, lettere sostituite da cifre,
 *    parole attaccate) per dare subito un messaggio chiaro;
 *  - nelle regole di sicurezza, con un confronto parola per parola, così chi scrive
 *    direttamente nel database senza passare dall'app viene comunque bloccato.
 */

export const NICKNAME_MAX_LENGTH = 20;

/** Lettere (anche accentate), cifre, spazio e pochi segni di punteggiatura. */
const NICKNAME_PATTERN = /^[\p{L}\p{N} ._'-]+$/u;

/** Le parole vietate più corte di così si cercano solo come parole intere (vedi sotto). */
const MIN_SUBSTRING_MATCH = 4;

/** Ripulisce quanto digitato: niente spazi ai bordi né spazi multipli. */
export function cleanNickname(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

/**
 * Chiave usata per l'unicità: "Mario", "mario" e "MARIO" sono lo stesso nickname.
 * Le regole di sicurezza verificano che sia proprio `nickname.lower()`.
 */
export function nicknameKey(nickname: string): string {
  return nickname.toLowerCase();
}

/** Restituisce un messaggio d'errore, oppure `null` se la forma del nickname va bene. */
export function nicknameFormatError(nickname: string): string | null {
  if (nickname.length === 0) return 'Scrivi un nickname.';
  if (nickname.length > NICKNAME_MAX_LENGTH) return `Al massimo ${NICKNAME_MAX_LENGTH} caratteri.`;
  if (!NICKNAME_PATTERN.test(nickname)) return 'Usa solo lettere, cifre, spazi e . _ \' -';
  if (!/[\p{L}\p{N}]/u.test(nickname)) return 'Il nickname deve contenere almeno una lettera o una cifra.';
  return null;
}

/** Sostituzioni tipiche usate per aggirare i filtri ("c4zz0" → "cazzo"). */
const LOOKALIKES: Record<string, string> = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '9': 'g', '@': 'a', '$': 's',
};

/**
 * Forma "canonica" di un testo per il confronto con le parole vietate:
 * minuscolo, senza accenti, con le cifre-sosia convertite in lettere
 * e con tutto ciò che non è una lettera trasformato in spazio.
 * La stessa funzione normalizza le parole che il docente inserisce nell'elenco.
 */
export function normalizeForModeration(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '') // "è" → "e"
    .replace(/[0-9@$]/g, (char) => LOOKALIKES[char] ?? char)
    .replace(/[^a-z]+/g, ' ')
    .replace(/(.)\1+/g, '$1') // "cazzzzo" → "cazo": le lettere ripetute contano una volta
    .trim();
}

/**
 * Vero se il nickname contiene una parola vietata.
 *  - Parole vietate lunghe (≥ 4 lettere): cercate ovunque, anche dentro altre parole
 *    e ignorando gli spazi ("ca zzo").
 *  - Parole vietate corte: solo come parola intera, per evitare falsi positivi
 *    (una parola di 3 lettere comparirebbe dentro molti nomi innocui).
 */
export function containsBannedWord(nickname: string, bannedWords: readonly string[]): boolean {
  const normalized = normalizeForModeration(nickname);
  const words = normalized.split(' ');
  const compact = normalized.replaceAll(' ', '');
  return bannedWords.some((banned) => {
    const target = normalizeForModeration(banned).replaceAll(' ', '');
    if (target === '') return false;
    return target.length >= MIN_SUBSTRING_MATCH ? compact.includes(target) : words.includes(target);
  });
}

/**
 * Prepara l'elenco scritto dal docente (una parola per riga, o separate da virgole).
 * Le parole si salvano solo in minuscolo e senza spazi, così le regole di sicurezza
 * possono confrontarle direttamente con le parole del nickname; la normalizzazione
 * completa (accenti, cifre-sosia, ...) la fa `containsBannedWord` al momento del confronto.
 */
export function parseBannedWordsInput(text: string): string[] {
  const words = text
    .split(/[\n,;]+/)
    .map((word) => word.toLowerCase().replace(/\s+/g, ''))
    .filter((word) => word.length > 0);
  return [...new Set(words)].sort();
}
