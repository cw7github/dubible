/**
 * Generate Manifest
 *
 * Scans the preprocessed data directory and generates manifest.json
 * with all available books and chapters.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Book name mappings
const BOOK_NAMES: Record<string, string> = {
  // OT
  'genesis': 'Genesis',
  'exodus': 'Exodus',
  'leviticus': 'Leviticus',
  'numbers': 'Numbers',
  'deuteronomy': 'Deuteronomy',
  'joshua': 'Joshua',
  'judges': 'Judges',
  'ruth': 'Ruth',
  '1samuel': '1 Samuel',
  '2samuel': '2 Samuel',
  '1kings': '1 Kings',
  '2kings': '2 Kings',
  '1chronicles': '1 Chronicles',
  '2chronicles': '2 Chronicles',
  'ezra': 'Ezra',
  'nehemiah': 'Nehemiah',
  'esther': 'Esther',
  'job': 'Job',
  'psalms': 'Psalms',
  'proverbs': 'Proverbs',
  'ecclesiastes': 'Ecclesiastes',
  'songofsolomon': 'Song of Solomon',
  'isaiah': 'Isaiah',
  'jeremiah': 'Jeremiah',
  'lamentations': 'Lamentations',
  'ezekiel': 'Ezekiel',
  'daniel': 'Daniel',
  'hosea': 'Hosea',
  'joel': 'Joel',
  'amos': 'Amos',
  'obadiah': 'Obadiah',
  'jonah': 'Jonah',
  'micah': 'Micah',
  'nahum': 'Nahum',
  'habakkuk': 'Habakkuk',
  'zephaniah': 'Zephaniah',
  'haggai': 'Haggai',
  'zechariah': 'Zechariah',
  'malachi': 'Malachi',
  // NT
  'matthew': 'Matthew',
  'mark': 'Mark',
  'luke': 'Luke',
  'john': 'John',
  'acts': 'Acts',
  'romans': 'Romans',
  '1corinthians': '1 Corinthians',
  '2corinthians': '2 Corinthians',
  'galatians': 'Galatians',
  'ephesians': 'Ephesians',
  'philippians': 'Philippians',
  'colossians': 'Colossians',
  '1thessalonians': '1 Thessalonians',
  '2thessalonians': '2 Thessalonians',
  '1timothy': '1 Timothy',
  '2timothy': '2 Timothy',
  'titus': 'Titus',
  'philemon': 'Philemon',
  'hebrews': 'Hebrews',
  'james': 'James',
  '1peter': '1 Peter',
  '2peter': '2 Peter',
  '1john': '1 John',
  '2john': '2 John',
  '3john': '3 John',
  'jude': 'Jude',
  'revelation': 'Revelation'
};

// Expected chapter counts
const EXPECTED_CHAPTERS: Record<string, number> = {
  'genesis': 50, 'exodus': 40, 'leviticus': 27, 'numbers': 36, 'deuteronomy': 34,
  'joshua': 24, 'judges': 21, 'ruth': 4, '1samuel': 31, '2samuel': 24,
  '1kings': 22, '2kings': 25, '1chronicles': 29, '2chronicles': 36, 'ezra': 10,
  'nehemiah': 13, 'esther': 10, 'job': 42, 'psalms': 150, 'proverbs': 31,
  'ecclesiastes': 12, 'songofsolomon': 8, 'isaiah': 66, 'jeremiah': 52, 'lamentations': 5,
  'ezekiel': 48, 'daniel': 12, 'hosea': 14, 'joel': 3, 'amos': 9,
  'obadiah': 1, 'jonah': 4, 'micah': 7, 'nahum': 3, 'habakkuk': 3,
  'zephaniah': 3, 'haggai': 2, 'zechariah': 14, 'malachi': 4,
  'matthew': 28, 'mark': 16, 'luke': 24, 'john': 21, 'acts': 28,
  'romans': 16, '1corinthians': 16, '2corinthians': 13, 'galatians': 6, 'ephesians': 6,
  'philippians': 4, 'colossians': 4, '1thessalonians': 5, '2thessalonians': 3, '1timothy': 6,
  '2timothy': 4, 'titus': 3, 'philemon': 1, 'hebrews': 13, 'james': 5,
  '1peter': 5, '2peter': 3, '1john': 5, '2john': 1, '3john': 1,
  'jude': 1, 'revelation': 22
};

interface BookManifest {
  bookId: string;
  bookName: string;
  chapterCount: number;
  chapters: number[];
}

interface Manifest {
  version: string;
  generatedAt: string;
  books: Record<string, BookManifest>;
}

async function main() {
  const baseDir = path.join(__dirname, '../public/data/preprocessed');

  if (!fs.existsSync(baseDir)) {
    console.error('Preprocessed directory not found:', baseDir);
    process.exit(1);
  }

  const manifest: Manifest = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    books: {}
  };

  const bookDirs = fs.readdirSync(baseDir).filter(f => {
    const stat = fs.statSync(path.join(baseDir, f));
    return stat.isDirectory();
  });

  let totalChapters = 0;
  let missingChapters: string[] = [];

  for (const bookId of bookDirs.sort()) {
    const bookDir = path.join(baseDir, bookId);
    const chapterFiles = fs.readdirSync(bookDir)
      .filter(f => f.startsWith('chapter-') && f.endsWith('.json'));

    const chapters = chapterFiles
      .map(f => {
        const match = f.match(/chapter-(\d+)\.json/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(n => n > 0)
      .sort((a, b) => a - b);

    if (chapters.length > 0) {
      const bookName = BOOK_NAMES[bookId] || bookId;
      const expectedCount = EXPECTED_CHAPTERS[bookId] || chapters.length;

      manifest.books[bookId] = {
        bookId,
        bookName,
        chapterCount: expectedCount,
        chapters
      };

      totalChapters += chapters.length;

      // Check for missing chapters
      for (let i = 1; i <= expectedCount; i++) {
        if (!chapters.includes(i)) {
          missingChapters.push(`${bookName} ${i}`);
        }
      }
    }
  }

  // Write manifest
  const manifestPath = path.join(baseDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log('Manifest generated successfully!');
  console.log(`Total books: ${Object.keys(manifest.books).length}`);
  console.log(`Total chapters: ${totalChapters}`);

  if (missingChapters.length > 0) {
    console.log(`\nMissing chapters (${missingChapters.length}):`);
    missingChapters.forEach(c => console.log(`  - ${c}`));
  }
}

main().catch(console.error);
