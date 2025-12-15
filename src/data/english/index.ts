// Berean Standard Bible - Bundled English Translation
// License: Creative Commons BY-SA (free with attribution)
// Source: https://berean.bible/

import bsbData from './bsb.json';
import { getBookById } from '../bible';

// Type for the BSB JSON structure
type BSBData = Record<string, Record<string, Record<string, string>>>;

const bsb = bsbData as BSBData;

/**
 * Get English verse text from bundled BSB
 */
export function getEnglishVerse(
  bookId: string,
  chapter: number,
  verse: number
): string | null {
  const book = getBookById(bookId);
  if (!book) return null;

  // Use the English name from our book data to look up in BSB
  const bookName = book.name.english;
  const bookData = bsb[bookName];

  if (!bookData) {
    console.warn(`Book not found in BSB: ${bookName}`);
    return null;
  }

  const chapterData = bookData[chapter.toString()];
  if (!chapterData) {
    console.warn(`Chapter not found: ${bookName} ${chapter}`);
    return null;
  }

  const verseText = chapterData[verse.toString()];
  if (!verseText) {
    console.warn(`Verse not found: ${bookName} ${chapter}:${verse}`);
    return null;
  }

  return verseText;
}

/**
 * Get multiple verses (for displaying a range)
 */
export function getEnglishVerses(
  bookId: string,
  chapter: number,
  startVerse: number,
  endVerse: number
): string[] {
  const verses: string[] = [];

  for (let v = startVerse; v <= endVerse; v++) {
    const text = getEnglishVerse(bookId, chapter, v);
    if (text) {
      verses.push(text);
    }
  }

  return verses;
}

/**
 * Get all verses in a chapter
 */
export function getEnglishChapter(
  bookId: string,
  chapter: number
): Map<number, string> {
  const results = new Map<number, string>();
  const book = getBookById(bookId);

  if (!book) return results;

  const bookName = book.name.english;
  const bookData = bsb[bookName];

  if (!bookData) return results;

  const chapterData = bookData[chapter.toString()];
  if (!chapterData) return results;

  for (const [verseNum, text] of Object.entries(chapterData)) {
    results.set(parseInt(verseNum, 10), text);
  }

  return results;
}

// Export translation info for attribution
export const ENGLISH_TRANSLATION = {
  name: 'Berean Standard Bible',
  abbreviation: 'BSB',
  copyright: 'The Berean Bible (Berean.Bible) is a CC BY-SA licensed text.',
  url: 'https://berean.bible/',
};
