#!/usr/bin/env node

/**
 * Generate manifest.json for preprocessed Bible data
 *
 * This script scans the public/data/preprocessed directory and generates
 * a manifest.json file listing all available preprocessed books and chapters.
 *
 * Usage: node scripts/generate-manifest.js
 */

const fs = require('fs');
const path = require('path');

const PREPROCESSED_DIR = path.join(__dirname, '../public/data/preprocessed');
const MANIFEST_PATH = path.join(PREPROCESSED_DIR, 'manifest.json');

// Book metadata (from src/data/bible/books.ts)
const BOOK_METADATA = {
  genesis: { name: 'Genesis', chapterCount: 50 },
  exodus: { name: 'Exodus', chapterCount: 40 },
  leviticus: { name: 'Leviticus', chapterCount: 27 },
  numbers: { name: 'Numbers', chapterCount: 36 },
  deuteronomy: { name: 'Deuteronomy', chapterCount: 34 },
  joshua: { name: 'Joshua', chapterCount: 24 },
  judges: { name: 'Judges', chapterCount: 21 },
  ruth: { name: 'Ruth', chapterCount: 4 },
  '1samuel': { name: '1 Samuel', chapterCount: 31 },
  '2samuel': { name: '2 Samuel', chapterCount: 24 },
  '1kings': { name: '1 Kings', chapterCount: 22 },
  '2kings': { name: '2 Kings', chapterCount: 25 },
  '1chronicles': { name: '1 Chronicles', chapterCount: 29 },
  '2chronicles': { name: '2 Chronicles', chapterCount: 36 },
  ezra: { name: 'Ezra', chapterCount: 10 },
  nehemiah: { name: 'Nehemiah', chapterCount: 13 },
  esther: { name: 'Esther', chapterCount: 10 },
  job: { name: 'Job', chapterCount: 42 },
  psalms: { name: 'Psalms', chapterCount: 150 },
  proverbs: { name: 'Proverbs', chapterCount: 31 },
  ecclesiastes: { name: 'Ecclesiastes', chapterCount: 12 },
  songofsolomon: { name: 'Song of Solomon', chapterCount: 8 },
  isaiah: { name: 'Isaiah', chapterCount: 66 },
  jeremiah: { name: 'Jeremiah', chapterCount: 52 },
  lamentations: { name: 'Lamentations', chapterCount: 5 },
  ezekiel: { name: 'Ezekiel', chapterCount: 48 },
  daniel: { name: 'Daniel', chapterCount: 12 },
  hosea: { name: 'Hosea', chapterCount: 14 },
  joel: { name: 'Joel', chapterCount: 3 },
  amos: { name: 'Amos', chapterCount: 9 },
  obadiah: { name: 'Obadiah', chapterCount: 1 },
  jonah: { name: 'Jonah', chapterCount: 4 },
  micah: { name: 'Micah', chapterCount: 7 },
  nahum: { name: 'Nahum', chapterCount: 3 },
  habakkuk: { name: 'Habakkuk', chapterCount: 3 },
  zephaniah: { name: 'Zephaniah', chapterCount: 3 },
  haggai: { name: 'Haggai', chapterCount: 2 },
  zechariah: { name: 'Zechariah', chapterCount: 14 },
  malachi: { name: 'Malachi', chapterCount: 4 },
  matthew: { name: 'Matthew', chapterCount: 28 },
  mark: { name: 'Mark', chapterCount: 16 },
  luke: { name: 'Luke', chapterCount: 24 },
  john: { name: 'John', chapterCount: 21 },
  acts: { name: 'Acts', chapterCount: 28 },
  romans: { name: 'Romans', chapterCount: 16 },
  '1corinthians': { name: '1 Corinthians', chapterCount: 16 },
  '2corinthians': { name: '2 Corinthians', chapterCount: 13 },
  galatians: { name: 'Galatians', chapterCount: 6 },
  ephesians: { name: 'Ephesians', chapterCount: 6 },
  philippians: { name: 'Philippians', chapterCount: 4 },
  colossians: { name: 'Colossians', chapterCount: 4 },
  '1thessalonians': { name: '1 Thessalonians', chapterCount: 5 },
  '2thessalonians': { name: '2 Thessalonians', chapterCount: 3 },
  '1timothy': { name: '1 Timothy', chapterCount: 6 },
  '2timothy': { name: '2 Timothy', chapterCount: 4 },
  titus: { name: 'Titus', chapterCount: 3 },
  philemon: { name: 'Philemon', chapterCount: 1 },
  hebrews: { name: 'Hebrews', chapterCount: 13 },
  james: { name: 'James', chapterCount: 5 },
  '1peter': { name: '1 Peter', chapterCount: 5 },
  '2peter': { name: '2 Peter', chapterCount: 3 },
  '1john': { name: '1 John', chapterCount: 5 },
  '2john': { name: '2 John', chapterCount: 1 },
  '3john': { name: '3 John', chapterCount: 1 },
  jude: { name: 'Jude', chapterCount: 1 },
  revelation: { name: 'Revelation', chapterCount: 22 },
};

function scanPreprocessedData() {
  if (!fs.existsSync(PREPROCESSED_DIR)) {
    console.error(`Error: Preprocessed directory not found: ${PREPROCESSED_DIR}`);
    process.exit(1);
  }

  const books = {};

  // Read all directories in preprocessed folder
  const entries = fs.readdirSync(PREPROCESSED_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const bookId = entry.name;
      const bookDir = path.join(PREPROCESSED_DIR, bookId);

      // Find all chapter JSON files
      const chapterFiles = fs.readdirSync(bookDir)
        .filter(file => file.startsWith('chapter-') && file.endsWith('.json'))
        .map(file => {
          const match = file.match(/chapter-(\d+)\.json/);
          return match ? parseInt(match[1], 10) : null;
        })
        .filter(num => num !== null)
        .sort((a, b) => a - b);

      if (chapterFiles.length > 0) {
        const metadata = BOOK_METADATA[bookId] || {
          name: bookId.charAt(0).toUpperCase() + bookId.slice(1),
          chapterCount: Math.max(...chapterFiles)
        };

        books[bookId] = {
          bookId,
          bookName: metadata.name,
          chapterCount: metadata.chapterCount,
          chapters: chapterFiles,
        };
      }
    }
  }

  return books;
}

function generateManifest() {
  console.log('Scanning preprocessed data directory...');
  const books = scanPreprocessedData();

  const bookCount = Object.keys(books).length;
  const totalChapters = Object.values(books).reduce((sum, book) => sum + book.chapters.length, 0);

  console.log(`Found ${bookCount} books with ${totalChapters} preprocessed chapters`);

  const manifest = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    books,
  };

  // Write manifest
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log(`Manifest written to: ${MANIFEST_PATH}`);

  // Print summary
  console.log('\nBooks with preprocessed data:');
  Object.values(books).forEach(book => {
    console.log(`  - ${book.bookName}: ${book.chapters.length}/${book.chapterCount} chapters`);
  });
}

// Run the script
try {
  generateManifest();
} catch (error) {
  console.error('Error generating manifest:', error);
  process.exit(1);
}
