/**
 * Cleanup Cross-References from Word Arrays
 *
 * Removes cross-reference book abbreviations that were accidentally
 * included in the words array during preprocessing.
 *
 * Usage:
 *   npx tsx scripts/cleanup-cross-refs-in-words.ts --book matthew --chapter 1
 *   npx tsx scripts/cleanup-cross-refs-in-words.ts --book matthew
 *   npx tsx scripts/cleanup-cross-refs-in-words.ts --all
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Known Bible book abbreviations that shouldn't appear in verse text
const CROSS_REF_BOOK_ABBREVS = new Set([
  // OT
  '創', '出', '利', '民', '申', '書', '士', '得', '撒上', '撒下',
  '王上', '王下', '代上', '代下', '拉', '尼', '斯', '伯', '詩',
  '箴', '傳', '歌', '賽', '耶', '哀', '結', '但', '何', '珥',
  '摩', '俄', '拿', '彌', '鴻', '哈', '番', '該', '亞', '瑪',
  // NT
  '太', '可', '路', '約', '徒', '羅', '林前', '林後', '加', '弗',
  '腓', '西', '帖前', '帖後', '提前', '提後', '多', '門', '來',
  '雅', '彼前', '彼後', '約壹', '約貳', '約參', '猶', '啟',
  // Special characters often in cross-refs
  '參',
]);

// Pattern: words that look like cross-references
// Single character book abbrevs, or 2-char with 上/下, or 參
function isCrossRefWord(word: any): boolean {
  const chinese = word.chinese;

  // Opening/closing parentheses for cross-refs
  if (chinese === '（' || chinese === '）' || chinese === '(' || chinese === ')') {
    // Check if this might be a cross-ref parenthesis by checking if adjacent words are cross-refs
    return word.definition === '' || word.pinyin === '';
  }

  // Known book abbreviations
  if (CROSS_REF_BOOK_ABBREVS.has(chinese)) {
    // Additional check: cross-ref words usually have specific notes
    if (word.note && (
      word.note.includes('Abbreviation for') ||
      word.note.includes('book of the Bible') ||
      word.note.includes('福音') ||
      word.note.includes('歷代志')
    )) {
      return true;
    }
    // Single char book names with isName=true and nameType=place
    if (word.isName && word.nameType === 'place' && word.freq === 'biblical') {
      return true;
    }
  }

  return false;
}

// Also clean up the text field
function cleanTextOfCrossRefs(text: string): string {
  return text
    // Remove parenthetical cross-refs like （路得代上）
    .replace(/[（(][\s參]*[\u4e00-\u9fff上下]{1,6}(?:[\s；、，,;。．.]*[\u4e00-\u9fff上下]{1,6})*[\s。．.]*[）)]/g, '')
    // Clean up extra whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

async function processChapter(filePath: string): Promise<{ modified: boolean; wordsRemoved: number }> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);

  let totalWordsRemoved = 0;
  let modified = false;

  for (const verse of data.verses) {
    // Clean the verse text
    const cleanedText = cleanTextOfCrossRefs(verse.text);
    if (cleanedText !== verse.text) {
      verse.text = cleanedText;
      modified = true;
    }

    // Filter out cross-reference words
    const originalLength = verse.words.length;

    // Find indices to remove (consecutive cross-ref patterns)
    const indicesToRemove: number[] = [];
    let inCrossRefBlock = false;

    for (let i = 0; i < verse.words.length; i++) {
      const word = verse.words[i];

      // Detect start of cross-ref block
      if (word.chinese === '（' && word.definition === '') {
        inCrossRefBlock = true;
        indicesToRemove.push(i);
        continue;
      }

      // Detect end of cross-ref block
      if (word.chinese === '）' && inCrossRefBlock) {
        indicesToRemove.push(i);
        inCrossRefBlock = false;
        continue;
      }

      // Inside cross-ref block or standalone cross-ref word
      if (inCrossRefBlock || isCrossRefWord(word)) {
        indicesToRemove.push(i);
      }
    }

    // Remove words in reverse order to maintain indices
    for (let i = indicesToRemove.length - 1; i >= 0; i--) {
      verse.words.splice(indicesToRemove[i], 1);
    }

    const removed = originalLength - verse.words.length;
    if (removed > 0) {
      totalWordsRemoved += removed;
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  return { modified, wordsRemoved: totalWordsRemoved };
}

async function processBook(bookId: string, specificChapter?: number) {
  const bookDir = path.join(__dirname, '../public/data/preprocessed', bookId);

  if (!fs.existsSync(bookDir)) {
    console.log(`Book directory not found: ${bookDir}`);
    return;
  }

  const files = fs.readdirSync(bookDir).filter(f => f.startsWith('chapter-') && f.endsWith('.json'));

  let totalRemoved = 0;
  let filesModified = 0;

  for (const file of files) {
    const chapterMatch = file.match(/chapter-(\d+)\.json/);
    if (!chapterMatch) continue;

    const chapterNum = parseInt(chapterMatch[1], 10);

    // Skip if specific chapter requested and this isn't it
    if (specificChapter && chapterNum !== specificChapter) continue;

    const filePath = path.join(bookDir, file);
    const { modified, wordsRemoved } = await processChapter(filePath);

    if (modified) {
      console.log(`  ${file}: removed ${wordsRemoved} cross-ref words`);
      totalRemoved += wordsRemoved;
      filesModified++;
    }
  }

  console.log(`\nDone! Modified ${filesModified} files, removed ${totalRemoved} total cross-ref words`);
}

async function main() {
  const args = process.argv.slice(2);
  const bookIndex = args.indexOf('--book');
  const chapterIndex = args.indexOf('--chapter');
  const allFlag = args.includes('--all');

  if (bookIndex !== -1 && args[bookIndex + 1]) {
    const bookId = args[bookIndex + 1];
    const chapter = chapterIndex !== -1 ? parseInt(args[chapterIndex + 1], 10) : undefined;

    console.log(`Processing ${bookId}${chapter ? ` chapter ${chapter}` : ''}...`);
    await processBook(bookId, chapter);
  } else if (allFlag) {
    const baseDir = path.join(__dirname, '../public/data/preprocessed');
    const books = fs.readdirSync(baseDir).filter(f => {
      const stat = fs.statSync(path.join(baseDir, f));
      return stat.isDirectory() && f !== 'manifest.json';
    });

    for (const bookId of books) {
      console.log(`\nProcessing ${bookId}...`);
      await processBook(bookId);
    }
  } else {
    console.log('Usage:');
    console.log('  npx tsx scripts/cleanup-cross-refs-in-words.ts --book matthew --chapter 1');
    console.log('  npx tsx scripts/cleanup-cross-refs-in-words.ts --book matthew');
    console.log('  npx tsx scripts/cleanup-cross-refs-in-words.ts --all');
  }
}

main().catch(console.error);
