import type { PlanPassage } from '../types/progress';

/**
 * Determines if a given verse position is the end of a passage
 */
export function isEndOfPassage(
  bookId: string,
  chapter: number,
  verseNumber: number,
  totalVersesInChapter: number,
  passage: PlanPassage
): boolean {
  // Check if we're in the right book
  if (passage.bookId !== bookId) {
    return false;
  }

  // Determine the end chapter of this passage
  const passageEndChapter = passage.endChapter ?? passage.startChapter;

  // Check if we're in the last chapter of this passage
  if (chapter !== passageEndChapter) {
    return false;
  }

  // If specific end verse is specified, check if we're at that verse
  if (passage.endVerse !== undefined) {
    return verseNumber === passage.endVerse;
  }

  // Otherwise, we're at the end if we're at the last verse of the chapter
  return verseNumber === totalVersesInChapter;
}

/**
 * Determines if a position is within a passage
 */
export function isWithinPassage(
  bookId: string,
  chapter: number,
  passage: PlanPassage
): boolean {
  if (passage.bookId !== bookId) {
    return false;
  }

  const passageStartChapter = passage.startChapter;
  const passageEndChapter = passage.endChapter ?? passage.startChapter;

  return chapter >= passageStartChapter && chapter <= passageEndChapter;
}

/**
 * Finds which passage (if any) a given position is the end of
 */
export function findEndingPassage(
  bookId: string,
  chapter: number,
  verseNumber: number,
  totalVersesInChapter: number,
  passages: PlanPassage[]
): { passage: PlanPassage; index: number } | null {
  for (let i = 0; i < passages.length; i++) {
    const passage = passages[i];
    if (isEndOfPassage(bookId, chapter, verseNumber, totalVersesInChapter, passage)) {
      return { passage, index: i };
    }
  }
  return null;
}

/**
 * Gets the next passage after the current one
 */
export function getNextPassage(
  currentPassageIndex: number,
  allPassages: PlanPassage[]
): PlanPassage | null {
  const nextIndex = currentPassageIndex + 1;
  if (nextIndex >= allPassages.length) {
    return null;
  }
  return allPassages[nextIndex];
}
