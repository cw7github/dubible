// Settings and preferences types

export type Theme = 'light' | 'sepia' | 'dark';

export type FontFamily = 'serif' | 'sans';

export type TextSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

// Pinyin display levels based on Chinese reading proficiency
// Controls which words show pinyin based on HSK level
export type PinyinLevel =
  | 'all'      // Beginner (初学) - Show pinyin for all characters
  | 'hsk2+'    // Elementary (入门) - Hide HSK 1, show for HSK 2+
  | 'hsk4+'    // Intermediate (中级) - Hide HSK 1-3, show for HSK 4+
  | 'hsk5+'    // Upper-Intermediate (中高级) - Hide HSK 1-4, show for HSK 5+
  | 'hsk6+'    // Advanced (高级) - Hide HSK 1-5, show only HSK 6+ and rare words
  | 'none';    // Fluent (流利) - No pinyin shown

// Legacy type for backwards compatibility
export type PinyinDisplay = 'always' | 'smart' | 'hidden';

// Pinyin level metadata for UI
export const PINYIN_LEVELS: {
  value: PinyinLevel;
  label: { chinese: string; english: string; pinyin: string };
  description: string;
  minHskToShow: number | null; // null = show all, 7 = show none
}[] = [
  {
    value: 'all',
    label: { chinese: '初学', english: 'Beginner', pinyin: 'chūxué' },
    description: 'Show pinyin for all characters',
    minHskToShow: null,
  },
  {
    value: 'hsk2+',
    label: { chinese: '入门', english: 'Elementary', pinyin: 'rùmén' },
    description: 'Hide very basic words (HSK 1, common words)',
    minHskToShow: 2,
  },
  {
    value: 'hsk4+',
    label: { chinese: '中级', english: 'Intermediate', pinyin: 'zhōngjí' },
    description: 'Show pinyin for less common words (HSK 4+, rare/biblical)',
    minHskToShow: 4,
  },
  {
    value: 'hsk5+',
    label: { chinese: '中高级', english: 'Upper-Intermediate', pinyin: 'zhōnggāojí' },
    description: 'Show pinyin for advanced vocabulary (HSK 5+, rare/biblical)',
    minHskToShow: 5,
  },
  {
    value: 'hsk6+',
    label: { chinese: '高级', english: 'Advanced', pinyin: 'gāojí' },
    description: 'Show pinyin only for rare/biblical terms (HSK 6+)',
    minHskToShow: 6,
  },
  {
    value: 'none',
    label: { chinese: '流利', english: 'Fluent', pinyin: 'liúlì' },
    description: 'No pinyin shown',
    minHskToShow: 7, // effectively hide all
  },
];

export type CharacterSet = 'traditional' | 'simplified';

export type AudioSpeed = 0.75 | 1 | 1.25;

export interface Settings {
  // Appearance
  theme: Theme;
  fontFamily: FontFamily;
  textSize: TextSize;

  // Chinese display
  pinyinLevel: PinyinLevel;
  pinyinDisplay: PinyinDisplay; // Legacy - kept for migration
  characterSet: CharacterSet;
  showHskIndicators: boolean;

  // Bible versions
  chineseVersion: string;
  englishVersion: string;

  // Audio
  audioSpeed: AudioSpeed;

  // Reading
  lastReadingPosition: {
    bookId: string;
    chapter: number;
    verse?: number;
    scrollPosition?: number;
  } | null;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'light',
  fontFamily: 'serif',
  textSize: 'md',
  pinyinLevel: 'all',
  pinyinDisplay: 'always', // Legacy
  characterSet: 'traditional',
  showHskIndicators: false,
  chineseVersion: 'cnv',
  englishVersion: 'bsb',
  audioSpeed: 1,
  lastReadingPosition: null,
};

// Helper function to determine if pinyin should be shown for a word
export function shouldShowPinyin(
  pinyinLevel: PinyinLevel,
  hskLevel?: number | null,
  freq?: 'common' | 'uncommon' | 'rare' | 'biblical',
  tocflLevel?: number | null
): boolean {
  if (pinyinLevel === 'all') return true;
  if (pinyinLevel === 'none') return false;

  // Get the minimum HSK level required to show pinyin
  const levelConfig = PINYIN_LEVELS.find(l => l.value === pinyinLevel);
  if (!levelConfig || levelConfig.minHskToShow === null) return true;

  // Calculate effective level from HSK and/or TOCFL
  // HSK 1-6 maps roughly to TOCFL 1-7, so we normalize
  let effectiveLevel: number | null = null;

  if (hskLevel !== undefined && hskLevel !== null) {
    effectiveLevel = hskLevel;
  }

  if (tocflLevel !== undefined && tocflLevel !== null) {
    // TOCFL 1-7 → normalize to HSK-like 1-6 scale: (tocfl - 1) * 6/6 + 1
    const normalizedTocfl = Math.ceil(tocflLevel * (6 / 7));
    if (effectiveLevel !== null) {
      // Average HSK and normalized TOCFL
      effectiveLevel = Math.round((effectiveLevel + normalizedTocfl) / 2);
    } else {
      effectiveLevel = normalizedTocfl;
    }
  }

  // For words with proficiency level (HSK or TOCFL), use level-based filtering
  if (effectiveLevel !== null) {
    return effectiveLevel >= levelConfig.minHskToShow;
  }

  // For words without proficiency level, use frequency-based filtering
  // This handles biblical terms and other words not in HSK/TOCFL systems
  if (freq) {
    switch (pinyinLevel) {
      case 'hsk2+':
        // Elementary: hide only "common" words (like 的, 是, 了)
        return freq !== 'common';
      case 'hsk4+':
        // Intermediate: hide "common" and "uncommon" words
        return freq === 'rare' || freq === 'biblical';
      case 'hsk5+':
        // Upper-Intermediate: show only rare and biblical terms
        return freq === 'rare' || freq === 'biblical';
      case 'hsk6+':
        // Advanced: show only biblical/rare terms
        return freq === 'biblical' || freq === 'rare';
      default:
        return true;
    }
  }

  // Words without proficiency level or freq are considered rare - show at higher levels
  return levelConfig.minHskToShow >= 4;
}
