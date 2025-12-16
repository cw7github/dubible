const pinyinLevel = 'hsk4+';
const hskLevel = undefined;

// From settings.ts line 114-127
function shouldShowPinyin(pinyinLevel, hskLevel) {
  if (pinyinLevel === 'all') return true;
  if (pinyinLevel === 'none') return false;

  const PINYIN_LEVELS = [
    { value: 'all', minHskToShow: null },
    { value: 'hsk2+', minHskToShow: 2 },
    { value: 'hsk4+', minHskToShow: 4 },
    { value: 'hsk5+', minHskToShow: 5 },
    { value: 'hsk6+', minHskToShow: 6 },
    { value: 'none', minHskToShow: 7 },
  ];

  const levelConfig = PINYIN_LEVELS.find(l => l.value === pinyinLevel);
  if (!levelConfig || levelConfig.minHskToShow === null) return true;

  // Words without HSK level are considered rare/advanced - always show pinyin unless 'none'
  if (hskLevel === undefined) return true;

  // Show pinyin only if the word's HSK level meets the threshold
  return hskLevel >= levelConfig.minHskToShow;
}

console.log('pinyinLevel:', pinyinLevel);
console.log('hskLevel:', hskLevel);
console.log('shouldShowPinyin:', shouldShowPinyin(pinyinLevel, hskLevel));

// Test with different levels
console.log('\nTesting all levels with undefined hskLevel:');
['all', 'hsk2+', 'hsk4+', 'hsk5+', 'hsk6+', 'none'].forEach(level => {
  console.log(`  ${level}: ${shouldShowPinyin(level, undefined)}`);
});
