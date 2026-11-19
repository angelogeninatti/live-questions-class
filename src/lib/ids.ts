/**
 * Generazione degli identificativi dei quiz.
 *
 * Gli id compaiono nei link di ripasso, quindi devono essere brevi ma NON indovinabili:
 * 10 caratteri presi da un alfabeto di 32 simboli danno 32^10 ≈ 10^15 combinazioni.
 * Usiamo `crypto.getRandomValues`, il generatore crittografico del browser
 * (`Math.random` non è adatto: è prevedibile).
 */

// 32 simboli: lettere minuscole e cifre, senza quelli facili da confondere (0/o, 1/l).
const ALPHABET = '23456789abcdefghijkmnpqrstuvwxyz';
const QUIZ_ID_LENGTH = 10;

export function generateQuizId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(QUIZ_ID_LENGTH));
  // 256 è multiplo di 32, quindi `byte % 32` è uniforme: nessun simbolo è favorito.
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join('');
}
