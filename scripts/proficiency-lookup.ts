/**
 * Proficiency Lookup Module
 *
 * Provides HSK and TOCFL level lookups for Chinese words.
 * Sources:
 * - HSK: https://github.com/drkameleon/complete-hsk-vocabulary
 * - TOCFL: https://github.com/PSeitz/tocfl
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface HSKEntry {
  simplified: string;
  forms: Array<{
    traditional: string;
    transcriptions: {
      pinyin: string;
    };
  }>;
}

interface TOCFLEntry {
  text: string;
  text_alt: string[];
  tocfl_level: number;
  pinyin: string;
}

export interface ProficiencyInfo {
  hskLevel?: number;      // 1-6 (classic HSK)
  tocflLevel?: number;    // 1-7 (TOCFL bands)
  /** Combined level for filtering (1=easiest, 10=hardest/unknown) */
  combinedLevel: number;
}

// Lookup maps
let hskTraditionalMap: Map<string, number> = new Map();
let hskSimplifiedMap: Map<string, number> = new Map();
let tocflMap: Map<string, number> = new Map();
let initialized = false;

/**
 * Initialize the proficiency lookup tables
 */
export async function initProficiencyLookup(): Promise<void> {
  if (initialized) return;

  const dataDir = path.join(__dirname, 'data');

  // Load HSK data (levels 1-6)
  for (let level = 1; level <= 6; level++) {
    const filePath = path.join(dataDir, `hsk${level}.json`);
    if (fs.existsSync(filePath)) {
      const data: HSKEntry[] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      for (const entry of data) {
        // Map simplified
        if (entry.simplified && !hskSimplifiedMap.has(entry.simplified)) {
          hskSimplifiedMap.set(entry.simplified, level);
        }
        // Map traditional
        if (entry.forms) {
          for (const form of entry.forms) {
            if (form.traditional && !hskTraditionalMap.has(form.traditional)) {
              hskTraditionalMap.set(form.traditional, level);
            }
          }
        }
      }
    }
  }

  // Load TOCFL data
  const tocflPath = path.join(dataDir, 'tocfl_words.json');
  if (fs.existsSync(tocflPath)) {
    const lines = fs.readFileSync(tocflPath, 'utf8').trim().split('\n');
    for (const line of lines) {
      const entry: TOCFLEntry = JSON.parse(line);
      // TOCFL text is already Traditional Chinese
      if (entry.text && !tocflMap.has(entry.text)) {
        tocflMap.set(entry.text, entry.tocfl_level);
      }
      // Also add alternatives
      if (entry.text_alt) {
        for (const alt of entry.text_alt) {
          if (alt && !tocflMap.has(alt)) {
            tocflMap.set(alt, entry.tocfl_level);
          }
        }
      }
    }
  }

  initialized = true;
  console.log(`Proficiency lookup initialized:`);
  console.log(`  HSK Traditional: ${hskTraditionalMap.size} words`);
  console.log(`  HSK Simplified: ${hskSimplifiedMap.size} words`);
  console.log(`  TOCFL: ${tocflMap.size} words`);
}

/**
 * Look up proficiency levels for a Chinese word
 */
export function lookupProficiency(word: string): ProficiencyInfo {
  if (!initialized) {
    throw new Error('Proficiency lookup not initialized. Call initProficiencyLookup() first.');
  }

  // Try traditional first (most common in this app), then simplified
  const hskLevel = hskTraditionalMap.get(word) ?? hskSimplifiedMap.get(word);
  const tocflLevel = tocflMap.get(word);

  // Calculate combined level (1-10 scale)
  // Lower = easier/more common, Higher = harder/rarer
  let combinedLevel: number;

  if (hskLevel !== undefined && tocflLevel !== undefined) {
    // Both available: average them (HSK 1-6, TOCFL 1-7)
    // Normalize HSK to ~7 scale: HSK level * 1.17
    const normalizedHsk = hskLevel * 1.17;
    combinedLevel = Math.round((normalizedHsk + tocflLevel) / 2);
  } else if (hskLevel !== undefined) {
    // Only HSK: scale to ~7
    combinedLevel = Math.round(hskLevel * 1.17);
  } else if (tocflLevel !== undefined) {
    // Only TOCFL
    combinedLevel = tocflLevel;
  } else {
    // Unknown word - assume advanced/rare
    combinedLevel = 8;
  }

  // Clamp to 1-10
  combinedLevel = Math.max(1, Math.min(10, combinedLevel));

  return {
    hskLevel,
    tocflLevel,
    combinedLevel,
  };
}

/**
 * Get frequency category based on proficiency levels
 */
export function getFrequencyFromProficiency(word: string): 'common' | 'uncommon' | 'rare' | undefined {
  const info = lookupProficiency(word);

  // If we have proficiency data, categorize based on combined level
  if (info.hskLevel !== undefined || info.tocflLevel !== undefined) {
    if (info.combinedLevel <= 2) return 'common';
    if (info.combinedLevel <= 4) return 'common';  // Still relatively common
    if (info.combinedLevel <= 6) return 'uncommon';
    return 'rare';
  }

  // No proficiency data - return undefined to let other logic handle it
  return undefined;
}

/**
 * Check if word should show pinyin at given level
 * This is for use during preprocessing to determine pinyin display
 */
export function shouldShowPinyinForLevel(
  word: string,
  displayLevel: 'all' | 'hsk2+' | 'hsk4+' | 'hsk5+' | 'hsk6+' | 'none'
): boolean {
  if (displayLevel === 'all') return true;
  if (displayLevel === 'none') return false;

  const info = lookupProficiency(word);

  // Extract threshold from level string
  const thresholdMap: Record<string, number> = {
    'hsk2+': 2,
    'hsk4+': 4,
    'hsk5+': 5,
    'hsk6+': 6,
  };
  const threshold = thresholdMap[displayLevel] ?? 1;

  // Use combined level for comparison
  // Show pinyin if word is at or above the threshold
  return info.combinedLevel >= threshold;
}

// For testing
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  initProficiencyLookup().then(() => {
    const testWords = [
      '的', '是', '我', '你', '他',  // Very common
      '愛', '看見', '說',           // Common
      '耶穌', '福音', '救恩',       // Biblical (likely not in HSK/TOCFL)
      '哀慟', '逼迫', '虛心',       // Less common
      '榮耀', '聖靈', '恩典',       // Biblical terms
    ];

    console.log('\nTest lookups:');
    for (const word of testWords) {
      const info = lookupProficiency(word);
      const freq = getFrequencyFromProficiency(word);
      console.log(`  ${word}: HSK=${info.hskLevel ?? '-'}, TOCFL=${info.tocflLevel ?? '-'}, combined=${info.combinedLevel}, freq=${freq ?? 'unknown'}`);
    }
  });
}
