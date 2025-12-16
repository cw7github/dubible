#!/usr/bin/env node

/**
 * Analyze the cleanup results by checking git diff
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get list of all modified preprocessed files
const modifiedFiles = execSync('git diff --name-only public/data/preprocessed', { encoding: 'utf-8' })
  .trim()
  .split('\n')
  .filter(f => f.endsWith('.json') && !f.includes('manifest'));

console.log(`Total modified files: ${modifiedFiles.length}\n`);

// Group by book
const bookStats = {};

for (const file of modifiedFiles) {
  const parts = file.split('/');
  const book = parts[3]; // public/data/preprocessed/BOOK/chapter-X.json

  if (!bookStats[book]) {
    bookStats[book] = {
      files: 0,
      totalRemoved: 0,
    };
  }

  bookStats[book].files++;

  // Get diff stats for this file
  try {
    const diff = execSync(`git diff --numstat "${file}"`, { encoding: 'utf-8' });
    const match = diff.match(/^(\d+)\s+(\d+)/);
    if (match) {
      const added = parseInt(match[1]);
      const deleted = parseInt(match[2]);
      // Rough estimate: each removed word is about 10-20 lines in JSON
      const wordsRemoved = Math.floor(deleted / 15);
      bookStats[book].totalRemoved += wordsRemoved;
    }
  } catch (e) {
    // Skip if diff fails
  }
}

// Sort books by total removed
const sortedBooks = Object.entries(bookStats)
  .sort((a, b) => b[1].totalRemoved - a[1].totalRemoved);

console.log('Books with most cross-reference words removed:\n');
console.log('Book'.padEnd(20) + 'Files'.padEnd(10) + 'Est. Words Removed');
console.log('-'.repeat(50));

for (const [book, stats] of sortedBooks.slice(0, 20)) {
  console.log(
    book.padEnd(20) +
    stats.files.toString().padEnd(10) +
    stats.totalRemoved.toString()
  );
}

console.log('\nTotal summary:');
console.log(`  Modified files: ${modifiedFiles.length}`);
console.log(`  Estimated total words removed: ${Object.values(bookStats).reduce((sum, s) => sum + s.totalRemoved, 0)}`);
