// Character conversion utilities for Traditional ↔ Simplified Chinese
import * as OpenCC from 'opencc-js';
import type { CharacterSet } from '../types';

// Create converters (lazy initialization)
let t2sConverter: ReturnType<typeof OpenCC.Converter> | null = null;
let s2tConverter: ReturnType<typeof OpenCC.Converter> | null = null;

// Global conversion cache - shared across all components.
// Keyed by `${targetSet}:${text}` so the same input can be cached for both directions.
// Uses Map for O(1) lookup, limited size to prevent memory bloat.
const conversionCache = new Map<string, string>();
const MAX_CACHE_SIZE = 5000; // Limit cache entries

function getT2SConverter() {
  if (!t2sConverter) {
    t2sConverter = OpenCC.Converter({ from: 'tw', to: 'cn' });
  }
  return t2sConverter;
}

function getS2TConverter() {
  if (!s2tConverter) {
    s2tConverter = OpenCC.Converter({ from: 'cn', to: 'tw' });
  }
  return s2tConverter;
}

/**
 * Convert Chinese text to the specified character set
 * Uses a global cache for instant repeated lookups
 * The Bible data is stored in Traditional Chinese (Taiwan variant)
 * @param text - The text to convert
 * @param targetSet - The target character set ('traditional' or 'simplified')
 * @returns The converted text
 */
export function convertCharacters(text: string, targetSet: CharacterSet): string {
  if (!text) return text;

  const cacheKey = `${targetSet}:${text}`;

  // Check cache first (O(1) lookup)
  const cached = conversionCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  try {
    const converter = targetSet === 'simplified' ? getT2SConverter() : getS2TConverter();
    const converted = converter(text);

    // Cache the result (with size limit)
    if (conversionCache.size >= MAX_CACHE_SIZE) {
      // Clear oldest entries (first 1000)
      const keysToDelete = Array.from(conversionCache.keys()).slice(0, 1000);
      keysToDelete.forEach(key => conversionCache.delete(key));
    }
    conversionCache.set(cacheKey, converted);

    return converted;
  } catch (error) {
    console.warn('Character conversion failed:', error);
    return text;
  }
}

/**
 * Batch convert multiple texts at once (more efficient for chapters)
 * @param texts - Array of texts to convert
 * @param targetSet - Target character set
 * @returns Array of converted texts
 */
export function convertCharactersBatch(texts: string[], targetSet: CharacterSet): string[] {
  const uncachedIndices: number[] = [];
  const results: string[] = new Array(texts.length);

  // First pass: check cache
  texts.forEach((text, i) => {
    if (!text) {
      results[i] = text;
      return;
    }
    const cacheKey = `${targetSet}:${text}`;
    const cached = conversionCache.get(cacheKey);
    if (cached !== undefined) {
      results[i] = cached;
    } else {
      uncachedIndices.push(i);
    }
  });

  // Convert uncached texts
  if (uncachedIndices.length > 0) {
    const converter = targetSet === 'simplified' ? getT2SConverter() : getS2TConverter();
    uncachedIndices.forEach(i => {
      try {
        const original = texts[i];
        const cacheKey = `${targetSet}:${original}`;
        const converted = converter(original);
        results[i] = converted;
        conversionCache.set(cacheKey, converted);
      } catch {
        results[i] = texts[i];
      }
    });
  }

  return results;
}

/**
 * Convert Traditional Chinese to Simplified Chinese
 */
export function toSimplified(text: string): string {
  if (!text) return text;
  try {
    return getT2SConverter()(text);
  } catch {
    return text;
  }
}

/**
 * Convert Simplified Chinese to Traditional Chinese
 */
export function toTraditional(text: string): string {
  if (!text) return text;
  try {
    return getS2TConverter()(text);
  } catch {
    return text;
  }
}

/**
 * Clear the conversion cache (useful when switching character sets)
 */
export function clearConversionCache(): void {
  conversionCache.clear();
}
