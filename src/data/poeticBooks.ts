/**
 * Identifies which Bible books use poetic/verse-per-line formatting
 * vs prose/paragraph flow formatting.
 *
 * Poetic books: Each verse on its own line (traditional poetry layout)
 * Prose books: Verses flow together in paragraphs with inline verse numbers
 */

// Books that are entirely or primarily poetry
export const POETIC_BOOKS = new Set([
  // Old Testament Poetry/Wisdom
  'job',           // Mostly poetry (except prologue/epilogue)
  'psalms',        // All poetry
  'proverbs',      // Poetic sayings
  'ecclesiastes',  // Poetic reflections
  'songofsolomon', // Love poetry
  'lamentations',  // Acrostic poetry

  // Prophetic books with heavy poetic content
  // (These could be debated, but traditionally formatted as poetry)
]);

// Specific chapters within prose books that should use poetry formatting
// e.g., songs embedded in narrative
export const POETIC_CHAPTERS: Record<string, number[]> = {
  // Exodus - Song of Moses (ch 15)
  'exodus': [15],
  // Deuteronomy - Song of Moses (ch 32), Blessing of Moses (ch 33)
  'deuteronomy': [32, 33],
  // Judges - Song of Deborah (ch 5)
  'judges': [5],
  // 1 Samuel - Hannah's Song (ch 2)
  '1samuel': [2],
  // 2 Samuel - David's Song (ch 22), Last Words (ch 23)
  '2samuel': [22, 23],
  // Isaiah, Jeremiah, Ezekiel - mostly poetry but mixed
  // For now, treating prophets as prose since they have narrative sections
  // Revelation - Songs and hymns throughout
  'revelation': [4, 5, 7, 11, 12, 14, 15, 18, 19],
};

/**
 * Determines if a book/chapter should use poetry (verse-per-line) formatting
 */
export function isPoetrySection(bookId: string, chapter: number): boolean {
  const normalizedBookId = bookId.toLowerCase();

  // Check if entire book is poetry
  if (POETIC_BOOKS.has(normalizedBookId)) {
    return true;
  }

  // Check if specific chapter is poetry
  const poeticChapters = POETIC_CHAPTERS[normalizedBookId];
  if (poeticChapters && poeticChapters.includes(chapter)) {
    return true;
  }

  return false;
}
