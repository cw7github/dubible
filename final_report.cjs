const fs = require('fs');
const path = require('path');

const dataDir = '/Users/charleswu/Desktop/+/bilingual_bib/public/data/preprocessed/matthew/';

const stats = {
  totalEntries: 0,
  byType: {
    punctuation: { count: 0, hasPos: 0, examples: [] },
    wordsWithDef: { count: 0, examples: [] },
    wordsWithoutDef: { count: 0, examples: [] }
  },
  punctuationMarks: new Set()
};

const files = fs.readdirSync(dataDir)
  .filter(f => f.endsWith('.json'))
  .sort((a, b) => {
    const numA = parseInt(a.match(/\d+/)[0]);
    const numB = parseInt(b.match(/\d+/)[0]);
    return numA - numB;
  });

files.forEach(file => {
  const filePath = path.join(dataDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  data.verses.forEach(verse => {
    verse.words.forEach(word => {
      stats.totalEntries++;

      const def = word.definition || '';
      const chinese = word.chinese || '';
      const pinyin = word.pinyin || '';
      const pos = word.pos || '';

      const example = {
        chapter: data.chapter,
        verse: verse.number,
        chinese,
        pinyin,
        pos,
        definition: def,
        text: verse.text.substring(0, 60)
      };

      // Identify punctuation: empty pinyin AND empty definition
      if (!pinyin && !def) {
        stats.byType.punctuation.count++;
        stats.punctuationMarks.add(chinese);
        if (pos) stats.byType.punctuation.hasPos++;
        if (stats.byType.punctuation.examples.length < 20) {
          stats.byType.punctuation.examples.push(example);
        }
      }
      // Words with pinyin but no definition
      else if (pinyin && !def) {
        stats.byType.wordsWithoutDef.count++;
        if (stats.byType.wordsWithoutDef.examples.length < 30) {
          stats.byType.wordsWithoutDef.examples.push(example);
        }
      }
      // Has definition
      else if (def) {
        stats.byType.wordsWithDef.count++;
        if (stats.byType.wordsWithDef.examples.length < 5) {
          stats.byType.wordsWithDef.examples.push(example);
        }
      }
    });
  });
});

console.log('='.repeat(80));
console.log('FINAL DEFINITION COVERAGE REPORT - MATTHEW');
console.log('='.repeat(80));
console.log();

console.log('OVERVIEW:');
console.log('-'.repeat(80));
console.log(`Total entries in data:              ${stats.totalEntries.toLocaleString()}`);
console.log(`├─ Punctuation marks:               ${stats.byType.punctuation.count.toLocaleString()}`);
console.log(`├─ Words WITH definitions:          ${stats.byType.wordsWithDef.count.toLocaleString()}`);
console.log(`└─ Words WITHOUT definitions:       ${stats.byType.wordsWithoutDef.count.toLocaleString()}`);
console.log();

const totalWords = stats.byType.wordsWithDef.count + stats.byType.wordsWithoutDef.count;
const coveragePct = ((stats.byType.wordsWithDef.count / totalWords) * 100).toFixed(2);
const missingPct = ((stats.byType.wordsWithoutDef.count / totalWords) * 100).toFixed(2);

console.log('DEFINITION COVERAGE (excluding punctuation):');
console.log('-'.repeat(80));
console.log(`Words/phrases (non-punctuation):    ${totalWords.toLocaleString()}`);
console.log(`✓ With definitions:                 ${stats.byType.wordsWithDef.count.toLocaleString()} (${coveragePct}%)`);
console.log(`✗ Without definitions:              ${stats.byType.wordsWithoutDef.count.toLocaleString()} (${missingPct}%)`);
console.log();

console.log('WHEN USERS SEE "No definition available":');
console.log('-'.repeat(80));
console.log();
console.log('1. CLICKING ON PUNCTUATION MARKS');
console.log(`   Count: ${stats.byType.punctuation.count.toLocaleString()} entries`);
console.log(`   Unique punctuation marks: ${stats.punctuationMarks.size}`);
console.log(`   Marks: ${Array.from(stats.punctuationMarks).join(', ')}`);
console.log();
console.log('   Examples:');
stats.byType.punctuation.examples.slice(0, 10).forEach((ex, idx) => {
  console.log(`   ${idx + 1}. "${ex.chinese}" [${ex.pos || 'no pos'}] - Ch${ex.chapter}:${ex.verse}`);
});
console.log();

if (stats.byType.wordsWithoutDef.count > 0) {
  console.log('2. ACTUAL WORDS MISSING DEFINITIONS');
  console.log(`   Count: ${stats.byType.wordsWithoutDef.count.toLocaleString()} words`);
  console.log();
  console.log('   Examples:');
  stats.byType.wordsWithoutDef.examples.forEach((ex, idx) => {
    console.log(`   ${idx + 1}. Ch${ex.chapter}:${ex.verse} - "${ex.chinese}" (${ex.pinyin}) [${ex.pos}]`);
    console.log(`      Context: ${ex.text}...`);
  });
  console.log();
} else {
  console.log('2. ACTUAL WORDS MISSING DEFINITIONS');
  console.log('   ✓ NONE! All words have definitions.');
  console.log();
}

console.log('3. MISSING CHAPTERS');
console.log('-'.repeat(80));
const allChapters = Array.from({length: 28}, (_, i) => i + 1);
const existingChapters = files.map(f => parseInt(f.match(/\d+/)[0]));
const missingChapters = allChapters.filter(ch => !existingChapters.includes(ch));

console.log(`   Existing chapters: ${existingChapters.length}/28`);
console.log(`   Missing chapters:  ${missingChapters.join(', ')}`);
console.log();
console.log('   If users navigate to these chapters, ALL words will show');
console.log('   "No definition available" because the chapter data is missing.');
console.log();

console.log('='.repeat(80));
console.log('RECOMMENDATIONS');
console.log('='.repeat(80));
console.log();

if (stats.byType.wordsWithoutDef.count === 0) {
  console.log('✓ EXCELLENT: All words in existing chapters have definitions!');
  console.log();
  console.log('User reports of "no definition available" are likely due to:');
  console.log();
  console.log('1. PUNCTUATION (Most likely)');
  console.log('   - Users clicking on punctuation marks (（）。，；etc.)');
  console.log('   - These intentionally have no definitions');
  console.log('   - UI could be improved to not show definition panel for punctuation');
  console.log();
  console.log('2. MISSING CHAPTERS');
  console.log('   - Chapters 10, 11, 24-28 are not yet preprocessed');
  console.log('   - Complete preprocessing for these chapters');
  console.log();
  console.log('3. UI IMPROVEMENTS');
  console.log('   - Consider filtering out punctuation from clickable words');
  console.log('   - Add better messaging when chapter data is unavailable');
  console.log('   - Show "Punctuation mark" instead of "No definition available"');
} else {
  console.log('⚠ ACTION REQUIRED:');
  console.log();
  console.log('1. FIX MISSING DEFINITIONS');
  console.log(`   - ${stats.byType.wordsWithoutDef.count} words need definitions`);
  console.log('   - Review the examples above and add proper definitions');
  console.log();
  console.log('2. COMPLETE MISSING CHAPTERS');
  console.log('   - Process chapters: ' + missingChapters.join(', '));
  console.log();
  console.log('3. HANDLE PUNCTUATION IN UI');
  console.log('   - Consider not showing definition panel for punctuation');
  console.log('   - Or show "Punctuation mark" instead of "No definition available"');
}

console.log();
console.log('='.repeat(80));

// Save detailed report
const report = {
  summary: {
    totalEntries: stats.totalEntries,
    punctuation: stats.byType.punctuation.count,
    wordsWithDefinitions: stats.byType.wordsWithDef.count,
    wordsWithoutDefinitions: stats.byType.wordsWithoutDef.count,
    coveragePercent: parseFloat(coveragePct),
    missingPercent: parseFloat(missingPct)
  },
  missingChapters,
  existingChapters,
  punctuationMarks: Array.from(stats.punctuationMarks),
  wordsWithoutDefinitions: stats.byType.wordsWithoutDef.examples
};

fs.writeFileSync(
  '/Users/charleswu/Desktop/+/bilingual_bib/definition_coverage_report.json',
  JSON.stringify(report, null, 2)
);

console.log('Full report saved to: definition_coverage_report.json');
console.log();
