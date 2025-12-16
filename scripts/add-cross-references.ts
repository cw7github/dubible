/**
 * Add Cross-References to Preprocessed Data
 *
 * Fetches raw text from FHL API and extracts cross-references
 * into the preprocessed JSON files.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chinese book abbreviation to bookId mapping
const BOOK_ABBREV_MAP: Record<string, string> = {
  // Old Testament
  '創': 'genesis', '出': 'exodus', '利': 'leviticus', '民': 'numbers', '申': 'deuteronomy',
  '書': 'joshua', '士': 'judges', '得': 'ruth', '撒上': '1samuel', '撒下': '2samuel',
  '王上': '1kings', '王下': '2kings', '代上': '1chronicles', '代下': '2chronicles',
  '拉': 'ezra', '尼': 'nehemiah', '斯': 'esther', '伯': 'job', '詩': 'psalms',
  '箴': 'proverbs', '傳': 'ecclesiastes', '歌': 'songofsolomon', '賽': 'isaiah',
  '耶': 'jeremiah', '哀': 'lamentations', '結': 'ezekiel', '但': 'daniel',
  '何': 'hosea', '珥': 'joel', '摩': 'amos', '俄': 'obadiah', '拿': 'jonah',
  '彌': 'micah', '鴻': 'nahum', '哈': 'habakkuk', '番': 'zephaniah',
  '該': 'haggai', '亞': 'zechariah', '瑪': 'malachi',
  // New Testament
  '太': 'matthew', '可': 'mark', '路': 'luke', '約': 'john', '徒': 'acts',
  '羅': 'romans', '林前': '1corinthians', '林後': '2corinthians', '加': 'galatians',
  '弗': 'ephesians', '腓': 'philippians', '西': 'colossians',
  '帖前': '1thessalonians', '帖後': '2thessalonians',
  '提前': '1timothy', '提後': '2timothy', '多': 'titus', '門': 'philemon',
  '來': 'hebrews', '雅': 'james', '彼前': '1peter', '彼後': '2peter',
  '約一': '1john', '約二': '2john', '約三': '3john', '猶': 'jude', '啟': 'revelation',
};

// FHL API book abbreviation mapping (Chinese abbreviation used in API)
const BOOK_FHL_ABBREV: Record<string, string> = {
  'genesis': '創', 'exodus': '出', 'leviticus': '利', 'numbers': '民', 'deuteronomy': '申',
  'joshua': '書', 'judges': '士', 'ruth': '得', '1samuel': '撒上', '2samuel': '撒下',
  '1kings': '王上', '2kings': '王下', '1chronicles': '代上', '2chronicles': '代下',
  'ezra': '拉', 'nehemiah': '尼', 'esther': '斯', 'job': '伯', 'psalms': '詩',
  'proverbs': '箴', 'ecclesiastes': '傳', 'songofsolomon': '歌', 'isaiah': '賽',
  'jeremiah': '耶', 'lamentations': '哀', 'ezekiel': '結', 'daniel': '但',
  'hosea': '何', 'joel': '珥', 'amos': '摩', 'obadiah': '俄', 'jonah': '拿',
  'micah': '彌', 'nahum': '鴻', 'habakkuk': '哈', 'zephaniah': '番',
  'haggai': '該', 'zechariah': '亞', 'malachi': '瑪',
  'matthew': '太', 'mark': '可', 'luke': '路', 'john': '約', 'acts': '徒',
  'romans': '羅', '1corinthians': '林前', '2corinthians': '林後', 'galatians': '加',
  'ephesians': '弗', 'philippians': '腓', 'colossians': '西',
  '1thessalonians': '帖前', '2thessalonians': '帖後',
  '1timothy': '提前', '2timothy': '提後', 'titus': '多', 'philemon': '門',
  'hebrews': '來', 'james': '雅', '1peter': '彼前', '2peter': '彼後',
  '1john': '約一', '2john': '約二', '3john': '約三', 'jude': '猶', 'revelation': '啟',
};

interface CrossReference {
  bookId: string;
  bookAbbrev: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
  displayText: string;
}

// Extract cross-references from text like "（路3:23~38。參得4:18~22；代上3:10~17）"
function extractCrossReferences(text: string): CrossReference[] {
  const refs: CrossReference[] = [];

  // Match content inside parentheses that contains cross-references
  const parenMatch = text.match(/[（(]([^）)]+)[）)]/);
  if (!parenMatch) return refs;

  const content = parenMatch[1];

  // Split by separators (。；, etc.)
  const parts = content.split(/[。；，,\s]+/).filter(Boolean);

  for (const part of parts) {
    // Skip "參" prefix
    const cleanPart = part.replace(/^參/, '').trim();
    if (!cleanPart) continue;

    // Match pattern: BookAbbrev + Chapter:VerseStart~VerseEnd or Chapter:Verse
    // Examples: 路3:23~38, 得4:18~22, 代上3:10~17
    const refMatch = cleanPart.match(/^([^0-9]+)(\d+)[:：](\d+)(?:[~～](\d+))?/);
    if (!refMatch) continue;

    const [, abbrev, chapter, verseStart, verseEnd] = refMatch;
    const bookId = BOOK_ABBREV_MAP[abbrev.trim()];

    if (bookId) {
      refs.push({
        bookId,
        bookAbbrev: abbrev.trim(),
        chapter: parseInt(chapter, 10),
        verseStart: parseInt(verseStart, 10),
        verseEnd: verseEnd ? parseInt(verseEnd, 10) : undefined,
        displayText: cleanPart,
      });
    }
  }

  return refs;
}

// Fetch raw verse text from FHL API
async function fetchRawVerse(bookId: string, chapter: number, verse: number): Promise<string | null> {
  const abbrev = BOOK_FHL_ABBREV[bookId];
  if (!abbrev) return null;

  const url = `https://bible.fhl.net/json/qb.php?chineses=${encodeURIComponent(abbrev)}&chap=${chapter}&sec=${verse}&version=ncv&gb=0`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    if (data.record && data.record[0]) {
      return data.record[0].bible_text || null;
    }
  } catch (e) {
    // Silently fail
  }
  return null;
}

// Process a single chapter file
async function processChapter(filePath: string): Promise<{ modified: boolean; refsAdded: number }> {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  let modified = false;
  let refsAdded = 0;

  for (const verse of data.verses) {
    // Fetch raw text from FHL API
    const rawText = await fetchRawVerse(data.bookId, data.chapter, verse.number);
    if (!rawText) continue;

    // Extract cross-references
    const refs = extractCrossReferences(rawText);
    if (refs.length > 0) {
      verse.crossReferences = refs;
      modified = true;
      refsAdded += refs.length;
    }

    // Small delay to be nice to the API
    await new Promise(r => setTimeout(r, 50));
  }

  if (modified) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  return { modified, refsAdded };
}

// Main
async function main() {
  const args = process.argv.slice(2);
  let bookId: string | null = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--book' && args[i + 1]) {
      bookId = args[i + 1].toLowerCase();
      i++;
    }
  }

  const preprocessedDir = path.join(__dirname, '../public/data/preprocessed');

  if (bookId) {
    // Process single book
    const bookDir = path.join(preprocessedDir, bookId);
    if (!fs.existsSync(bookDir)) {
      console.error(`Book not found: ${bookId}`);
      process.exit(1);
    }

    const chapters = fs.readdirSync(bookDir)
      .filter(f => f.startsWith('chapter-') && f.endsWith('.json'))
      .sort((a, b) => {
        const numA = parseInt(a.match(/chapter-(\d+)/)?.[1] || '0');
        const numB = parseInt(b.match(/chapter-(\d+)/)?.[1] || '0');
        return numA - numB;
      });

    console.log(`Processing ${bookId} (${chapters.length} chapters)...`);

    let totalRefs = 0;
    for (const chapterFile of chapters) {
      const filePath = path.join(bookDir, chapterFile);
      const { modified, refsAdded } = await processChapter(filePath);
      if (modified) {
        console.log(`  ${chapterFile}: +${refsAdded} cross-references`);
        totalRefs += refsAdded;
      }
    }

    console.log(`\nDone! Added ${totalRefs} cross-references to ${bookId}`);
  } else {
    console.log('Usage: npx tsx scripts/add-cross-references.ts --book matthew');
  }
}

main().catch(console.error);
