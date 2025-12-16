/**
 * Post-processing script to add HSK and TOCFL proficiency levels
 * to all preprocessed Bible chapter files.
 *
 * Run with: npx tsx scripts/add-proficiency-levels.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { initProficiencyLookup, lookupProficiency } from './proficiency-lookup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PREPROCESSED_DIR = path.join(__dirname, '../public/data/preprocessed');

interface WordData {
  chinese: string;
  pinyin: string;
  definition?: string;
  pos?: string;
  hskLevel?: number;
  tocflLevel?: number;
  freq?: 'common' | 'uncommon' | 'rare' | 'biblical';
  [key: string]: unknown;
}

interface VerseData {
  number: number;
  text: string;
  words: WordData[];
}

interface ChapterData {
  book: string;
  bookId: string;
  chapter: number;
  verses: VerseData[];
  processedAt: string;
}

async function processChapterFile(filePath: string): Promise<{ wordsUpdated: number; wordsTotal: number }> {
  const content = fs.readFileSync(filePath, 'utf8');
  const data: ChapterData = JSON.parse(content);

  let wordsUpdated = 0;
  let wordsTotal = 0;

  for (const verse of data.verses) {
    for (const word of verse.words) {
      // Skip punctuation (no pinyin)
      if (!word.pinyin || word.pinyin === '') continue;

      wordsTotal++;

      const info = lookupProficiency(word.chinese);

      let updated = false;

      // Add HSK level if found and not already present
      if (info.hskLevel !== undefined && word.hskLevel === undefined) {
        word.hskLevel = info.hskLevel;
        updated = true;
      }

      // Add TOCFL level if found and not already present
      if (info.tocflLevel !== undefined && word.tocflLevel === undefined) {
        word.tocflLevel = info.tocflLevel;
        updated = true;
      }

      // Update frequency based on proficiency if:
      // 1. freq is undefined, or
      // 2. freq is 'common' but word is actually rarer based on proficiency
      if (info.hskLevel !== undefined || info.tocflLevel !== undefined) {
        const newFreq = getFrequencyFromCombinedLevel(info.combinedLevel);

        if (word.freq === undefined) {
          word.freq = newFreq;
          updated = true;
        } else if (word.freq !== 'biblical') {
          // Don't override 'biblical' tag from AI, but update others if more accurate
          if (shouldUpdateFreq(word.freq, newFreq, info.combinedLevel)) {
            word.freq = newFreq;
            updated = true;
          }
        }
      }

      if (updated) {
        wordsUpdated++;
      }
    }
  }

  // Save updated file
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  return { wordsUpdated, wordsTotal };
}

function getFrequencyFromCombinedLevel(level: number): 'common' | 'uncommon' | 'rare' {
  if (level <= 3) return 'common';
  if (level <= 5) return 'uncommon';
  return 'rare';
}

function shouldUpdateFreq(
  currentFreq: string,
  newFreq: string,
  combinedLevel: number
): boolean {
  // If current says common but level suggests otherwise, update
  if (currentFreq === 'common' && combinedLevel > 3) return true;
  // If current says uncommon but level suggests rare, update
  if (currentFreq === 'uncommon' && combinedLevel > 5) return true;
  return false;
}

async function main() {
  console.log('Initializing proficiency lookup...');
  await initProficiencyLookup();

  console.log(`\nProcessing chapters in: ${PREPROCESSED_DIR}`);

  // Get all book directories
  const bookDirs = fs.readdirSync(PREPROCESSED_DIR).filter((name) => {
    const fullPath = path.join(PREPROCESSED_DIR, name);
    return fs.statSync(fullPath).isDirectory();
  });

  let totalFiles = 0;
  let totalWordsUpdated = 0;
  let totalWords = 0;

  for (const bookDir of bookDirs) {
    const bookPath = path.join(PREPROCESSED_DIR, bookDir);
    const chapterFiles = fs.readdirSync(bookPath).filter((f) => f.endsWith('.json'));

    for (const chapterFile of chapterFiles) {
      const filePath = path.join(bookPath, chapterFile);
      const { wordsUpdated, wordsTotal } = await processChapterFile(filePath);

      totalFiles++;
      totalWordsUpdated += wordsUpdated;
      totalWords += wordsTotal;

      if (wordsUpdated > 0) {
        console.log(`  ${bookDir}/${chapterFile}: ${wordsUpdated}/${wordsTotal} words updated`);
      }
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Files processed: ${totalFiles}`);
  console.log(`Total words: ${totalWords}`);
  console.log(`Words updated: ${totalWordsUpdated} (${((totalWordsUpdated / totalWords) * 100).toFixed(1)}%)`);
}

main().catch(console.error);
