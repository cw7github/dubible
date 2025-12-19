import { useState, useEffect } from 'react';
import { getMusicMetadataUrl, getMusicUrl } from '../config/audio';

/**
 * Music section metadata structure
 * Stored in public/audio/{book}/music/metadata.json
 */
interface MusicSection {
  id?: string;           // e.g., "section-1", "intro", "contemplative"
  name?: string;         // Alternative to id (used by generate-ambient-music.ts)
  file: string;         // e.g., "intro.mp3", "section-1.mp3"
  chapterStart?: number; // First chapter using this music
  chapterEnd?: number;   // Last chapter using this music
  chapters?: number[];   // Alternative: array of chapters (used by generate-ambient-music.ts)
  mood?: string;        // e.g., "peaceful", "dramatic", "celebratory"
  description?: string; // e.g., "Opening narrative music"
  durationMs?: number;  // Duration in milliseconds
}

interface MusicMetadata {
  bookId: string;
  sections: MusicSection[];
  defaultSection?: string; // Fallback section ID if no match found
}

interface UseAmbientMusicReturn {
  musicPath: string | null;        // Full path to music file
  isLoading: boolean;
  error: Error | null;
  mood?: string;
  description?: string;
}

/**
 * Cache for music metadata to avoid repeated fetches
 */
const metadataCache = new Map<string, MusicMetadata | null>();
const loadingPromises = new Map<string, Promise<MusicMetadata | null>>();

/**
 * Load music metadata for a book
 */
async function loadMusicMetadata(bookId: string): Promise<MusicMetadata | null> {
  const cacheKey = bookId;

  // Return cached data if available
  if (metadataCache.has(cacheKey)) {
    return metadataCache.get(cacheKey) || null;
  }

  // Return existing promise if already loading
  if (loadingPromises.has(cacheKey)) {
    return loadingPromises.get(cacheKey)!;
  }

  // Load from JSON file
  const loadPromise = (async () => {
    try {
      const metadataUrl = getMusicMetadataUrl(bookId);
      console.log(`[AmbientMusic] Loading music metadata from: ${metadataUrl}`);
      const response = await fetch(metadataUrl);

      if (!response.ok) {
        console.log(`[AmbientMusic] Music metadata not available (${response.status}): ${metadataUrl}`);
        metadataCache.set(cacheKey, null);
        return null;
      }

      const metadata: MusicMetadata = await response.json();
      console.log(`[AmbientMusic] Successfully loaded music metadata for ${bookId}:`, {
        sections: metadata.sections.length,
        defaultSection: metadata.defaultSection,
      });

      metadataCache.set(cacheKey, metadata);
      return metadata;
    } catch (error) {
      console.warn(`[AmbientMusic] Failed to load music metadata for ${bookId}:`, error);
      metadataCache.set(cacheKey, null);
      return null;
    } finally {
      loadingPromises.delete(cacheKey);
    }
  })();

  loadingPromises.set(cacheKey, loadPromise);
  return loadPromise;
}

/**
 * Check if a section includes a given chapter
 */
function sectionIncludesChapter(section: MusicSection, chapter: number): boolean {
  // Handle chapters array format (used by generate-ambient-music.ts)
  if (section.chapters && Array.isArray(section.chapters)) {
    return section.chapters.includes(chapter);
  }
  // Handle chapterStart/chapterEnd format
  if (section.chapterStart !== undefined && section.chapterEnd !== undefined) {
    return chapter >= section.chapterStart && chapter <= section.chapterEnd;
  }
  return false;
}

/**
 * Find the appropriate music section for a given chapter
 */
function findMusicSection(
  metadata: MusicMetadata,
  chapter: number
): MusicSection | null {
  // Find section that includes this chapter
  const section = metadata.sections.find(
    (s) => sectionIncludesChapter(s, chapter)
  );

  if (section) {
    return section;
  }

  // If no match and there's a default section, use it
  if (metadata.defaultSection) {
    const defaultSection = metadata.sections.find(
      (s) => (s.id || s.name) === metadata.defaultSection
    );
    if (defaultSection) {
      console.log(
        `[AmbientMusic] Using default section "${defaultSection.id || defaultSection.name}" for chapter ${chapter}`
      );
      return defaultSection;
    }
  }

  // No section found
  console.log(`[AmbientMusic] No music section found for chapter ${chapter}`);
  return null;
}

/**
 * Hook to get ambient music for a specific book and chapter
 *
 * Returns the music file path based on the chapter's section in the book.
 * Music metadata is stored per book in public/audio/{book}/music/metadata.json
 *
 * @param bookId - The book identifier (e.g., "matthew", "john")
 * @param chapter - The chapter number
 * @param enabled - Whether ambient music is enabled (default: true)
 * @returns Music path, loading state, and error if any
 *
 * @example
 * ```tsx
 * const { musicPath, isLoading } = useAmbientMusic('matthew', 5);
 * if (musicPath) {
 *   audioMixer.setMusicSrc(musicPath);
 * }
 * ```
 */
export function useAmbientMusic(
  bookId: string,
  chapter: number,
  enabled: boolean = true
): UseAmbientMusicReturn {
  const [musicPath, setMusicPath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [mood, setMood] = useState<string | undefined>(undefined);
  const [description, setDescription] = useState<string | undefined>(undefined);

  useEffect(() => {
    // Reset state when inputs change
    setMusicPath(null);
    setIsLoading(true);
    setError(null);
    setMood(undefined);
    setDescription(undefined);

    // If not enabled, return early
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const loadMusic = async () => {
      try {
        // Load metadata for this book
        const metadata = await loadMusicMetadata(bookId);
        if (cancelled) return;

        if (!metadata) {
          // No music available for this book
          setIsLoading(false);
          return;
        }

        // Find the section for this chapter
        const section = findMusicSection(metadata, chapter);
        if (cancelled) return;

        if (!section) {
          // No section found for this chapter
          setIsLoading(false);
          return;
        }

        // Construct the full path to the music file
        const fullPath = getMusicUrl(bookId, section.file);
        console.log(
          `[AmbientMusic] Selected music for ${bookId} chapter ${chapter}: ${section.id || section.name} (${fullPath})`
        );

        setMusicPath(fullPath);
        setMood(section.mood);
        setDescription(section.description);
        setIsLoading(false);
      } catch (err) {
        if (cancelled) return;
        const error = err instanceof Error ? err : new Error('Unknown error');
        console.error('[AmbientMusic] Error loading music:', error);
        setError(error);
        setIsLoading(false);
      }
    };

    loadMusic();

    return () => {
      cancelled = true;
    };
  }, [bookId, chapter, enabled]);

  return {
    musicPath,
    isLoading,
    error,
    mood,
    description,
  };
}
