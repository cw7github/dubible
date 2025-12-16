const fs = require('fs');
const path = require('path');

const dataDir = '/Users/charleswu/Desktop/+/bilingual_bib/public/data/preprocessed/matthew/';

const stats = {
  totalWords: 0,
  punctuation: 0,
  wordsWithDefinitions: 0,
  emptyStringDefs: 0,
  nullDefs: 0,
  undefinedDefs: 0,
  byCategory: {
    punctuation: { count: 0, examples: [] },
    hasDefinition: { count: 0, examples: [] },
    emptyString: { count: 0, examples: [] },
    nullOrUndefined: { count: 0, examples: [] }
  }
};

const files = fs.readdirSync(dataDir)
  .filter(f => f.endsWith('.json'))
  .sort((a, b) => {
    const numA = parseInt(a.match(/\d+/)[0]);
    const numB = parseInt(b.match(/\d+/)[0]);
    return numA - numB;
  });

console.log('='.repeat(80));
console.log('COMPREHENSIVE DEFINITION ANALYSIS - MATTHEW');
console.log('='.repeat(80));
console.log();

files.forEach(file => {
  const filePath = path.join(dataDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  data.verses.forEach(verse => {
    verse.words.forEach(word => {
      stats.totalWords++;

      const def = word.definition;
      const chinese = word.chinese || '';
      const pinyin = word.pinyin || '';
      const pos = word.pos || 'unknown';

      const example = {
        chapter: data.chapter,
        verse: verse.number,
        chinese,
        pinyin,
        pos,
        definition: def,
        text: verse.text.substring(0, 80)
      };

      // Check if it's punctuation (empty pinyin and definition)
      if (!pinyin && (def === '' || def === null || def === undefined)) {
        stats.punctuation++;
        if (stats.byCategory.punctuation.examples.length < 5) {
          stats.byCategory.punctuation.examples.push(example);
        }
      }
      // Check definition status
      else {
        if (def === '') {
          stats.emptyStringDefs++;
          stats.byCategory.emptyString.count++;
          if (stats.byCategory.emptyString.examples.length < 20) {
            stats.byCategory.emptyString.examples.push(example);
          }
        } else if (def === null) {
          stats.nullDefs++;
          stats.byCategory.nullOrUndefined.count++;
          if (stats.byCategory.nullOrUndefined.examples.length < 20) {
            stats.byCategory.nullOrUndefined.examples.push(example);
          }
        } else if (def === undefined) {
          stats.undefinedDefs++;
          stats.byCategory.nullOrUndefined.count++;
          if (stats.byCategory.nullOrUndefined.examples.length < 20) {
            stats.byCategory.nullOrUndefined.examples.push(example);
          }
        } else {
          stats.wordsWithDefinitions++;
          if (stats.byCategory.hasDefinition.examples.length < 5) {
            stats.byCategory.hasDefinition.examples.push(example);
          }
        }
      }
    });
  });
});

const totalNonPunctuation = stats.totalWords - stats.punctuation;
const totalMissing = stats.emptyStringDefs + stats.nullDefs + stats.undefinedDefs;
const coveragePercent = ((stats.wordsWithDefinitions / totalNonPunctuation) * 100).toFixed(2);
const missingPercent = ((totalMissing / totalNonPunctuation) * 100).toFixed(2);

console.log('SUMMARY STATISTICS:');
console.log('-'.repeat(80));
console.log(`Total word entries:                ${stats.totalWords.toLocaleString()}`);
console.log(`Punctuation marks:                 ${stats.punctuation.toLocaleString()}`);
console.log(`Words/phrases (non-punctuation):   ${totalNonPunctuation.toLocaleString()}`);
console.log();
console.log(`✓ Words with definitions:          ${stats.wordsWithDefinitions.toLocaleString()} (${coveragePercent}%)`);
console.log(`✗ Empty string definitions:        ${stats.emptyStringDefs.toLocaleString()}`);
console.log(`✗ Null definitions:                ${stats.nullDefs.toLocaleString()}`);
console.log(`✗ Undefined definitions:           ${stats.undefinedDefs.toLocaleString()}`);
console.log(`✗ Total missing definitions:       ${totalMissing.toLocaleString()} (${missingPercent}%)`);
console.log();

console.log('WHAT USERS SEE:');
console.log('-'.repeat(80));
console.log('In the UI, "No definition available" is shown when:');
console.log('  - definition === "" (empty string)');
console.log('  - definition === null');
console.log('  - definition === undefined');
console.log();
console.log(`This affects ${totalMissing.toLocaleString()} words (${missingPercent}% of non-punctuation words)`);
console.log();

console.log('CATEGORY BREAKDOWN:');
console.log('-'.repeat(80));

// Punctuation
console.log(`\n1. PUNCTUATION (${stats.byCategory.punctuation.count} entries)`);
console.log('   These are intentionally without definitions:');
stats.byCategory.punctuation.examples.slice(0, 3).forEach((ex, idx) => {
  console.log(`   ${idx + 1}. "${ex.chinese}" [${ex.pos}] - Ch${ex.chapter}:${ex.verse}`);
});

// Has definition
console.log(`\n2. HAS DEFINITION (${stats.wordsWithDefinitions.toLocaleString()} entries)`);
console.log('   Sample entries with definitions:');
stats.byCategory.hasDefinition.examples.forEach((ex, idx) => {
  console.log(`   ${idx + 1}. "${ex.chinese}" (${ex.pinyin}) -> "${ex.definition}"`);
});

// Empty string
console.log(`\n3. EMPTY STRING DEFINITIONS (${stats.byCategory.emptyString.count} entries)`);
console.log('   These show "No definition available" in the UI:');
stats.byCategory.emptyString.examples.forEach((ex, idx) => {
  console.log(`   ${idx + 1}. Ch${ex.chapter}:${ex.verse} - "${ex.chinese}" (${ex.pinyin}) [${ex.pos}]`);
  console.log(`      Context: ${ex.text}...`);
});

// Null/Undefined
if (stats.byCategory.nullOrUndefined.count > 0) {
  console.log(`\n4. NULL/UNDEFINED DEFINITIONS (${stats.byCategory.nullOrUndefined.count} entries)`);
  console.log('   These also show "No definition available" in the UI:');
  stats.byCategory.nullOrUndefined.examples.forEach((ex, idx) => {
    console.log(`   ${idx + 1}. Ch${ex.chapter}:${ex.verse} - "${ex.chinese}" (${ex.pinyin}) [${ex.pos}]`);
    console.log(`      Definition value: ${ex.definition}`);
  });
}

console.log();
console.log('MISSING CHAPTERS:');
console.log('-'.repeat(80));
const allChapters = Array.from({length: 28}, (_, i) => i + 1);
const existingChapters = files.map(f => parseInt(f.match(/\d+/)[0]));
const missingChapters = allChapters.filter(ch => !existingChapters.includes(ch));

if (missingChapters.length > 0) {
  console.log(`Missing chapter files: ${missingChapters.join(', ')}`);
  console.log('Users will see "No definition available" for all words in these chapters.');
} else {
  console.log('All chapters are present.');
}

console.log();
console.log('='.repeat(80));
console.log('CONCLUSION');
console.log('='.repeat(80));
console.log();

if (totalMissing === 0) {
  console.log('✓ ALL non-punctuation words have definitions!');
  console.log();
  console.log('If users are seeing "No definition available", it might be:');
  console.log('  1. Accessing missing chapters (10, 11, 24-28)');
  console.log('  2. A UI bug not properly accessing the definition field');
  console.log('  3. Clicking on punctuation marks');
} else {
  console.log(`⚠ ${totalMissing.toLocaleString()} words (${missingPercent}%) show "No definition available"`);
  console.log();
  console.log('RECOMMENDATIONS:');
  console.log('  1. Review the empty string definitions and add proper definitions');
  console.log('  2. Complete missing chapters (10, 11, 24-28)');
  console.log('  3. Ensure all words have non-empty definition strings');
}
