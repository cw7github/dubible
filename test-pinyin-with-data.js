// Test with actual settings from the app
const PINYIN_LEVELS = [
  { value: 'all', label: '初学', minHskToShow: null },
  { value: 'hsk2+', label: '入门', minHskToShow: 2 },
  { value: 'hsk4+', label: '中级', minHskToShow: 4 },
  { value: 'hsk5+', label: '中高级', minHskToShow: 5 },
  { value: 'hsk6+', label: '高级', minHskToShow: 6 },
  { value: 'none', label: '流利', minHskToShow: 7 },
];

function shouldShowPinyin(pinyinLevel, hskLevel) {
  console.log(`\nTesting pinyinLevel="${pinyinLevel}", hskLevel=${hskLevel}`);

  if (pinyinLevel === 'all') {
    console.log('  -> Returning true (level is "all")');
    return true;
  }
  if (pinyinLevel === 'none') {
    console.log('  -> Returning false (level is "none")');
    return false;
  }

  const levelConfig = PINYIN_LEVELS.find(l => l.value === pinyinLevel);
  console.log('  -> Found config:', levelConfig);

  if (!levelConfig || levelConfig.minHskToShow === null) {
    console.log('  -> Returning true (no config or minHskToShow is null)');
    return true;
  }

  if (hskLevel === undefined) {
    console.log('  -> Returning true (hskLevel is undefined - rare word)');
    return true;
  }

  const result = hskLevel >= levelConfig.minHskToShow;
  console.log(`  -> Returning ${result} (hskLevel ${hskLevel} >= ${levelConfig.minHskToShow})`);
  return result;
}

console.log('=== Testing shouldShowPinyin logic ===\n');

// Test Elementary level (hsk2+) with undefined hskLevel
console.log('\n--- Elementary (hsk2+) ---');
shouldShowPinyin('hsk2+', undefined);

// Test Intermediate level (hsk4+) with undefined hskLevel
console.log('\n--- Intermediate (hsk4+) ---');
shouldShowPinyin('hsk4+', undefined);

// Test with actual HSK levels
console.log('\n--- Testing with actual HSK levels ---');
console.log('\nIntermediate (hsk4+) with HSK 1 word:');
shouldShowPinyin('hsk4+', 1);

console.log('\nIntermediate (hsk4+) with HSK 4 word:');
shouldShowPinyin('hsk4+', 4);

console.log('\nIntermediate (hsk4+) with HSK 6 word:');
shouldShowPinyin('hsk4+', 6);
