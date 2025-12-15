// Bible Cache Service - Dexie IndexedDB for offline storage

import Dexie, { type EntityTable } from 'dexie';
import type { Chapter, Verse, CharacterSet } from '../types';
import { fetchChapter } from './bibleApi';
import { convertApiVersesToChapter } from './chineseProcessor';
import { toSimplified } from '../utils';
import { loadPreprocessedChapter } from './preprocessedLoader';

// Cached chapter with both Traditional and Simplified versions
interface CachedChapter {
  id: string; // `${bookId}-${chapter}`
  bookId: string;
  chapter: number;
  versesTraditional: Verse[]; // Original Traditional Chinese
  versesSimplified: Verse[];  // Pre-converted Simplified Chinese
  version: string;
  cachedAt: number;
}

/**
 * Convert verses from Traditional to Simplified Chinese
 * Creates a deep copy with all Chinese text converted
 */
function convertVersesToSimplified(verses: Verse[]): Verse[] {
  return verses.map(verse => ({
    ...verse,
    text: toSimplified(verse.text),
    words: verse.words?.map(word => ({
      ...word,
      chinese: toSimplified(word.chinese),
      // Keep pinyin and definition unchanged
    })),
  }));
}

// Create the database
const db = new Dexie('BilingualBibleCache') as Dexie & {
  chapters: EntityTable<CachedChapter, 'id'>;
};

// Version 2: Added dual character set storage (Traditional + Simplified)
db.version(2).stores({
  chapters: 'id, bookId, chapter, version, cachedAt',
});

// Cache expiry time (7 days)
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Get chapter from cache or fetch from API
 * Returns the appropriate character set version (Traditional or Simplified)
 */
export async function getChapter(
  bookId: string,
  chapterNum: number,
  characterSet: CharacterSet = 'traditional',
  forceRefresh = false
): Promise<Chapter | null> {
  const cacheKey = `${bookId}-${chapterNum}`;

  // Helper to select the right verses based on character set
  const selectVerses = (cached: CachedChapter): Verse[] => {
    // Handle legacy cache entries that only have 'verses' field
    if (!cached.versesTraditional && (cached as any).verses) {
      return (cached as any).verses;
    }
    return characterSet === 'simplified'
      ? cached.versesSimplified
      : cached.versesTraditional;
  };

  // Try to get from cache first
  if (!forceRefresh) {
    try {
      const cached = await db.chapters.get(cacheKey);
      if (cached) {
        const isExpired = Date.now() - cached.cachedAt > CACHE_EXPIRY_MS;
        // Check if cache has both versions (not legacy format)
        const hasBothVersions = cached.versesTraditional && cached.versesSimplified;

        if (!isExpired && hasBothVersions) {
          return {
            number: cached.chapter,
            verses: selectVerses(cached),
          };
        }
        // If legacy format or expired, refetch
      }
    } catch (error) {
      console.warn('Cache read error:', error);
    }
  }

  // Try preprocessed data first (highest quality - LLM-generated definitions)
  try {
    const preprocessedVerses = await loadPreprocessedChapter(bookId, chapterNum);
    if (preprocessedVerses && preprocessedVerses.length > 0) {
      const versesTraditional = preprocessedVerses;
      const versesSimplified = convertVersesToSimplified(versesTraditional);

      // Cache the preprocessed data
      try {
        await db.chapters.put({
          id: cacheKey,
          bookId,
          chapter: chapterNum,
          versesTraditional,
          versesSimplified,
          version: 'ncv-preprocessed',
          cachedAt: Date.now(),
        });
      } catch (error) {
        console.warn('Cache write error:', error);
      }

      return {
        number: chapterNum,
        verses: characterSet === 'simplified' ? versesSimplified : versesTraditional,
      };
    }
  } catch (error) {
    console.warn('Preprocessed data load error:', error);
    // Fall through to API fetch
  }

  // Fetch from API (fallback for non-preprocessed books)
  try {
    const apiRecords = await fetchChapter(bookId, chapterNum);
    if (!apiRecords.length) {
      return null;
    }

    // Convert to Traditional Chinese (source format) with runtime segmentation
    const versesTraditional = convertApiVersesToChapter(apiRecords);

    // Pre-convert to Simplified Chinese for instant switching
    const versesSimplified = convertVersesToSimplified(versesTraditional);

    // Cache both versions
    try {
      await db.chapters.put({
        id: cacheKey,
        bookId,
        chapter: chapterNum,
        versesTraditional,
        versesSimplified,
        version: 'ncv',
        cachedAt: Date.now(),
      });
    } catch (error) {
      console.warn('Cache write error:', error);
    }

    // Return the requested character set
    return {
      number: chapterNum,
      verses: characterSet === 'simplified' ? versesSimplified : versesTraditional,
    };
  } catch (error) {
    console.error('API fetch error:', error);

    // Try to return stale cache if API fails
    try {
      const staleCache = await db.chapters.get(cacheKey);
      if (staleCache) {
        return {
          number: staleCache.chapter,
          verses: selectVerses(staleCache),
        };
      }
    } catch {
      // Ignore cache errors
    }

    return null;
  }
}

/**
 * Prefetch adjacent chapters for smooth scrolling
 * Pre-caches both character set versions automatically
 */
export async function prefetchAdjacentChapters(
  bookId: string,
  currentChapter: number,
  totalChapters: number
): Promise<void> {
  const chaptersToFetch: number[] = [];

  // Previous chapter
  if (currentChapter > 1) {
    chaptersToFetch.push(currentChapter - 1);
  }

  // Next chapter
  if (currentChapter < totalChapters) {
    chaptersToFetch.push(currentChapter + 1);
  }

  // Fetch in background without blocking
  // No need to pass characterSet - getChapter caches both versions
  Promise.all(
    chaptersToFetch.map(async (chap) => {
      const cacheKey = `${bookId}-${chap}`;
      try {
        const cached = await db.chapters.get(cacheKey);
        // Check if cache exists AND has both versions (not legacy)
        const hasBothVersions = cached?.versesTraditional && cached?.versesSimplified;
        if (!cached || !hasBothVersions || Date.now() - cached.cachedAt > CACHE_EXPIRY_MS) {
          await getChapter(bookId, chap);
        }
      } catch {
        // Ignore prefetch errors
      }
    })
  );
}

/**
 * Check if a chapter is cached
 */
export async function isChapterCached(
  bookId: string,
  chapterNum: number
): Promise<boolean> {
  const cacheKey = `${bookId}-${chapterNum}`;
  try {
    const cached = await db.chapters.get(cacheKey);
    return !!cached && Date.now() - cached.cachedAt < CACHE_EXPIRY_MS;
  } catch {
    return false;
  }
}

/**
 * Clear all cached chapters
 */
export async function clearCache(): Promise<void> {
  await db.chapters.clear();
}

/**
 * Clear expired cache entries
 */
export async function clearExpiredCache(): Promise<void> {
  const expiredTime = Date.now() - CACHE_EXPIRY_MS;
  await db.chapters.where('cachedAt').below(expiredTime).delete();
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalChapters: number;
  totalSize: number;
}> {
  const count = await db.chapters.count();
  return {
    totalChapters: count,
    totalSize: count * 50, // Approximate KB per chapter
  };
}
