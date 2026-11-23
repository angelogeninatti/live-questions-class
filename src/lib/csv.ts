/**
 * Esportazione dei risultati di una partita in CSV.
 *
 * Usiamo il punto e virgola come separatore e aggiungiamo il "BOM" UTF-8 all'inizio:
 * così Excel in italiano apre il file con colonne e accenti corretti.
 */
import type { AnswerWithUid, Game, LeaderboardEntry, PublicQuestion } from '../types';
import { optionLetter } from './options';
import { creditFor } from './scoring';

const SEPARATOR = ';';

function csvCell(value: string | number): string {
  const text = String(value);
  // Racchiudiamo tra virgolette (raddoppiando quelle interne) se il testo
  // contiene caratteri speciali per il formato CSV.
  return /[";\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** Esito di una risposta: "corretta", "sbagliata" oppure "parziale 2/3" (opzioni corrette scelte / totali). */
function outcomeLabel(choices: readonly number[], correct: readonly number[]): string {
  const credit = creditFor(choices, correct);
  if (credit === 1) return 'corretta';
  if (credit === 0) return 'sbagliata';
  return `parziale ${new Set(choices).size}/${correct.length}`;
}

/** Una riga per studente: punteggio totale e, per ogni domanda, risposta data ed esito. */
export function buildResultsCsv(
  game: Game,
  questions: readonly PublicQuestion[],
  leaderboard: readonly LeaderboardEntry[],
  answersByQuestion: Readonly<Record<string, AnswerWithUid[]>>,
): string {
  const header = ['Posizione', 'Nickname', 'Punti', 'Corrette'];
  for (const question of questions) {
    header.push(`${question.id} risposta`, `${question.id} esito`, `${question.id} secondi`);
  }

  const rows = leaderboard.map((entry, index) => {
    const row: (string | number)[] = [index + 1, entry.nickname, entry.score, entry.correctCount];
    for (const question of questions) {
      const answer = answersByQuestion[question.id]?.find((candidate) => candidate.uid === entry.uid);
      const openedAt = game.openedAt[question.id];
      if (answer === undefined) {
        row.push('', '', '');
        continue;
      }
      const correct = game.revealed[question.id];
      const outcome = correct === undefined ? 'non rivelata' : outcomeLabel(answer.choices, correct);
      const seconds =
        openedAt === undefined ? '' : ((answer.answeredAt.toMillis() - openedAt.toMillis()) / 1000).toFixed(1).replace('.', ',');
      row.push(answer.choices.map(optionLetter).join(', '), outcome, seconds);
    }
    return row;
  });

  return '﻿' + [header, ...rows].map((row) => row.map(csvCell).join(SEPARATOR)).join('\r\n');
}

/** Fa scaricare al browser un file di testo. */
export function downloadTextFile(fileName: string, content: string, mimeType = 'text/csv;charset=utf-8'): void {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  // Liberiamo la memoria solo dopo che il browser ha avviato lo scaricamento.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
