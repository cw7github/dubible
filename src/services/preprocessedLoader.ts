/**
 * Preprocessed Bible Data Loader
 *
 * Loads pre-computed word segmentation, pinyin, and definitions from static JSON.
 * Uses runtime fetch to gracefully handle missing files during development.
 * Falls back to runtime processing if preprocessed data isn't available.
 */

import type { Verse, SegmentedWord } from '../types';

interface PreprocessedCharBreakdown {
  c: string;  // Character
  m: string;  // Meaning
}

interface PreprocessedWord {
  chinese: string;
  pinyin: string;
  definition: string;
  pos?: string;                    // Part of speech code
  isName?: boolean;
  nameType?: 'person' | 'place' | 'group';
  breakdown?: PreprocessedCharBreakdown[];
  freq?: 'common' | 'uncommon' | 'rare' | 'biblical';
  note?: string;
}

interface PreprocessedVerse {
  number: number;
  text: string;
  words: PreprocessedWord[];
}

interface PreprocessedChapter {
  book: string;
  bookId: string;
  chapter: number;
  verses: PreprocessedVerse[];
  processedAt: string;
}

interface PreprocessedBookManifest {
  bookId: string;
  bookName: string;
  chapterCount: number;
  chapters: number[]; // Available chapter numbers
}

interface PreprocessedManifest {
  version: string;
  generatedAt: string;
  books: Record<string, PreprocessedBookManifest>;
}

// Cache for loaded chapters
const chapterCache = new Map<string, PreprocessedChapter>();

// Manifest cache
let manifestCache: PreprocessedManifest | null = null;
let manifestLoadPromise: Promise<PreprocessedManifest | null> | null = null;

/**
 * Load the preprocessed data manifest
 * Returns null if manifest doesn't exist or can't be loaded
 */
async function loadManifest(): Promise<PreprocessedManifest | null> {
  // Return cached manifest if available
  if (manifestCache) {
    return manifestCache;
  }

  // If already loading, return the existing promise
  if (manifestLoadPromise) {
    return manifestLoadPromise;
  }

  // Start loading the manifest
  manifestLoadPromise = (async () => {
    try {
      const response = await fetch('/data/preprocessed/manifest.json');
      if (!response.ok) {
        console.warn('Preprocessed manifest not found - no preprocessed data available');
        return null;
      }

      const manifest: PreprocessedManifest = await response.json();
      manifestCache = manifest;
      return manifest;
    } catch (error) {
      console.warn('Failed to load preprocessed manifest:', error);
      return null;
    } finally {
      manifestLoadPromise = null;
    }
  })();

  return manifestLoadPromise;
}

/**
 * Check if preprocessed data exists for a chapter
 * This checks against the loaded manifest for accurate availability
 */
export async function hasPreprocessedData(
  bookId: string,
  chapter: number
): Promise<boolean> {
  const manifest = await loadManifest();
  if (!manifest) return false;

  const bookManifest = manifest.books[bookId];
  if (!bookManifest) return false;

  return bookManifest.chapters.includes(chapter);
}

/**
 * Check if a book has any preprocessed data
 * Returns the manifest info if available
 */
export async function getPreprocessedBookInfo(
  bookId: string
): Promise<PreprocessedBookManifest | null> {
  const manifest = await loadManifest();
  if (!manifest) return null;

  return manifest.books[bookId] || null;
}

/**
 * Get all books that have preprocessed data
 */
export async function getPreprocessedBookIds(): Promise<string[]> {
  const manifest = await loadManifest();
  if (!manifest) return [];

  return Object.keys(manifest.books);
}

/**
 * Load preprocessed chapter data using fetch
 * Returns null if not available or file doesn't exist yet
 */
export async function loadPreprocessedChapter(
  bookId: string,
  chapter: number
): Promise<Verse[] | null> {
  const key = `${bookId}-${chapter}`;

  // Check cache first
  if (chapterCache.has(key)) {
    return convertToVerses(chapterCache.get(key)!);
  }

  // Check manifest to see if this chapter should have preprocessed data
  const hasData = await hasPreprocessedData(bookId, chapter);
  if (!hasData) {
    return null;
  }

  try {
    // Use fetch for runtime loading - gracefully handles missing files
    // Files are served from public/ folder
    const url = `/data/preprocessed/${bookId}/chapter-${chapter}.json`;
    const response = await fetch(url);

    if (!response.ok) {
      // File doesn't exist yet - fall back to runtime processing
      return null;
    }

    const data: PreprocessedChapter = await response.json();
    chapterCache.set(key, data);
    return convertToVerses(data);
  } catch (error) {
    // Network error or JSON parse error - fall back to runtime processing
    console.warn(`Failed to load preprocessed data for ${key}:`, error);
    return null;
  }
}

/**
 * Convert preprocessed chapter to Verse array
 * Maps all enhanced fields from preprocessing to SegmentedWord
 */
function convertToVerses(chapter: PreprocessedChapter): Verse[] {
  return chapter.verses.map((verse) => ({
    number: verse.number,
    text: verse.text,
    words: verse.words.map((word): SegmentedWord => ({
      chinese: word.chinese,
      pinyin: word.pinyin || '',
      definition: word.definition || undefined,
      partOfSpeech: word.pos,
      isName: word.isName,
      nameType: word.nameType,
      breakdown: word.breakdown,
      freq: word.freq,
      note: word.note,
      // Calculate indices (approximate - for compatibility)
      startIndex: 0,
      endIndex: word.chinese.length,
    })),
  }));
}

/**
 * Download an entire book for offline use
 * Returns progress updates via callback
 */
export async function downloadBookForOffline(
  bookId: string,
  onProgress?: (current: number, total: number) => void
): Promise<{ success: boolean; downloaded: number; failed: number }> {
  const bookInfo = await getPreprocessedBookInfo(bookId);
  if (!bookInfo) {
    throw new Error(`No preprocessed data available for book: ${bookId}`);
  }

  let downloaded = 0;
  let failed = 0;

  for (let i = 0; i < bookInfo.chapters.length; i++) {
    const chapter = bookInfo.chapters[i];
    onProgress?.(i + 1, bookInfo.chapters.length);

    try {
      const verses = await loadPreprocessedChapter(bookId, chapter);
      if (verses) {
        downloaded++;
      } else {
        failed++;
      }
    } catch (error) {
      console.warn(`Failed to download ${bookId} chapter ${chapter}:`, error);
      failed++;
    }
  }

  // Store download status in localStorage
  if (downloaded > 0) {
    const downloadStatus = getDownloadStatus();
    downloadStatus[bookId] = {
      downloadedAt: Date.now(),
      chapterCount: downloaded,
    };
    localStorage.setItem('preprocessed_downloads', JSON.stringify(downloadStatus));
  }

  return { success: failed === 0, downloaded, failed };
}

/**
 * Check if a book has been downloaded for offline use
 */
export function isBookDownloaded(bookId: string): boolean {
  const status = getDownloadStatus();
  return bookId in status;
}

/**
 * Get download status for all books
 */
export function getDownloadStatus(): Record<string, { downloadedAt: number; chapterCount: number }> {
  try {
    const stored = localStorage.getItem('preprocessed_downloads');
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/**
 * Clear download status for a book
 */
export function clearBookDownload(bookId: string): void {
  const status = getDownloadStatus();
  delete status[bookId];
  localStorage.setItem('preprocessed_downloads', JSON.stringify(status));

  // Also clear from chapter cache
  for (const key of chapterCache.keys()) {
    if (key.startsWith(`${bookId}-`)) {
      chapterCache.delete(key);
    }
  }
}

/**
 * Clear the chapter cache
 */
export function clearPreprocessedCache(): void {
  chapterCache.clear();
}
