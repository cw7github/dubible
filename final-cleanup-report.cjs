#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('\n' + '='.repeat(80));
console.log('COMPREHENSIVE CROSS-REFERENCE CLEANUP REPORT');
console.log('='.repeat(80) + '\n');

// Get all modified files
const modifiedFiles = execSync('git diff --name-only public/data/preprocessed', { encoding: 'utf-8' })
  .trim()
  .split('\n')
  .filter(f => f.endsWith('.json') && !f.includes('manifest'));

console.log(`FILES PROCESSED:`);
console.log(`  Modified: ${modifiedFiles.length} files`);
console.log();

// Analyze ALL removed words
const allRemovedWords = {};
const categories = {
  'Punctuation (。、；：)': 0,
  'Parentheses (（）)': 0,
  'Numbers/Markers': 0,
  'Book Abbreviations': 0,
  'Reference Markers (參)': 0,
  'Other': 0,
};

const bookAbbrevs = new Set([
  '創', '出', '利', '民', '申', '書', '士', '得', '撒上', '撒下',
  '王上', '王下', '代上', '代下', '拉', '尼', '斯', '伯', '詩',
  '箴', '傳', '歌', '賽', '耶', '哀', '結', '但', '何', '珥',
  '摩', '俄', '拿', '彌', '鴻', '哈', '番', '該', '亞', '瑪',
  '太', '可', '路', '約', '徒', '羅', '林前', '林後', '加', '弗',
  '腓', '西', '帖前', '帖後', '提前', '提後', '多', '門', '來',
  '雅', '彼前', '彼後', '約壹', '約貳', '約參', '猶', '啟',
]);

// Sample files for detailed analysis
const sampleSize = Math.min(30, modifiedFiles.length);

for (let i = 0; i < sampleSize; i++) {
  const file = modifiedFiles[i];
  try {
    const diff = execSync(`git diff "${file}"`, { encoding: 'utf-8' });
    const removedMatches = diff.match(/-\s+"chinese":\s+"([^"]+)"/g) || [];

    for (const match of removedMatches) {
      const chinese = match.match(/"([^"]+)"$/)[1];

      if (!allRemovedWords[chinese]) {
        allRemovedWords[chinese] = 0;
      }
      allRemovedWords[chinese]++;

      // Categorize
      if (['。', '、', '；', '：', ',', '.', ';', ':', '，', '！', '？'].includes(chinese)) {
        categories['Punctuation (。、；：)']++;
      } else if (['（', '）', '(', ')'].includes(chinese)) {
        categories['Parentheses (（）)']++;
      } else if (/^[\d~\-]+$/.test(chinese)) {
        categories['Numbers/Markers']++;
      } else if (chinese === '參' || chinese === '参') {
        categories['Reference Markers (參)']++;
      } else if (bookAbbrevs.has(chinese)) {
        categories['Book Abbreviations']++;
      } else {
        categories['Other']++;
      }
    }
  } catch (e) {
    // Skip errors
  }
}

// Project total based on sample
const projectionFactor = modifiedFiles.length / sampleSize;

console.log('REMOVAL CATEGORIES (projected from sample):');
console.log('-'.repeat(80));
for (const [category, count] of Object.entries(categories)) {
  const projected = Math.round(count * projectionFactor);
  console.log(`  ${category.padEnd(35)} ${projected.toLocaleString().padStart(10)}`);
}

const totalRemoved = Object.values(categories).reduce((a, b) => a + b, 0);
console.log(`  ${'TOTAL WORDS REMOVED'.padEnd(35)} ${Math.round(totalRemoved * projectionFactor).toLocaleString().padStart(10)}`);
console.log();

// Most frequently removed words
console.log('TOP REMOVED WORDS (from sample):');
console.log('-'.repeat(80));
const sorted = Object.entries(allRemovedWords)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 30);

for (const [word, count] of sorted) {
  let type = 'Other';
  if (['。', '、', '；', '：', ',', '.', ';', ':', '，'].includes(word)) type = 'Punctuation';
  if (['（', '）', '(', ')'].includes(word)) type = 'Parenthesis';
  if (bookAbbrevs.has(word)) type = 'Book Abbrev';
  if (word === '參') type = 'Reference';

  console.log(`  "${word}"`.padEnd(15) + `${count}`.padStart(6) + `  (${type})`);
}

console.log();

// Check text field cleanups
console.log('TEXT FIELD CROSS-REFERENCE REMOVALS:');
console.log('-'.repeat(80));

let textCrossRefCount = 0;
const crossRefExamples = [];

for (let i = 0; i < Math.min(20, modifiedFiles.length); i++) {
  const file = modifiedFiles[i];
  try {
    const diff = execSync(`git diff "${file}"`, { encoding: 'utf-8' });
    const textMatches = diff.match(/-\s+"text":\s+"([^"]{0,200})"/g) || [];

    for (const match of textMatches) {
      const text = match.match(/"([^"]+)"$/)[1];
      const crossRef = text.match(/[（(]([^）)]+)[）)]/);

      if (crossRef && crossRefExamples.length < 5) {
        crossRefExamples.push(crossRef[1]);
        textCrossRefCount++;
      } else if (crossRef) {
        textCrossRefCount++;
      }
    }
  } catch (e) {
    // Skip
  }
}

if (crossRefExamples.length > 0) {
  console.log('Examples of cross-references removed from text:');
  for (const ex of crossRefExamples) {
    console.log(`  • ${ex}`);
  }
  console.log();
  console.log(`Total verses with text cross-refs cleaned (from sample): ${textCrossRefCount}`);
  console.log(`Projected total: ~${Math.round(textCrossRefCount * projectionFactor)}`);
} else {
  console.log('  No text field cross-references found (already cleaned)');
}

console.log();

// Books affected
const booksAffected = {};
for (const file of modifiedFiles) {
  const book = file.split('/')[3];
  if (!booksAffected[book]) booksAffected[book] = 0;
  booksAffected[book]++;
}

console.log('BOOKS AFFECTED:');
console.log('-'.repeat(80));
console.log(`Total books: ${Object.keys(booksAffected).length}`);
console.log();
console.log('Top 20 books by chapters modified:');
const topBooks = Object.entries(booksAffected)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20);

for (const [book, count] of topBooks) {
  console.log(`  ${book.padEnd(25)} ${count} chapters`);
}

console.log();
console.log('='.repeat(80));
console.log('RECOMMENDATIONS FOR FUTURE PREPROCESSING:');
console.log('='.repeat(80));
console.log();
console.log('1. PREVENT CROSS-REFS IN WORDS ARRAY:');
console.log('   • Add filter in segmentation to exclude patterns like (路3:23~38)');
console.log('   • Detect and skip book abbreviations during word extraction');
console.log('   • Remove punctuation-only words before saving');
console.log();
console.log('2. TEXT FIELD CLEANING:');
console.log('   • Strip cross-reference parentheticals before word segmentation');
console.log('   • Store cross-refs in separate structured field (crossReferences array)');
console.log();
console.log('3. VALIDATION:');
console.log('   • Add check for words with empty pinyin/definition');
console.log('   • Flag words that are single punctuation marks');
console.log('   • Verify no book abbreviations in final word arrays');
console.log();
console.log('='.repeat(80));
