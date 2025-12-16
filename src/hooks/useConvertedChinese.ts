/**
 * Hook for converting Chinese text based on character set settings
 *
 * Automatically converts text from Traditional to Simplified Chinese
 * based on the user's characterSet preference in settings.
 */

import { useMemo } from 'react';
import { useSettingsStore } from '../stores';
import { convertCharacters } from '../utils/characterConversion';

/**
 * Convert a single Chinese text string based on current character set setting
 * @param text - The Chinese text to convert (stored as Traditional)
 * @returns The converted text (Simplified if setting is 'simplified', otherwise Traditional)
 */
export function useConvertedChinese(text: string): string {
  const characterSet = useSettingsStore((state) => state.characterSet);

  return useMemo(() => {
    if (!text) return text;
    return convertCharacters(text, characterSet);
  }, [text, characterSet]);
}

/**
 * Convert a book name object based on current character set setting
 * @param name - The book name object with chinese, english, pinyin
 * @returns The name object with chinese converted
 */
export function useConvertedBookName(name: {
  chinese: string;
  english: string;
  pinyin: string;
}): {
  chinese: string;
  english: string;
  pinyin: string;
} {
  const characterSet = useSettingsStore((state) => state.characterSet);

  return useMemo(() => ({
    chinese: convertCharacters(name.chinese, characterSet),
    english: name.english,
    pinyin: name.pinyin,
  }), [name.chinese, name.english, name.pinyin, characterSet]);
}

/**
 * Get the current character set setting
 * Useful for components that need to convert multiple texts
 */
export function useCharacterSet() {
  return useSettingsStore((state) => state.characterSet);
}
