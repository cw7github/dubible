const PINYIN_LEVELS = [
  { value: 'all', label: '初学', minHskToShow: null },
  { value: 'hsk2+', label: '入门', minHskToShow: 2 },
  { value: 'hsk4+', label: '中级', minHskToShow: 4 },
  { value: 'hsk5+', label: '中高级', minHskToShow: 5 },
  { value: 'hsk6+', label: '高级', minHskToShow: 6 },
  { value: 'none', label: '流利', minHskToShow: 7 },
];

const PREVIEW_WORDS = [
  { chinese: '的', pinyin: 'de', hskLevel: 1 },
  { chinese: '人', pinyin: 'rén', hskLevel: 1 },
  { chinese: '看見', pinyin: 'kànjiàn', hskLevel: 2 },
  { chinese: '因為', pinyin: 'yīnwèi', hskLevel: 2 },
  { chinese: '許多', pinyin: 'xǔduō', hskLevel: 3 },
  { chinese: '一切', pinyin: 'yīqiè', hskLevel: 3 },
  { chinese: '安慰', pinyin: 'ānwèi', hskLevel: 4 },
  { chinese: '溫柔', pinyin: 'wēnróu', hskLevel: 4 },
  { chinese: '虛心', pinyin: 'xūxīn', hskLevel: 5 },
  { chinese: '承受', pinyin: 'chéngshòu', hskLevel: 5 },
  { chinese: '哀慟', pinyin: 'āitòng', hskLevel: 6 },
  { chinese: '逼迫', pinyin: 'bīpò', hskLevel: 6 },
];

function shouldShowPinyin(pinyinLevel, hskLevel) {
  if (pinyinLevel === 'all') return true;
  if (pinyinLevel === 'none') return false;

  const levelConfig = PINYIN_LEVELS.find(l => l.value === pinyinLevel);
  if (!levelConfig || levelConfig.minHskToShow === null) return true;

  if (hskLevel === undefined) return true;

  return hskLevel >= levelConfig.minHskToShow;
}

console.log('=== Testing Preview Words ===\n');

function testLevel(pinyinLevel) {
  console.log(`\n${pinyinLevel}:`);
  PREVIEW_WORDS.forEach(word => {
    const show = shouldShowPinyin(pinyinLevel, word.hskLevel);
    console.log(`  ${word.chinese} (HSK ${word.hskLevel}): ${show ? 'SHOW' : 'HIDE'} pinyin`);
  });

  const shownCount = PREVIEW_WORDS.filter(w => shouldShowPinyin(pinyinLevel, w.hskLevel)).length;
  console.log(`  --> ${shownCount}/${PREVIEW_WORDS.length} words show pinyin`);
}

testLevel('all');
testLevel('hsk2+');
testLevel('hsk4+');
testLevel('hsk5+');
testLevel('hsk6+');
testLevel('none');
