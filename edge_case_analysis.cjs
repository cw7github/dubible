const fs = require('fs');
const path = require('path');

const dataDir = '/Users/charleswu/Desktop/+/bilingual_bib/public/data/preprocessed/matthew/';

const edgeCases = {
  noPinyinButHasDef: [],  // No pinyin but has definition - these ARE clickable!
  hasPinyinNoDef: [],     // Has pinyin but no definition - these ARE clickable!
  emptyStringBoth: []     // Empty string for both - NOT clickable
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
      const def = word.definition || '';
      const pinyin = word.pinyin || '';
      const chinese = word.chinese || '';
      const pos = word.pos || '';

      const example = {
        chapter: data.chapter,
        verse: verse.number,
        chinese,
        pinyin: pinyin || '(empty)',
        definition: def || '(empty)',
        pos,
        text: verse.text.substring(0, 60)
      };

      // Edge case 1: No pinyin but HAS definition
      // These are clickable but might show "No definition available" if def is empty string
      if (!pinyin && def && def.trim() !== '') {
        edgeCases.noPinyinButHasDef.push(example);
      }

      // Edge case 2: Has pinyin but NO definition
      // These are clickable and WILL show "No definition available"
      if (pinyin && (!def || def.trim() === '')) {
        edgeCases.hasPinyinNoDef.push(example);
      }

      // Edge case 3: Empty string for both
      if (!pinyin && !def) {
        if (edgeCases.emptyStringBoth.length < 10) {
          edgeCases.emptyStringBoth.push(example);
        }
      }
    });
  });
});

console.log('='.repeat(80));
console.log('EDGE CASE ANALYSIS - Words that might show "No definition available"');
console.log('='.repeat(80));
console.log();

console.log('FILTERING LOGIC IN ChineseWord.tsx:');
console.log('-'.repeat(80));
console.log('if (!word.pinyin && !word.definition) {');
console.log('  // Skip punctuation - render without interaction (NOT clickable)');
console.log('}');
console.log();
console.log('This means a word is clickable if:');
console.log('  - word.pinyin is truthy (not empty string, not null, not undefined) OR');
console.log('  - word.definition is truthy (not empty string, not null, not undefined)');
console.log();

console.log('EDGE CASE 1: No pinyin but HAS definition');
console.log('-'.repeat(80));
console.log(`Count: ${edgeCases.noPinyinButHasDef.length}`);
console.log('These ARE clickable and WILL show a definition.');
console.log();
if (edgeCases.noPinyinButHasDef.length > 0) {
  console.log('First 20 examples:');
  edgeCases.noPinyinButHasDef.slice(0, 20).forEach((ex, idx) => {
    console.log(`${idx + 1}. Ch${ex.chapter}:${ex.verse} - "${ex.chinese}"`);
    console.log(`   Pinyin: ${ex.pinyin}`);
    console.log(`   Definition: "${ex.definition}"`);
    console.log(`   POS: ${ex.pos}`);
    console.log();
  });
} else {
  console.log('✓ No issues found.');
}
console.log();

console.log('EDGE CASE 2: Has pinyin but NO definition');
console.log('-'.repeat(80));
console.log(`Count: ${edgeCases.hasPinyinNoDef.length}`);
console.log('These ARE clickable and WILL show "No definition available"!');
console.log('★ THIS IS THE PROBLEM! ★');
console.log();
if (edgeCases.hasPinyinNoDef.length > 0) {
  console.log('ALL EXAMPLES:');
  edgeCases.hasPinyinNoDef.forEach((ex, idx) => {
    console.log(`${idx + 1}. Ch${ex.chapter}:${ex.verse} - "${ex.chinese}" (${ex.pinyin}) [${ex.pos}]`);
    console.log(`   Context: ${ex.text}...`);
    console.log();
  });
} else {
  console.log('✓ No issues found.');
}
console.log();

console.log('EDGE CASE 3: Empty string for both (NOT clickable)');
console.log('-'.repeat(80));
console.log('Sample of punctuation (correctly filtered):');
edgeCases.emptyStringBoth.slice(0, 5).forEach((ex, idx) => {
  console.log(`${idx + 1}. "${ex.chinese}" [${ex.pos}] - Ch${ex.chapter}:${ex.verse}`);
});
console.log();

console.log('='.repeat(80));
console.log('SUMMARY');
console.log('='.repeat(80));
console.log();

if (edgeCases.hasPinyinNoDef.length > 0) {
  console.log(`⚠ FOUND THE ISSUE!`);
  console.log();
  console.log(`${edgeCases.hasPinyinNoDef.length} words have pinyin but no definition.`);
  console.log('These words are clickable and show "No definition available".');
  console.log();
  console.log('RECOMMENDATIONS:');
  console.log('1. Add definitions for these words in the preprocessed data');
  console.log('2. Alternatively, update UI to handle empty definitions better');
} else {
  console.log('✓ No problematic words found!');
  console.log();
  console.log('If users report "No definition available", check:');
  console.log('1. Missing chapters (10, 11, 24-28)');
  console.log('2. UI bugs');
}

// Save report
fs.writeFileSync(
  '/Users/charleswu/Desktop/+/bilingual_bib/edge_case_report.json',
  JSON.stringify(edgeCases, null, 2)
);

console.log();
console.log('Full report saved to: edge_case_report.json');
