/**
 * Maps Bible book IDs to their category graphics
 * Used to display appropriate category icon on chapter 1 of each book
 */

export type BookCategory =
  | 'torah'
  | 'historical'
  | 'wisdom'
  | 'major-prophets'
  | 'minor-prophets'
  | 'gospels'
  | 'epistles'
  | 'revelation';

export const BOOK_CATEGORIES: Record<string, BookCategory> = {
  // Torah / Pentateuch (Law)
  genesis: 'torah',
  exodus: 'torah',
  leviticus: 'torah',
  numbers: 'torah',
  deuteronomy: 'torah',

  // Historical Books
  joshua: 'historical',
  judges: 'historical',
  ruth: 'historical',
  '1samuel': 'historical',
  '2samuel': 'historical',
  '1kings': 'historical',
  '2kings': 'historical',
  '1chronicles': 'historical',
  '2chronicles': 'historical',
  ezra: 'historical',
  nehemiah: 'historical',
  esther: 'historical',

  // Wisdom Literature / Poetry
  job: 'wisdom',
  psalms: 'wisdom',
  proverbs: 'wisdom',
  ecclesiastes: 'wisdom',
  songofsolomon: 'wisdom',

  // Major Prophets
  isaiah: 'major-prophets',
  jeremiah: 'major-prophets',
  lamentations: 'major-prophets',
  ezekiel: 'major-prophets',
  daniel: 'major-prophets',

  // Minor Prophets
  hosea: 'minor-prophets',
  joel: 'minor-prophets',
  amos: 'minor-prophets',
  obadiah: 'minor-prophets',
  jonah: 'minor-prophets',
  micah: 'minor-prophets',
  nahum: 'minor-prophets',
  habakkuk: 'minor-prophets',
  zephaniah: 'minor-prophets',
  haggai: 'minor-prophets',
  zechariah: 'minor-prophets',
  malachi: 'minor-prophets',

  // Gospels
  matthew: 'gospels',
  mark: 'gospels',
  luke: 'gospels',
  john: 'gospels',

  // Epistles (includes Acts and general epistles)
  acts: 'epistles',
  romans: 'epistles',
  '1corinthians': 'epistles',
  '2corinthians': 'epistles',
  galatians: 'epistles',
  ephesians: 'epistles',
  philippians: 'epistles',
  colossians: 'epistles',
  '1thessalonians': 'epistles',
  '2thessalonians': 'epistles',
  '1timothy': 'epistles',
  '2timothy': 'epistles',
  titus: 'epistles',
  philemon: 'epistles',
  hebrews: 'epistles',
  james: 'epistles',
  '1peter': 'epistles',
  '2peter': 'epistles',
  '1john': 'epistles',
  '2john': 'epistles',
  '3john': 'epistles',
  jude: 'epistles',

  // Revelation (Apocalyptic)
  revelation: 'revelation',
};

/**
 * Get the category for a given book ID
 */
export function getBookCategory(bookId: string): BookCategory | undefined {
  return BOOK_CATEGORIES[bookId.toLowerCase()];
}

/**
 * Get all book IDs in a category
 */
export function getBooksInCategory(category: BookCategory): string[] {
  return Object.entries(BOOK_CATEGORIES)
    .filter(([, cat]) => cat === category)
    .map(([bookId]) => bookId);
}
