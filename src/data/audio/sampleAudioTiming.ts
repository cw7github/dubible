import type { ChapterAudio, VerseTiming, WordTiming } from '../../types';
import { getAudioUrl as getConfigAudioUrl, getAudioTimingUrl } from '../../config/audio';

// Cache for loaded audio timing data
const audioCache = new Map<string, ChapterAudio | null>();
const loadingPromises = new Map<string, Promise<ChapterAudio | null>>();

// Cache for raw word data (to get word text/pinyin/definition for display)
const rawWordCache = new Map<string, Map<string, { word: string; pinyin: string; definition?: string }>>();

const MIN_WORD_WINDOW_MS = 60;

function getCacheKey(bookId: string, chapter: number): string {
  return `${bookId}-${chapter}`;
}

function normalizeVerseWordTimings(words: WordTiming[], verseEndTime: number): WordTiming[] {
  if (words.length === 0) return words;

  const verseStartTime = words[0].startTime;
  const totalDuration = verseEndTime - verseStartTime;
  if (!Number.isFinite(totalDuration) || totalDuration <= 0) return words;

  const effectiveMinWindow = Math.min(MIN_WORD_WINDOW_MS, totalDuration / words.length);

  const adjustedStarts = new Array<number>(words.length);
  adjustedStarts[0] = verseStartTime;

  for (let i = 1; i < words.length; i++) {
    adjustedStarts[i] = Math.max(words[i].startTime, adjustedStarts[i - 1] + effectiveMinWindow);
  }

  adjustedStarts[words.length - 1] = Math.min(
    adjustedStarts[words.length - 1],
    verseEndTime - effectiveMinWindow
  );

  for (let i = words.length - 2; i >= 0; i--) {
    adjustedStarts[i] = Math.min(adjustedStarts[i], adjustedStarts[i + 1] - effectiveMinWindow);
  }

  return words.map((word, i) => ({
    ...word,
    startTime: adjustedStarts[i],
    endTime: i < words.length - 1 ? adjustedStarts[i + 1] : verseEndTime,
  }));
}

/**
 * Raw format from generated JSON files (from ElevenLabs with timestamps)
 */
interface RawWordTiming {
  word: string;
  pinyin: string;
  definition?: string;
  start: number;  // seconds
  end: number;    // seconds
}

interface RawVerseTiming {
  verse: number;
  words: RawWordTiming[];
}

interface RawChapterAudio {
  chapter: number;
  voice: string;
  voiceId: string;
  duration: number;  // seconds
  characterCount: number;
  verses: RawVerseTiming[];
}

/**
 * Transform raw generated timing data to the app's expected ChapterAudio format
 * Also caches raw word text/pinyin/definition for display in the audio bar
 */
function transformTimingData(
  bookId: string,
  chapter: number,
  raw: RawChapterAudio
): ChapterAudio {
  const cacheKey = getCacheKey(bookId, chapter);
  const wordDataMap = new Map<string, { word: string; pinyin: string; definition?: string }>();

  const rawDurationMs = raw.duration * 1000;
  const firstVerseNumber =
    raw.verses.length > 0 ? Math.min(...raw.verses.map((v) => v.verse)) : 1;

  const verses: VerseTiming[] = raw.verses.map((rawVerse) => {
    // Calculate verse start/end from word timings
    const words: WordTiming[] = rawVerse.words.map((rawWord, index) => {
      // Cache word text, pinyin, and definition for display lookup
      const wordKey = `${rawVerse.verse}-${index}`;
      wordDataMap.set(wordKey, {
        word: rawWord.word,
        pinyin: rawWord.pinyin,
        definition: rawWord.definition
      });

      return {
        wordIndex: index,
        startTime: rawWord.start * 1000,  // Convert to ms
        endTime: rawWord.end * 1000,
      };
    });

    // Verse timing spans from first word start to last word end (before normalization)
    // IMPORTANT: For the first verse, startTime should be 0 so "Play from v1" always
    // includes the very beginning of the chapter audio. Some chapters have an initial
    // silence/lead-in (or browser seek granularity) that can cause the first word to be
    // skipped if we seek to the first word's timestamp (e.g., ~0.2s).
    const verseStart = rawVerse.verse === firstVerseNumber ? 0 : (words.length > 0 ? words[0].startTime : 0);
    const verseEnd = words.length > 0 ? words[words.length - 1].endTime : 0;

    const normalizedWords = normalizeVerseWordTimings(words, verseEnd);

    return {
      verseNumber: rawVerse.verse,
      startTime: verseStart,
      endTime: verseEnd,
      words: normalizedWords,
    };
  });

  // Store raw word data for later lookup
  rawWordCache.set(cacheKey, wordDataMap);

  return {
    bookId,
    chapter,
    audioUrl: getConfigAudioUrl(bookId, chapter, 2),
    duration: rawDurationMs,  // Convert to ms
    verses,
  };
}

/**
 * Load audio timing data from the generated JSON files
 * Also loads preprocessed data to enrich with definitions
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
      // Timing data is stored alongside the mp3 file
      const timingUrl = getAudioTimingUrl(bookId, chapter);
      console.log(`[AudioTiming] Loading timing data from: ${timingUrl}`);
      const response = await fetch(timingUrl);

      if (!response.ok) {
        console.log(`[AudioTiming] Timing data not available (${response.status}): ${timingUrl}`);
        audioCache.set(cacheKey, null);
        return null;
      }

      const rawData: RawChapterAudio = await response.json();
      console.log(`[AudioTiming] Successfully loaded timing data for ${bookId} chapter ${chapter}:`, {
        duration: rawData.duration,
        verses: rawData.verses.length,
        totalWords: rawData.verses.reduce((sum, v) => sum + v.words.length, 0),
        voice: rawData.voice,
      });

      // Load preprocessed data to get definitions
      try {
        const preprocessedUrl = `/data/preprocessed/${bookId}/chapter-${chapter}.json`;
        const preprocessedResponse = await fetch(preprocessedUrl);
        if (preprocessedResponse.ok) {
          const preprocessedData = await preprocessedResponse.json();

          // Enrich audio data with definitions from preprocessed data
          rawData.verses.forEach((verse) => {
            const preprocessedVerse = preprocessedData.verses.find((v: any) => v.number === verse.verse);
            if (preprocessedVerse?.words) {
              verse.words.forEach((word, wIdx) => {
                const preprocessedWord = preprocessedVerse.words[wIdx];
                if (preprocessedWord?.definition) {
                  word.definition = preprocessedWord.definition;
                }
              });
            }
          });
          console.log(`[AudioTiming] Enriched audio data with definitions from preprocessed data`);
        }
      } catch (err) {
        console.warn(`[AudioTiming] Could not load preprocessed data for definitions:`, err);
      }

      // Transform to app's expected format
      const convertedData = transformTimingData(bookId, chapter, rawData);

      console.log(`[AudioTiming] Converted timing data (duration: ${convertedData.duration}ms)`);
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
 * When between words, returns the PREVIOUS word to maintain highlighting during pauses
 */
export function getPositionAtTime(
  audioData: ChapterAudio,
  currentTime: number
): { verseNumber: number | null; wordIndex: number | null } {
  let lastSpokenWord: { verseNumber: number; wordIndex: number } | null = null;

  for (const verse of audioData.verses) {
    if (currentTime >= verse.startTime && currentTime <= verse.endTime) {
      // Find current word within verse
      for (const word of verse.words) {
        if (currentTime >= word.startTime && currentTime <= word.endTime) {
          // Currently speaking this word
          return {
            verseNumber: verse.verseNumber,
            wordIndex: word.wordIndex,
          };
        }
        if (currentTime > word.endTime) {
          // This word has finished, track it as last spoken
          lastSpokenWord = {
            verseNumber: verse.verseNumber,
            wordIndex: word.wordIndex,
          };
        }
      }
      // Between words in this verse - return last spoken word
      return lastSpokenWord || {
        verseNumber: verse.verseNumber,
        wordIndex: null,
      };
    }
    // Track the last word of this verse if we've passed it
    if (currentTime > verse.endTime && verse.words.length > 0) {
      const lastWord = verse.words[verse.words.length - 1];
      lastSpokenWord = {
        verseNumber: verse.verseNumber,
        wordIndex: lastWord.wordIndex,
      };
    }
  }

  // Between verses or after all verses - return last spoken word
  return lastSpokenWord || { verseNumber: null, wordIndex: null };
}

/**
 * Get the word text, pinyin, and definition for display in the audio bar
 */
export function getWordAtPosition(
  bookId: string,
  chapter: number,
  verseNumber: number,
  wordIndex: number
): { word: string; pinyin: string; definition?: string } | null {
  const cacheKey = getCacheKey(bookId, chapter);
  const wordDataMap = rawWordCache.get(cacheKey);
  if (!wordDataMap) return null;

  const wordKey = `${verseNumber}-${wordIndex}`;
  return wordDataMap.get(wordKey) || null;
}

/**
 * Get the audio file URL for a chapter
 * Includes cache-busting version parameter
 * Supports external audio hosting via VITE_AUDIO_BASE_URL
 */
export function getAudioUrl(bookId: string, chapter: number): string {
  const version = 5; // Increment when audio files are regenerated
  return getConfigAudioUrl(bookId, chapter, version);
}
