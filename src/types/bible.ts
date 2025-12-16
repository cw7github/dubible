// Bible data types

// Cross-reference to another passage
export interface CrossReference {
  bookId: string;
  bookAbbrev: string;  // Chinese abbreviation (路, 太, etc.)
  chapter: number;
  verseStart: number;
  verseEnd?: number;   // For ranges like 3:23~38
  displayText: string; // Original text like "路3:23~38"
}

export interface Verse {
  number: number;
  text: string;
  // Segmented words with pinyin and definitions
  words?: SegmentedWord[];
  // Cross-references to other passages
  crossReferences?: CrossReference[];
}

export interface CharacterBreakdown {
  c: string;  // Character
  m: string;  // Meaning
}

export interface SegmentedWord {
  chinese: string;
  pinyin: string;
  definition?: string;
  partOfSpeech?: string;          // Part of speech code: n, v, adj, adv, prep, conj, part, mw, pron, num, prop
  hskLevel?: number | null;       // HSK proficiency level (1-6)
  tocflLevel?: number | null;     // TOCFL proficiency level (1-7)
  // Enhanced fields from preprocessing
  isName?: boolean;
  nameType?: 'person' | 'place' | 'group';
  breakdown?: CharacterBreakdown[];  // Character-by-character meaning
  freq?: 'common' | 'uncommon' | 'rare' | 'biblical';
  note?: string;                  // Usage note or insight
  // Position in verse for highlighting
  startIndex: number;
  endIndex: number;
}

export interface Chapter {
  number: number;
  verses: Verse[];
}

export interface Book {
  id: string;
  name: {
    chinese: string;
    english: string;
    pinyin: string;
  };
  testament: 'old' | 'new';
  chapterCount: number;
  chapters?: Chapter[];
}

export interface BibleVersion {
  id: string;
  name: string;
  language: 'chinese' | 'english';
  abbreviation: string;
}

export interface ReadingPosition {
  bookId: string;
  chapter: number;
  verse?: number;
  scrollPosition?: number;
}

export interface VerseReference {
  bookId: string;
  chapter: number;
  verse: number;
}

// For display purposes
export interface DisplayVerse extends Verse {
  bookId: string;
  bookName: {
    chinese: string;
    english: string;
  };
  chapter: number;
  isChapterStart?: boolean;
}
