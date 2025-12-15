// 信望愛 Bible API Service - CNV (新譯本)
// API Documentation: https://bible.fhl.net/json/

// Book ID to 信望愛 Chinese abbreviation mapping
const BOOK_ABBREVIATIONS: Record<string, string> = {
  // Old Testament
  genesis: '創',
  exodus: '出',
  leviticus: '利',
  numbers: '民',
  deuteronomy: '申',
  joshua: '書',
  judges: '士',
  ruth: '得',
  '1samuel': '撒上',
  '2samuel': '撒下',
  '1kings': '王上',
  '2kings': '王下',
  '1chronicles': '代上',
  '2chronicles': '代下',
  ezra: '拉',
  nehemiah: '尼',
  esther: '斯',
  job: '伯',
  psalms: '詩',
  proverbs: '箴',
  ecclesiastes: '傳',
  songofsolomon: '歌',
  isaiah: '賽',
  jeremiah: '耶',
  lamentations: '哀',
  ezekiel: '結',
  daniel: '但',
  hosea: '何',
  joel: '珥',
  amos: '摩',
  obadiah: '俄',
  jonah: '拿',
  micah: '彌',
  nahum: '鴻',
  habakkuk: '哈',
  zephaniah: '番',
  haggai: '該',
  zechariah: '亞',
  malachi: '瑪',
  // New Testament
  matthew: '太',
  mark: '可',
  luke: '路',
  john: '約',
  acts: '徒',
  romans: '羅',
  '1corinthians': '林前',
  '2corinthians': '林後',
  galatians: '加',
  ephesians: '弗',
  philippians: '腓',
  colossians: '西',
  '1thessalonians': '帖前',
  '2thessalonians': '帖後',
  '1timothy': '提前',
  '2timothy': '提後',
  titus: '多',
  philemon: '門',
  hebrews: '來',
  james: '雅',
  '1peter': '彼前',
  '2peter': '彼後',
  '1john': '約一',
  '2john': '約二',
  '3john': '約三',
  jude: '猶',
  revelation: '啟',
};

export interface FHLVerseRecord {
  engs: string;
  chineses: string;
  chap: number;
  sec: number;
  bible_text: string;
}

export interface FHLApiResponse {
  status: string;
  record_count: number;
  version: string;
  record: FHLVerseRecord[];
  prev?: string;
  next?: string;
}

// Use proxy in development to avoid CORS, direct API in production
const API_BASE = import.meta.env.DEV
  ? '/api/bible'
  : 'https://bible.fhl.net/json';
const VERSION = 'ncv'; // CNV 新譯本

/**
 * Fetch a chapter from 信望愛 API
 */
export async function fetchChapter(
  bookId: string,
  chapter: number
): Promise<FHLVerseRecord[]> {
  const chineseAbbrev = BOOK_ABBREVIATIONS[bookId];
  if (!chineseAbbrev) {
    throw new Error(`Unknown book ID: ${bookId}`);
  }

  const url = `${API_BASE}/qb.php?chineses=${encodeURIComponent(chineseAbbrev)}&chap=${chapter}&version=${VERSION}&gb=0`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  const data: FHLApiResponse = await response.json();

  if (data.status !== 'success') {
    throw new Error(`API returned error status: ${data.status}`);
  }

  return data.record || [];
}

/**
 * Fetch a range of verses from 信望愛 API
 */
export async function fetchVerseRange(
  bookId: string,
  chapter: number,
  startVerse: number,
  endVerse: number
): Promise<FHLVerseRecord[]> {
  const chineseAbbrev = BOOK_ABBREVIATIONS[bookId];
  if (!chineseAbbrev) {
    throw new Error(`Unknown book ID: ${bookId}`);
  }

  const url = `${API_BASE}/qb.php?chineses=${encodeURIComponent(chineseAbbrev)}&chap=${chapter}&sec=${startVerse}-${endVerse}&version=${VERSION}&gb=0`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  const data: FHLApiResponse = await response.json();

  if (data.status !== 'success') {
    throw new Error(`API returned error status: ${data.status}`);
  }

  return data.record || [];
}

/**
 * Get the Chinese abbreviation for a book
 */
export function getChineseAbbreviation(bookId: string): string | undefined {
  return BOOK_ABBREVIATIONS[bookId];
}

/**
 * Check if API is available
 */
export async function checkApiAvailability(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/ab.php`, {
      method: 'HEAD',
    });
    return response.ok;
  } catch {
    return false;
  }
}
