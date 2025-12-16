/**
 * Paragraph breaks data - determines which verses start new paragraphs
 * Based on standard Bible paragraph divisions (UBS/NA28 traditions)
 */

interface ParagraphBreaksData {
  [book: string]: {
    [chapter: string]: number[];
  };
}

let paragraphBreaksData: ParagraphBreaksData | null = null;
let loadPromise: Promise<ParagraphBreaksData | null> | null = null;

/**
 * Load paragraph breaks data (cached after first load)
 */
export async function loadParagraphBreaks(): Promise<ParagraphBreaksData | null> {
  if (paragraphBreaksData) {
    return paragraphBreaksData;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = fetch('/data/paragraph-breaks.json')
    .then((res) => {
      if (!res.ok) {
        console.warn('Paragraph breaks data not available');
        return null;
      }
      return res.json();
    })
    .then((data) => {
      paragraphBreaksData = data;
      return data;
    })
    .catch((err) => {
      console.warn('Failed to load paragraph breaks:', err);
      return null;
    });

  return loadPromise;
}

/**
 * Check if a verse starts a new paragraph
 * @param bookId - Book ID (e.g., 'matthew', 'genesis')
 * @param chapter - Chapter number
 * @param verseNumber - Verse number
 * @returns true if this verse starts a new paragraph
 */
export function isParagraphStart(
  bookId: string,
  chapter: number,
  verseNumber: number
): boolean {
  if (!paragraphBreaksData) {
    // Default: verse 1 always starts a paragraph
    return verseNumber === 1;
  }

  const bookData = paragraphBreaksData[bookId];
  if (!bookData) {
    return verseNumber === 1;
  }

  const chapterBreaks = bookData[String(chapter)];
  if (!chapterBreaks) {
    return verseNumber === 1;
  }

  return chapterBreaks.includes(verseNumber);
}

/**
 * Get all paragraph-starting verses for a chapter
 */
export function getParagraphBreaks(bookId: string, chapter: number): number[] {
  if (!paragraphBreaksData) {
    return [1];
  }

  const bookData = paragraphBreaksData[bookId];
  if (!bookData) {
    return [1];
  }

  const chapterBreaks = bookData[String(chapter)];
  return chapterBreaks || [1];
}
