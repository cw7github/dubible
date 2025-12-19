// Multi-version English Bible Translation Loader
// Supports multiple Bible translations with lazy loading

import { getBookById } from '../bible';

// Type for Bible translation JSON structure
type BibleData = Record<string, Record<string, Record<string, string>>>;

// Translation metadata
export interface TranslationInfo {
  id: string;
  name: string;
  abbreviation: string;
  copyright: string;
  url: string;
  license: string;
}

// Available translations registry
export const AVAILABLE_TRANSLATIONS: TranslationInfo[] = [
  {
    id: 'bsb',
    name: 'Berean Standard Bible',
    abbreviation: 'BSB',
    copyright: 'The Berean Bible (Berean.Bible) is a CC BY-SA licensed text.',
    url: 'https://berean.bible/',
    license: 'CC BY-SA 4.0',
  },
  {
    id: 'kjv',
    name: 'King James Version',
    abbreviation: 'KJV',
    copyright: 'Public Domain (1611)',
    url: 'https://www.kingjamesbibleonline.org/',
    license: 'Public Domain',
  },
];

// Translation data cache
const translationCache: Map<string, BibleData> = new Map();

// Loading promises to prevent duplicate requests
const loadingPromises: Map<string, Promise<BibleData | null>> = new Map();

/**
 * Get translation metadata by ID
 */
export function getTranslationInfo(version: string): TranslationInfo | null {
  return AVAILABLE_TRANSLATIONS.find(t => t.id === version) || null;
}

/**
 * Load a translation's data using dynamic imports for optimal bundle size
 */
export async function loadTranslation(version: string): Promise<BibleData | null> {
  // Check cache first
  if (translationCache.has(version)) {
    return translationCache.get(version)!;
  }

  // Check if already loading to prevent duplicate requests
  if (loadingPromises.has(version)) {
    return loadingPromises.get(version)!;
  }

  // Create loading promise
  const loadPromise = (async () => {
    try {
      let data: any;

      if (version === 'bsb') {
        data = await import('./bsb.json');
      } else if (version === 'kjv') {
        data = await import('./kjv.json');
      } else {
        console.warn(`Translation not available: ${version}`);
        return null;
      }

      const bibleData = data.default as BibleData;
      translationCache.set(version, bibleData);
      loadingPromises.delete(version);
      return bibleData;
    } catch (error) {
      console.error(`Failed to load translation: ${version}`, error);
      loadingPromises.delete(version);
      return null;
    }
  })();

  loadingPromises.set(version, loadPromise);
  return loadPromise;
}

/**
 * Get English verse text from specified Bible version (async version)
 * @param bookId - Book identifier
 * @param chapter - Chapter number
 * @param verse - Verse number
 * @param version - Bible version ID (defaults to 'bsb')
 */
export async function getEnglishVerseAsync(
  bookId: string,
  chapter: number,
  verse: number,
  version: string = 'bsb'
): Promise<string | null> {
  const book = getBookById(bookId);
  if (!book) return null;

  // Load translation data if not cached
  const translationData = await loadTranslation(version);
  if (!translationData) {
    console.warn(`Translation not available: ${version}, falling back to BSB`);
    return getEnglishVerseAsync(bookId, chapter, verse, 'bsb');
  }

  // Use the English name from our book data to look up in the translation
  const bookName = book.name.english;
  const bookData = translationData[bookName];

  if (!bookData) {
    console.warn(`Book not found in ${version}: ${bookName}`);
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
 * Get English verse text from specified Bible version (sync version - requires pre-loaded data)
 * @param bookId - Book identifier
 * @param chapter - Chapter number
 * @param verse - Verse number
 * @param version - Bible version ID (defaults to 'bsb')
 * @deprecated Use getEnglishVerseAsync for better performance with lazy loading
 */
export function getEnglishVerse(
  bookId: string,
  chapter: number,
  verse: number,
  version: string = 'bsb'
): string | null {
  const book = getBookById(bookId);
  if (!book) return null;

  // Get translation data (only works if already loaded)
  const translationData = translationCache.get(version);
  if (!translationData) {
    console.warn(`Translation not loaded: ${version}. Use getEnglishVerseAsync or loadTranslation first.`);
    // Try to return from cache if BSB is available
    const bsbData = translationCache.get('bsb');
    if (bsbData && version !== 'bsb') {
      return getEnglishVerse(bookId, chapter, verse, 'bsb');
    }
    return null;
  }

  // Use the English name from our book data to look up in the translation
  const bookName = book.name.english;
  const bookData = translationData[bookName];

  if (!bookData) {
    console.warn(`Book not found in ${version}: ${bookName}`);
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
 * @param bookId - Book identifier
 * @param chapter - Chapter number
 * @param startVerse - Starting verse number
 * @param endVerse - Ending verse number
 * @param version - Bible version ID (defaults to 'bsb')
 */
export function getEnglishVerses(
  bookId: string,
  chapter: number,
  startVerse: number,
  endVerse: number,
  version: string = 'bsb'
): string[] {
  const verses: string[] = [];

  for (let v = startVerse; v <= endVerse; v++) {
    const text = getEnglishVerse(bookId, chapter, v, version);
    if (text) {
      verses.push(text);
    }
  }

  return verses;
}

/**
 * Get all verses in a chapter (async version)
 * @param bookId - Book identifier
 * @param chapter - Chapter number
 * @param version - Bible version ID (defaults to 'bsb')
 */
export async function getEnglishChapterAsync(
  bookId: string,
  chapter: number,
  version: string = 'bsb'
): Promise<Map<number, string>> {
  const results = new Map<number, string>();
  const book = getBookById(bookId);

  if (!book) return results;

  // Load translation data
  const translationData = await loadTranslation(version);
  if (!translationData) {
    console.warn(`Translation not available: ${version}, falling back to BSB`);
    return getEnglishChapterAsync(bookId, chapter, 'bsb');
  }

  const bookName = book.name.english;
  const bookData = translationData[bookName];

  if (!bookData) return results;

  const chapterData = bookData[chapter.toString()];
  if (!chapterData) return results;

  for (const [verseNum, text] of Object.entries(chapterData)) {
    results.set(parseInt(verseNum, 10), text);
  }

  return results;
}

/**
 * Get all verses in a chapter (sync version - requires pre-loaded data)
 * @param bookId - Book identifier
 * @param chapter - Chapter number
 * @param version - Bible version ID (defaults to 'bsb')
 * @deprecated Use getEnglishChapterAsync for better performance with lazy loading
 */
export function getEnglishChapter(
  bookId: string,
  chapter: number,
  version: string = 'bsb'
): Map<number, string> {
  const results = new Map<number, string>();
  const book = getBookById(bookId);

  if (!book) return results;

  // Get translation data
  const translationData = translationCache.get(version);
  if (!translationData) {
    console.warn(`Translation not loaded: ${version}. Use getEnglishChapterAsync or loadTranslation first.`);
    const bsbData = translationCache.get('bsb');
    if (bsbData && version !== 'bsb') {
      return getEnglishChapter(bookId, chapter, 'bsb');
    }
    return results;
  }

  const bookName = book.name.english;
  const bookData = translationData[bookName];

  if (!bookData) return results;

  const chapterData = bookData[chapter.toString()];
  if (!chapterData) return results;

  for (const [verseNum, text] of Object.entries(chapterData)) {
    results.set(parseInt(verseNum, 10), text);
  }

  return results;
}

// Legacy export for backward compatibility
// @deprecated Use getTranslationInfo('bsb') instead
export const ENGLISH_TRANSLATION = {
  name: 'Berean Standard Bible',
  abbreviation: 'BSB',
  copyright: 'The Berean Bible (Berean.Bible) is a CC BY-SA licensed text.',
  url: 'https://berean.bible/',
};
