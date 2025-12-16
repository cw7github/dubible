import type { ChapterAudio } from '../../types';

// Cache for loaded audio timing data
const audioCache = new Map<string, ChapterAudio | null>();
const loadingPromises = new Map<string, Promise<ChapterAudio | null>>();

function getCacheKey(bookId: string, chapter: number): string {
  return `${bookId}-${chapter}`;
}

/**
 * Load audio timing data from the generated JSON files
 * Returns null if audio not available for this chapter
 */
export async function loadChapterAudio(
  bookId: string,
  chapter: number
): Promise<ChapterAudio | null> {
  const cacheKey = getCacheKey(bookId, chapter);

  // Return cached data if available
  if (audioCache.has(cacheKey)) {
    return audioCache.get(cacheKey) || null;
  }

  // Return existing promise if already loading
  if (loadingPromises.has(cacheKey)) {
    return loadingPromises.get(cacheKey)!;
  }

  // Load from JSON file
  const loadPromise = (async () => {
    try {
      const timingUrl = `/audio/${bookId}/chapter-${chapter}-timing.json`;
      console.log(`[AudioTiming] Loading timing data from: ${timingUrl}`);
      const response = await fetch(timingUrl);

      if (!response.ok) {
        console.log(`[AudioTiming] Timing data not available (${response.status}): ${timingUrl}`);
        audioCache.set(cacheKey, null);
        return null;
      }

      const data: ChapterAudio = await response.json();
      console.log(`[AudioTiming] Successfully loaded timing data for ${bookId} chapter ${chapter}:`, {
        duration: data.duration,
        verses: data.verses.length,
        totalWords: data.verses.reduce((sum, v) => sum + v.words.length, 0),
      });

      // Convert seconds to milliseconds for timing data
      const convertedData: ChapterAudio = {
        ...data,
        duration: data.duration * 1000,
        verses: data.verses.map((verse) => ({
          ...verse,
          startTime: verse.startTime * 1000,
          endTime: verse.endTime * 1000,
          words: verse.words.map((word) => ({
            ...word,
            startTime: word.startTime * 1000,
            endTime: word.endTime * 1000,
          })),
        })),
      };

      console.log(`[AudioTiming] Converted timing data to milliseconds (duration: ${convertedData.duration}ms)`);
      audioCache.set(cacheKey, convertedData);
      return convertedData;
    } catch (error) {
      console.error(`[AudioTiming] Failed to load timing data for ${bookId} chapter ${chapter}:`, error);
      audioCache.set(cacheKey, null);
      return null;
    } finally {
      loadingPromises.delete(cacheKey);
    }
  })();

  loadingPromises.set(cacheKey, loadPromise);
  return loadPromise;
}

/**
 * Synchronous version - returns cached data or null
 * Use loadChapterAudio for async loading
 */
export function getChapterAudio(
  bookId: string,
  chapter: number
): ChapterAudio | null {
  const cacheKey = getCacheKey(bookId, chapter);

  // Return cached data if available
  if (audioCache.has(cacheKey)) {
    return audioCache.get(cacheKey) || null;
  }

  // Trigger async load
  loadChapterAudio(bookId, chapter);

  return null;
}

/**
 * Check if audio is available (sync check of cache)
 */
export function isAudioAvailable(bookId: string, chapter: number): boolean {
  const cacheKey = getCacheKey(bookId, chapter);
  return audioCache.get(cacheKey) !== null && audioCache.has(cacheKey);
}

/**
 * Find the current verse and word based on playback time (in ms)
 */
export function getPositionAtTime(
  audioData: ChapterAudio,
  currentTime: number
): { verseNumber: number | null; wordIndex: number | null } {
  for (const verse of audioData.verses) {
    if (currentTime >= verse.startTime && currentTime <= verse.endTime) {
      // Find current word within verse
      for (const word of verse.words) {
        if (currentTime >= word.startTime && currentTime <= word.endTime) {
          return {
            verseNumber: verse.verseNumber,
            wordIndex: word.wordIndex,
          };
        }
      }
      // Between words in this verse
      return {
        verseNumber: verse.verseNumber,
        wordIndex: null,
      };
    }
  }

  return { verseNumber: null, wordIndex: null };
}

/**
 * Get the audio file URL for a chapter
 */
export function getAudioUrl(bookId: string, chapter: number): string {
  return `/audio/${bookId}/chapter-${chapter}.mp3`;
}
