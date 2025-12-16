const fs = require('fs');
const path = require('path');

const dataDir = '/Users/charleswu/Desktop/+/bilingual_bib/public/data/preprocessed/matthew/';

// Statistics object
const stats = {
  totalWords: 0,
  wordsWithDefinitions: 0,
  wordsWithoutDefinitions: 0,
  emptyDefinitions: 0,
  punctuation: 0,
  wordsByPos: {},
  missingByPos: {},
  missingWords: [],
  sampleMissing: []
};

// Read all chapter files
const files = fs.readdirSync(dataDir)
  .filter(f => f.endsWith('.json'))
  .sort((a, b) => {
    const numA = parseInt(a.match(/\d+/)[0]);
    const numB = parseInt(b.match(/\d+/)[0]);
    return numA - numB;
  });

console.log(`Found ${files.length} chapter files\n`);

files.forEach(file => {
  const filePath = path.join(dataDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  data.verses.forEach(verse => {
    verse.words.forEach(word => {
      stats.totalWords++;

      const def = word.definition || '';
      const chinese = word.chinese || '';
      const pinyin = word.pinyin || '';
      const pos = word.pos || 'unknown';

      // Track by POS
      if (!stats.wordsByPos[pos]) {
        stats.wordsByPos[pos] = 0;
        stats.missingByPos[pos] = 0;
      }
      stats.wordsByPos[pos]++;

      // Check for punctuation (empty definition and pinyin)
      if (!pinyin && !def) {
        stats.punctuation++;
      }
      // Check for missing definition
      else if (!def || def.trim() === '') {
        stats.wordsWithoutDefinitions++;
        stats.missingByPos[pos]++;

        const entry = {
          chapter: data.chapter,
          verse: verse.number,
          chinese,
          pinyin,
          pos,
          text: verse.text
        };

        stats.missingWords.push(entry);

        // Keep first 20 samples
        if (stats.sampleMissing.length < 20) {
          stats.sampleMissing.push(entry);
        }
      }
      // Check for "no definition available" or similar
      else if (def.toLowerCase().includes('no definition') ||
               def.toLowerCase().includes('not available')) {
        stats.emptyDefinitions++;
        stats.missingByPos[pos]++;

        const entry = {
          chapter: data.chapter,
          verse: verse.number,
          chinese,
          pinyin,
          pos,
          definition: def,
          text: verse.text
        };

        stats.missingWords.push(entry);

        if (stats.sampleMissing.length < 20) {
          stats.sampleMissing.push(entry);
        }
      }
      // Has definition
      else {
        stats.wordsWithDefinitions++;
      }
    });
  });
});

// Calculate percentages
const totalNonPunctuation = stats.totalWords - stats.punctuation;
const totalMissing = stats.wordsWithoutDefinitions + stats.emptyDefinitions;
const coveragePercent = ((stats.wordsWithDefinitions / totalNonPunctuation) * 100).toFixed(2);
const missingPercent = ((totalMissing / totalNonPunctuation) * 100).toFixed(2);

// Print report
console.log('='.repeat(70));
console.log('DEFINITION COVERAGE ANALYSIS - MATTHEW');
console.log('='.repeat(70));
console.log();

console.log('OVERALL STATISTICS:');
console.log('-'.repeat(70));
console.log(`Total word entries:              ${stats.totalWords.toLocaleString()}`);
console.log(`Punctuation marks:               ${stats.punctuation.toLocaleString()}`);
console.log(`Words/phrases (non-punctuation): ${totalNonPunctuation.toLocaleString()}`);
console.log();
console.log(`✓ Words with definitions:        ${stats.wordsWithDefinitions.toLocaleString()} (${coveragePercent}%)`);
console.log(`✗ Words without definitions:     ${stats.wordsWithoutDefinitions.toLocaleString()}`);
console.log(`✗ Words with "no def" message:   ${stats.emptyDefinitions.toLocaleString()}`);
console.log(`✗ Total missing definitions:     ${totalMissing.toLocaleString()} (${missingPercent}%)`);
console.log();

console.log('BREAKDOWN BY PART OF SPEECH:');
console.log('-'.repeat(70));

const posKeys = Object.keys(stats.wordsByPos).sort((a, b) =>
  stats.missingByPos[b] - stats.missingByPos[a]
);

posKeys.forEach(pos => {
  const total = stats.wordsByPos[pos];
  const missing = stats.missingByPos[pos];
  const percent = total > 0 ? ((missing / total) * 100).toFixed(1) : 0;
  const coverage = total > 0 ? (((total - missing) / total) * 100).toFixed(1) : 0;

  console.log(`${pos.padEnd(15)} Total: ${String(total).padStart(6)} | Missing: ${String(missing).padStart(5)} (${String(percent).padStart(5)}%) | Coverage: ${coverage}%`);
});

console.log();
console.log('SAMPLE MISSING DEFINITIONS (First 20):');
console.log('-'.repeat(70));

stats.sampleMissing.forEach((item, idx) => {
  console.log(`${idx + 1}. Chapter ${item.chapter}:${item.verse}`);
  console.log(`   Chinese: ${item.chinese}`);
  console.log(`   Pinyin:  ${item.pinyin || '(empty)'}`);
  console.log(`   POS:     ${item.pos}`);
  if (item.definition) {
    console.log(`   Def:     ${item.definition}`);
  }
  console.log(`   Context: ${item.text.substring(0, 80)}...`);
  console.log();
});

// Group missing by frequency
console.log('MOST COMMON MISSING WORDS/PHRASES:');
console.log('-'.repeat(70));

const wordCounts = {};
stats.missingWords.forEach(item => {
  const key = `${item.chinese}|${item.pinyin}|${item.pos}`;
  if (!wordCounts[key]) {
    wordCounts[key] = {
      chinese: item.chinese,
      pinyin: item.pinyin,
      pos: item.pos,
      count: 0,
      examples: []
    };
  }
  wordCounts[key].count++;
  if (wordCounts[key].examples.length < 2) {
    wordCounts[key].examples.push(`${item.chapter}:${item.verse}`);
  }
});

const sortedMissing = Object.values(wordCounts)
  .sort((a, b) => b.count - a.count)
  .slice(0, 30);

sortedMissing.forEach((item, idx) => {
  console.log(`${idx + 1}. "${item.chinese}" (${item.pinyin}) [${item.pos}]`);
  console.log(`   Occurrences: ${item.count} | Examples: ${item.examples.join(', ')}`);
  console.log();
});

// Save full report to file
const report = {
  summary: {
    totalWords: stats.totalWords,
    punctuation: stats.punctuation,
    totalNonPunctuation,
    wordsWithDefinitions: stats.wordsWithDefinitions,
    wordsWithoutDefinitions: stats.wordsWithoutDefinitions,
    emptyDefinitions: stats.emptyDefinitions,
    totalMissing,
    coveragePercent: parseFloat(coveragePercent),
    missingPercent: parseFloat(missingPercent)
  },
  byPos: posKeys.map(pos => ({
    pos,
    total: stats.wordsByPos[pos],
    missing: stats.missingByPos[pos],
    missingPercent: parseFloat(((stats.missingByPos[pos] / stats.wordsByPos[pos]) * 100).toFixed(1))
  })),
  allMissingWords: stats.missingWords,
  topMissing: sortedMissing
};

fs.writeFileSync(
  '/Users/charleswu/Desktop/+/bilingual_bib/definition_analysis_report.json',
  JSON.stringify(report, null, 2)
);

console.log('Full report saved to: definition_analysis_report.json');
