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
    description: 'Hide pinyin for basic words (HSK 1)',
    minHskToShow: 2,
  },
  {
    value: 'hsk4+',
    label: { chinese: '中级', english: 'Intermediate', pinyin: 'zhōngjí' },
    description: 'Hide pinyin for common words (HSK 1-3)',
    minHskToShow: 4,
  },
  {
    value: 'hsk5+',
    label: { chinese: '中高级', english: 'Upper-Intermediate', pinyin: 'zhōnggāojí' },
    description: 'Hide pinyin for most words (HSK 1-4)',
    minHskToShow: 5,
  },
  {
    value: 'hsk6+',
    label: { chinese: '高级', english: 'Advanced', pinyin: 'gāojí' },
    description: 'Show pinyin only for rare words (HSK 6+)',
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
  chineseVersion: 'cuv',
  englishVersion: 'kjv',
  audioSpeed: 1,
  lastReadingPosition: null,
};

// Helper function to determine if pinyin should be shown for a word
export function shouldShowPinyin(pinyinLevel: PinyinLevel, hskLevel?: number): boolean {
  if (pinyinLevel === 'all') return true;
  if (pinyinLevel === 'none') return false;

  // Get the minimum HSK level required to show pinyin
  const levelConfig = PINYIN_LEVELS.find(l => l.value === pinyinLevel);
  if (!levelConfig || levelConfig.minHskToShow === null) return true;

  // Words without HSK level are considered rare/advanced - always show pinyin unless 'none'
  if (hskLevel === undefined) return true;

  // Show pinyin only if the word's HSK level meets the threshold
  return hskLevel >= levelConfig.minHskToShow;
}
