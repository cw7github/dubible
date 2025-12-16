const fs = require('fs');
const path = require('path');

const dataDir = '/Users/charleswu/Desktop/+/bilingual_bib/public/data/preprocessed/matthew/';

const files = fs.readdirSync(dataDir)
  .filter(f => f.endsWith('.json'))
  .sort((a, b) => {
    const numA = parseInt(a.match(/\d+/)[0]);
    const numB = parseInt(b.match(/\d+/)[0]);
    return numA - numB;
  });

console.log('Checking for various definition issues...\n');

const issues = {
  emptyString: [],
  onlyWhitespace: [],
  veryShort: [],
  suspiciousPattern: []
};

files.forEach(file => {
  const filePath = path.join(dataDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  data.verses.forEach(verse => {
    verse.words.forEach(word => {
      const def = word.definition || '';
      const chinese = word.chinese || '';
      const pinyin = word.pinyin || '';
      const pos = word.pos || 'unknown';

      // Skip punctuation
      if (pos.toLowerCase().includes('punct')) {
        return;
      }

      // Empty string (but has pinyin - meaning it's not just punctuation)
      if (pinyin && def === '') {
        issues.emptyString.push({
          chapter: data.chapter,
          verse: verse.number,
          chinese,
          pinyin,
          pos,
          context: verse.text.substring(0, 60)
        });
      }

      // Only whitespace
      if (def.trim() === '' && def !== '') {
        issues.onlyWhitespace.push({
          chapter: data.chapter,
          verse: verse.number,
          chinese,
          pinyin,
          pos,
          def: JSON.stringify(def),
          context: verse.text.substring(0, 60)
        });
      }

      // Very short definitions (1-2 chars) that aren't punctuation
      if (def.length > 0 && def.length <= 2 && def.trim().length > 0) {
        issues.veryShort.push({
          chapter: data.chapter,
          verse: verse.number,
          chinese,
          pinyin,
          pos,
          def,
          context: verse.text.substring(0, 60)
        });
      }

      // Suspicious patterns
      if (def.toLowerCase().includes('???') ||
          def.toLowerCase().includes('unknown') ||
          def.toLowerCase().includes('unclear') ||
          def.toLowerCase().includes('tbd') ||
          def === '?') {
        issues.suspiciousPattern.push({
          chapter: data.chapter,
          verse: verse.number,
          chinese,
          pinyin,
          pos,
          def,
          context: verse.text.substring(0, 60)
        });
      }
    });
  });
});

// Report
console.log('='.repeat(70));
console.log('DEFINITION QUALITY ISSUES');
console.log('='.repeat(70));
console.log();

console.log(`Empty strings (with pinyin): ${issues.emptyString.length}`);
if (issues.emptyString.length > 0) {
  console.log('First 10 examples:');
  issues.emptyString.slice(0, 10).forEach((item, idx) => {
    console.log(`  ${idx + 1}. Ch${item.chapter}:${item.verse} - "${item.chinese}" (${item.pinyin}) [${item.pos}]`);
    console.log(`     Context: ${item.context}...`);
  });
  console.log();
}

console.log(`Only whitespace: ${issues.onlyWhitespace.length}`);
if (issues.onlyWhitespace.length > 0) {
  console.log('Examples:');
  issues.onlyWhitespace.slice(0, 10).forEach((item, idx) => {
    console.log(`  ${idx + 1}. Ch${item.chapter}:${item.verse} - "${item.chinese}" (${item.pinyin}) [${item.pos}]`);
    console.log(`     Def: ${item.def}`);
  });
  console.log();
}

console.log(`Very short definitions (1-2 chars): ${issues.veryShort.length}`);
if (issues.veryShort.length > 0) {
  console.log('First 20 examples:');
  issues.veryShort.slice(0, 20).forEach((item, idx) => {
    console.log(`  ${idx + 1}. Ch${item.chapter}:${item.verse} - "${item.chinese}" (${item.pinyin}) -> "${item.def}" [${item.pos}]`);
  });
  console.log();
}

console.log(`Suspicious patterns: ${issues.suspiciousPattern.length}`);
if (issues.suspiciousPattern.length > 0) {
  console.log('Examples:');
  issues.suspiciousPattern.forEach((item, idx) => {
    console.log(`  ${idx + 1}. Ch${item.chapter}:${item.verse} - "${item.chinese}" (${item.pinyin}) -> "${item.def}" [${item.pos}]`);
  });
  console.log();
}

// Save detailed report
fs.writeFileSync(
  '/Users/charleswu/Desktop/+/bilingual_bib/definition_issues_report.json',
  JSON.stringify(issues, null, 2)
);

console.log('Detailed report saved to: definition_issues_report.json');
