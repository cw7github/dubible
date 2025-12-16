#!/usr/bin/env node

/**
 * Detailed analysis of cross-reference cleanup
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('='.repeat(70));
console.log('CROSS-REFERENCE CLEANUP ANALYSIS REPORT');
console.log('='.repeat(70));
console.log();

// Get list of all modified preprocessed files
const modifiedFiles = execSync('git diff --name-only public/data/preprocessed', { encoding: 'utf-8' })
  .trim()
  .split('\n')
  .filter(f => f.endsWith('.json') && !f.includes('manifest'));

console.log(`Total modified files: ${modifiedFiles.length}\n`);

// Analyze types of removals
const removalStats = {
  punctuation: 0,
  bookAbbrevs: 0,
  numbers: 0,
  parentheses: 0,
  textCrossRefs: 0,
};

const bookStats = {};
const exampleRemovals = [];

for (const file of modifiedFiles) {
  const parts = file.split('/');
  const book = parts[3]; // public/data/preprocessed/BOOK/chapter-X.json

  if (!bookStats[book]) {
    bookStats[book] = {
      files: 0,
      totalLinesChanged: 0,
      wordsRemoved: 0,
    };
  }

  bookStats[book].files++;

  // Get diff for this file
  try {
    const diff = execSync(`git diff "${file}"`, { encoding: 'utf-8' });

    // Count text field cross-ref removals
    const textMatches = diff.match(/-\s+"text".*[（(].*?[）)]/g);
    if (textMatches) {
      removalStats.textCrossRefs += textMatches.length;
      bookStats[book].wordsRemoved += textMatches.length * 5; // estimate 5 words per cross-ref
    }

    // Count removed word objects
    const removedWords = diff.match(/-\s+"chinese": "(.+?)"/g) || [];
    for (const wordMatch of removedWords) {
      const chinese = wordMatch.match(/"(.+?)"/)[1];

      // Categorize
      if (['。', '、', '；', '：', ',', '.', ';', ':'].includes(chinese)) {
        removalStats.punctuation++;
      } else if (['（', '）', '(', ')'].includes(chinese)) {
        removalStats.parentheses++;
      } else if (/^\d+$/.test(chinese)) {
        removalStats.numbers++;
      } else if (chinese.length <= 3 && /[\u4e00-\u9fff]/.test(chinese)) {
        // Might be book abbreviation
        removalStats.bookAbbrevs++;

        // Collect examples
        if (exampleRemovals.length < 20) {
          exampleRemovals.push({ book, chinese });
        }
      }

      bookStats[book].wordsRemoved++;
    }

    // Get line stats
    const statMatch = execSync(`git diff --numstat "${file}"`, { encoding: 'utf-8' }).match(/^(\d+)\s+(\d+)/);
    if (statMatch) {
      bookStats[book].totalLinesChanged += parseInt(statMatch[2]); // deletions
    }
  } catch (e) {
    // Skip if diff fails
  }
}

console.log('REMOVAL BREAKDOWN:');
console.log('-'.repeat(70));
console.log(`Punctuation marks (。、；： etc.):  ${removalStats.punctuation.toLocaleString()}`);
console.log(`Parentheses (（）):                 ${removalStats.parentheses.toLocaleString()}`);
console.log(`Numbers (verse/chapter markers):   ${removalStats.numbers.toLocaleString()}`);
console.log(`Book abbreviations:                ${removalStats.bookAbbrevs.toLocaleString()}`);
console.log(`Text field cross-references:       ${removalStats.textCrossRefs.toLocaleString()}`);
console.log();

const totalRemoved = Object.values(removalStats).reduce((a, b) => a + b, 0);
console.log(`TOTAL ITEMS REMOVED:               ${totalRemoved.toLocaleString()}`);
console.log();

// Example book abbreviations removed
if (exampleRemovals.length > 0) {
  console.log('EXAMPLE BOOK ABBREVIATIONS REMOVED:');
  console.log('-'.repeat(70));
  const examples = [...new Set(exampleRemovals.map(e => e.chinese))];
  console.log(examples.slice(0, 15).join(', '));
  console.log();
}

// Top books by changes
console.log('BOOKS WITH MOST CHANGES:');
console.log('-'.repeat(70));
console.log('Book'.padEnd(25) + 'Files'.padEnd(10) + 'Lines'.padEnd(10) + 'Words');
console.log('-'.repeat(70));

const sortedBooks = Object.entries(bookStats)
  .sort((a, b) => b[1].wordsRemoved - a[1].wordsRemoved);

for (const [book, stats] of sortedBooks.slice(0, 25)) {
  console.log(
    book.padEnd(25) +
    stats.files.toString().padEnd(10) +
    stats.totalLinesChanged.toString().padEnd(10) +
    stats.wordsRemoved.toString()
  );
}

console.log();
console.log('SUMMARY:');
console.log('-'.repeat(70));
console.log(`Total books affected:    ${Object.keys(bookStats).length}`);
console.log(`Total files modified:    ${modifiedFiles.length}`);
console.log(`Total words removed:     ${Object.values(bookStats).reduce((sum, s) => sum + s.wordsRemoved, 0).toLocaleString()}`);
console.log();

// Check for patterns in the text field
console.log('TEXT FIELD PATTERN ANALYSIS:');
console.log('-'.repeat(70));

const sampleFile = 'public/data/preprocessed/matthew/chapter-1.json';
if (fs.existsSync(sampleFile)) {
  try {
    const diff = execSync(`git diff "${sampleFile}"`, { encoding: 'utf-8' });
    const textChanges = diff.match(/-\s+"text": "(.{0,100}[（(].*?[）)].*?)"/g);

    if (textChanges && textChanges.length > 0) {
      console.log('Examples of text cross-references removed:');
      console.log();

      for (let i = 0; i < Math.min(3, textChanges.length); i++) {
        const match = textChanges[i].match(/"(.+)"/);
        if (match) {
          const text = match[1];
          const crossRef = text.match(/[（(](.+?)[）)]/);
          if (crossRef) {
            console.log(`  Cross-ref: ${crossRef[1]}`);
            console.log(`  Full text: ${text.substring(0, 80)}...`);
            console.log();
          }
        }
      }
    }
  } catch (e) {
    // Skip
  }
}

console.log('='.repeat(70));
console.log('END OF REPORT');
console.log('='.repeat(70));
