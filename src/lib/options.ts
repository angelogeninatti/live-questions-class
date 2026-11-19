/** Lettere e colori usati per distinguere le opzioni (A, B, C, D) in tutte le viste. */
export const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

/** Classi CSS dei colori delle opzioni, definite in `styles.css`. */
const OPTION_COLOR_CLASSES = ['option-a', 'option-b', 'option-c', 'option-d'] as const;

export function optionLetter(index: number): string {
  return OPTION_LETTERS[index] ?? String(index + 1);
}

export function optionColorClass(index: number): string {
  return OPTION_COLOR_CLASSES[index] ?? 'option-a';
}
