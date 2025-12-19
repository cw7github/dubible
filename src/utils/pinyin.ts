// Pinyin utility functions

// Split pinyin string into syllables matching the number of Chinese characters
export function splitPinyinSyllables(pinyin: string, charCount: number): string[] {
  if (!pinyin || charCount === 0) return [];
  if (charCount === 1) return [pinyin];

  const cleanPinyin = pinyin.trim();

  // First, check if apostrophes are present - they explicitly mark syllable boundaries
  // Apostrophes are used in pinyin to separate syllables (e.g., "cí'ài" for 慈愛)
  if (cleanPinyin.includes("'")) {
    const apostropheSplit = cleanPinyin.split("'");
    if (apostropheSplit.length === charCount) {
      return apostropheSplit;
    }
  }

  // Try to split by spaces (some pinyin might be space-separated)
  const spaceSplit = cleanPinyin.split(/\s+/);
  if (spaceSplit.length === charCount) {
    return spaceSplit;
  }

  // Remove apostrophes for regex matching (they are syllable separators, not part of syllables)
  const pinyinWithoutApostrophes = cleanPinyin.replace(/'/g, ' ');

  // Regex pattern to match pinyin syllables
  // Handles initials, finals, tone marks (āáǎà) and tone numbers (1-4)
  const tempRegex = /([bpmfdtnlgkhjqxrzcsyw]?h?[iuüāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜaeiou]+(?:ng|n|r)?[1-4]?)/gi;

  const matches: string[] = [];
  let match;
  while ((match = tempRegex.exec(pinyinWithoutApostrophes)) !== null) {
    matches.push(match[1]);
  }

  if (matches.length === charCount) {
    return matches;
  }

  // If regex didn't match correctly, try intelligent splitting
  if (matches.length > 0 && matches.length !== charCount) {
    if (matches.length > charCount) {
      // More syllables than characters - combine adjacent ones
      const combined: string[] = [];
      const ratio = matches.length / charCount;
      for (let i = 0; i < charCount; i++) {
        const startIdx = Math.floor(i * ratio);
        const endIdx = Math.floor((i + 1) * ratio);
        combined.push(matches.slice(startIdx, endIdx).join(''));
      }
      return combined;
    }
  }

  // Ultimate fallback: divide string evenly by character positions
  // Try to find natural break points (after tone marks or at reasonable positions)
  const avgLen = cleanPinyin.length / charCount;
  const result: string[] = [];

  for (let i = 0; i < charCount; i++) {
    const start = Math.round(i * avgLen);
    const end = i === charCount - 1 ? cleanPinyin.length : Math.round((i + 1) * avgLen);
    if (start < cleanPinyin.length) {
      result.push(cleanPinyin.slice(start, end));
    }
  }

  return result.length === charCount ? result : [cleanPinyin];
}

// Split Chinese characters into individual characters
// Filters out whitespace characters (including full-width spaces U+3000)
export function splitChineseCharacters(text: string): string[] {
  return [...text].filter(char => !/\s/.test(char));
}
