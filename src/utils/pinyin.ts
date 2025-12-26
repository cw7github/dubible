// Pinyin utility functions

// A set of valid pinyin syllables (without tone marks).
// Generated from `@pinyin-pro/data/modern` (Mandarin) by normalizing tone marks to base vowels.
// Used to avoid incorrect syllable splits when pinyin is concatenated without separators.
const VALID_PINYIN_SYLLABLES = new Set<string>([
  'a',
  'ai',
  'an',
  'ang',
  'ao',
  'ba',
  'bai',
  'ban',
  'bang',
  'bao',
  'bei',
  'ben',
  'beng',
  'bi',
  'bian',
  'biao',
  'bie',
  'bin',
  'bing',
  'bo',
  'bu',
  'ca',
  'cai',
  'can',
  'cang',
  'cao',
  'ce',
  'cen',
  'ceng',
  'cha',
  'chai',
  'chan',
  'chang',
  'chao',
  'che',
  'chen',
  'cheng',
  'chi',
  'chong',
  'chou',
  'chu',
  'chua',
  'chuai',
  'chuan',
  'chuang',
  'chui',
  'chun',
  'chuo',
  'ci',
  'cong',
  'cou',
  'cu',
  'cuan',
  'cui',
  'cun',
  'cuo',
  'da',
  'dai',
  'dan',
  'dang',
  'dao',
  'de',
  'dei',
  'deng',
  'di',
  'dia',
  'dian',
  'diao',
  'die',
  'ding',
  'diu',
  'dong',
  'dou',
  'du',
  'duan',
  'dui',
  'dun',
  'duo',
  'e',
  'en',
  'er',
  'fa',
  'fan',
  'fang',
  'fei',
  'fen',
  'feng',
  'fo',
  'fou',
  'fu',
  'ga',
  'gai',
  'gan',
  'gang',
  'gao',
  'ge',
  'gei',
  'gen',
  'geng',
  'gong',
  'gou',
  'gu',
  'gua',
  'guai',
  'guan',
  'guang',
  'gui',
  'gun',
  'guo',
  'ha',
  'hai',
  'han',
  'hang',
  'hao',
  'he',
  'hei',
  'hen',
  'heng',
  'hong',
  'hou',
  'hu',
  'hua',
  'huai',
  'huan',
  'huang',
  'hui',
  'hun',
  'huo',
  'ji',
  'jia',
  'jian',
  'jiang',
  'jiao',
  'jie',
  'jin',
  'jing',
  'jiong',
  'jiu',
  'ju',
  'juan',
  'jue',
  'jun',
  'ka',
  'kai',
  'kan',
  'kang',
  'kao',
  'ke',
  'kei',
  'ken',
  'keng',
  'kong',
  'kou',
  'ku',
  'kua',
  'kuai',
  'kuan',
  'kuang',
  'kui',
  'kun',
  'kuo',
  'la',
  'lai',
  'lan',
  'lang',
  'lao',
  'le',
  'lei',
  'leng',
  'li',
  'lia',
  'lian',
  'liang',
  'liao',
  'lie',
  'lin',
  'ling',
  'liu',
  'long',
  'lou',
  'lu',
  'luan',
  'lun',
  'luo',
  'lü',
  'lüe',
  'ma',
  'mai',
  'man',
  'mang',
  'mao',
  'me',
  'mei',
  'men',
  'meng',
  'mi',
  'mian',
  'miao',
  'mie',
  'min',
  'ming',
  'miu',
  'mo',
  'mou',
  'mu',
  'na',
  'nai',
  'nan',
  'nang',
  'nao',
  'ne',
  'nei',
  'nen',
  'neng',
  'ni',
  'nian',
  'niang',
  'niao',
  'nie',
  'nin',
  'ning',
  'niu',
  'nong',
  'nou',
  'nu',
  'nuan',
  'nuo',
  'nü',
  'nüe',
  'o',
  'ou',
  'pa',
  'pai',
  'pan',
  'pang',
  'pao',
  'pei',
  'pen',
  'peng',
  'pi',
  'pian',
  'piao',
  'pie',
  'pin',
  'ping',
  'po',
  'pou',
  'pu',
  'qi',
  'qia',
  'qian',
  'qiang',
  'qiao',
  'qie',
  'qin',
  'qing',
  'qiong',
  'qiu',
  'qu',
  'quan',
  'que',
  'qun',
  'ran',
  'rang',
  'rao',
  're',
  'ren',
  'reng',
  'ri',
  'rong',
  'rou',
  'ru',
  'ruan',
  'rui',
  'run',
  'ruo',
  'sa',
  'sai',
  'san',
  'sang',
  'sao',
  'se',
  'sen',
  'seng',
  'sha',
  'shai',
  'shan',
  'shang',
  'shao',
  'she',
  'shei',
  'shen',
  'sheng',
  'shi',
  'shou',
  'shu',
  'shua',
  'shuai',
  'shuan',
  'shuang',
  'shui',
  'shun',
  'shuo',
  'si',
  'song',
  'sou',
  'su',
  'suan',
  'sui',
  'sun',
  'suo',
  'ta',
  'tai',
  'tan',
  'tang',
  'tao',
  'te',
  'teng',
  'ti',
  'tian',
  'tiao',
  'tie',
  'ting',
  'tong',
  'tou',
  'tu',
  'tuan',
  'tui',
  'tun',
  'tuo',
  'wa',
  'wai',
  'wan',
  'wang',
  'wei',
  'wen',
  'weng',
  'wo',
  'wu',
  'xi',
  'xia',
  'xian',
  'xiang',
  'xiao',
  'xie',
  'xin',
  'xing',
  'xiong',
  'xiu',
  'xu',
  'xuan',
  'xue',
  'xun',
  'ya',
  'yan',
  'yang',
  'yao',
  'ye',
  'yi',
  'yin',
  'ying',
  'yo',
  'yong',
  'you',
  'yu',
  'yuan',
  'yue',
  'yun',
  'za',
  'zai',
  'zan',
  'zang',
  'zao',
  'ze',
  'zei',
  'zen',
  'zeng',
  'zha',
  'zhai',
  'zhan',
  'zhang',
  'zhao',
  'zhe',
  'zhen',
  'zheng',
  'zhi',
  'zhong',
  'zhou',
  'zhu',
  'zhua',
  'zhuai',
  'zhuan',
  'zhuang',
  'zhui',
  'zhun',
  'zhuo',
  'zi',
  'zong',
  'zou',
  'zu',
  'zuan',
  'zui',
  'zun',
  'zuo',
]);

const TONE_TO_BASE = new Map<string, string>([
  ['ā', 'a'],
  ['á', 'a'],
  ['ǎ', 'a'],
  ['à', 'a'],
  ['Ā', 'a'],
  ['Á', 'a'],
  ['Ǎ', 'a'],
  ['À', 'a'],
  ['ē', 'e'],
  ['é', 'e'],
  ['ě', 'e'],
  ['è', 'e'],
  ['Ē', 'e'],
  ['É', 'e'],
  ['Ě', 'e'],
  ['È', 'e'],
  ['ī', 'i'],
  ['í', 'i'],
  ['ǐ', 'i'],
  ['ì', 'i'],
  ['Ī', 'i'],
  ['Í', 'i'],
  ['Ǐ', 'i'],
  ['Ì', 'i'],
  ['ō', 'o'],
  ['ó', 'o'],
  ['ǒ', 'o'],
  ['ò', 'o'],
  ['Ō', 'o'],
  ['Ó', 'o'],
  ['Ǒ', 'o'],
  ['Ò', 'o'],
  ['ū', 'u'],
  ['ú', 'u'],
  ['ǔ', 'u'],
  ['ù', 'u'],
  ['Ū', 'u'],
  ['Ú', 'u'],
  ['Ǔ', 'u'],
  ['Ù', 'u'],
  ['ǖ', 'ü'],
  ['ǘ', 'ü'],
  ['ǚ', 'ü'],
  ['ǜ', 'ü'],
  ['Ǖ', 'ü'],
  ['Ǘ', 'ü'],
  ['Ǚ', 'ü'],
  ['Ǜ', 'ü'],
  ['ü', 'ü'],
  ['Ü', 'ü'],
]);

function normalizeSyllableForValidation(syllable: string): string {
  let out = '';
  for (const ch of syllable.trim()) {
    if (ch >= '0' && ch <= '9') continue;
    out += (TONE_TO_BASE.get(ch) ?? ch).toLowerCase();
  }
  return out;
}

function isValidPinyinSyllable(syllable: string): boolean {
  const norm = normalizeSyllableForValidation(syllable);
  return Boolean(norm) && VALID_PINYIN_SYLLABLES.has(norm);
}

function startsWithVowel(syllable: string): boolean {
  const first = Array.from(syllable.trim())[0];
  if (!first) return false;
  const norm = normalizeSyllableForValidation(first);
  return norm === 'a' || norm === 'e' || norm === 'i' || norm === 'o' || norm === 'u' || norm === 'ü';
}

function fixConsonantCarrySplits(syllables: string[]): string[] {
  const fixed = [...syllables];
  for (let i = 0; i < fixed.length - 1; i++) {
    const prev = fixed[i] ?? '';
    const next = fixed[i + 1] ?? '';
    const trimmedPrev = prev.trim();
    const trimmedNext = next.trim();
    if (!trimmedPrev || !trimmedNext) continue;

    const lastChar = Array.from(trimmedPrev).at(-1) ?? '';
    if (!/[nrNR]/.test(lastChar)) continue;
    if (!startsWithVowel(trimmedNext)) continue;

    const candidatePrev = trimmedPrev.slice(0, -1);
    const candidateNext = `${lastChar}${trimmedNext}`;

    const prevValid = isValidPinyinSyllable(trimmedPrev);
    const nextValid = isValidPinyinSyllable(trimmedNext);
    const candidatePrevValid = isValidPinyinSyllable(candidatePrev);
    const candidateNextValid = isValidPinyinSyllable(candidateNext);

    // Only shift when the current split is invalid (at least one side) but the shifted split is valid.
    if ((!prevValid || !nextValid) && candidatePrevValid && candidateNextValid) {
      fixed[i] = candidatePrev;
      fixed[i + 1] = candidateNext;
    }
  }
  return fixed;
}

// Split pinyin string into syllables matching the number of Chinese characters
export function splitPinyinSyllables(pinyin: string, charCount: number): string[] {
  if (!pinyin || charCount === 0) return [];
  if (charCount === 1) return [pinyin];

  const cleanPinyin = pinyin.trim();

  // First, check if apostrophes are present - they explicitly mark syllable boundaries
  // Apostrophes are used in pinyin to separate syllables (e.g., "cí'ài" for 慈愛)
  if (cleanPinyin.includes("'")) {
    const apostropheSplit = cleanPinyin.split("'");
    if (apostropheSplit.length === charCount) {
      return apostropheSplit;
    }
  }

  // Try to split by spaces (some pinyin might be space-separated)
  const spaceSplit = cleanPinyin.split(/\s+/);
  if (spaceSplit.length === charCount) {
    return spaceSplit;
  }

  // Remove apostrophes for regex matching (they are syllable separators, not part of syllables)
  const pinyinWithoutApostrophes = cleanPinyin.replace(/'/g, ' ');

  // Regex pattern to match pinyin syllables
  // Handles initials, finals, tone marks (āáǎà) and tone numbers (1-4)
  //
  // NOTE: Be careful with `r`:
  // - `r` can be a syllable initial (e.g., rén 人).
  // - `r` can also be an "erhua" suffix at the end of a syllable (e.g., ér 兒 / huār 花兒).
  // When pinyin is concatenated with no spaces (e.g., "púrén", "Sādūgāirén"), a naive
  // regex will incorrectly treat the `r` of the next syllable as an erhua suffix, producing
  // splits like ["púr", "én"] or ["gāir", "én"].
  //
  // Fix: only treat `r` as a suffix when it is NOT followed by a vowel/tone-marked vowel.
  const vowelOrToneMarkedVowel = 'iuüaeiouāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ';
  const tempRegex = new RegExp(
    `([bpmfdtnlgkhjqxrzcsyw]?h?[${vowelOrToneMarkedVowel}]+(?:ng|n|r(?![${vowelOrToneMarkedVowel}]))?[1-4]?)`,
    'gi'
  );

  const matches: string[] = [];
  let match;
  while ((match = tempRegex.exec(pinyinWithoutApostrophes)) !== null) {
    matches.push(match[1]);
  }

  if (matches.length === charCount) {
    // Fix common mis-splits when pinyin is concatenated without separators:
    // e.g., "púrén" -> ["púr","én"] (should be ["pú","rén"])
    // e.g., "bùnéng" -> ["bùn","éng"] (should be ["bù","néng"])
    return fixConsonantCarrySplits(matches);
  }

  // If regex didn't match correctly, try intelligent splitting
  if (matches.length > 0 && matches.length !== charCount) {
    if (matches.length > charCount) {
      // More syllables than characters - combine adjacent ones
      const combined: string[] = [];
      const ratio = matches.length / charCount;
      for (let i = 0; i < charCount; i++) {
        const startIdx = Math.floor(i * ratio);
        const endIdx = Math.floor((i + 1) * ratio);
        combined.push(matches.slice(startIdx, endIdx).join(''));
      }
      return combined;
    }
  }

  // Ultimate fallback: divide string evenly by character positions
  // Try to find natural break points (after tone marks or at reasonable positions)
  const avgLen = cleanPinyin.length / charCount;
  const result: string[] = [];

  for (let i = 0; i < charCount; i++) {
    const start = Math.round(i * avgLen);
    const end = i === charCount - 1 ? cleanPinyin.length : Math.round((i + 1) * avgLen);
    if (start < cleanPinyin.length) {
      result.push(cleanPinyin.slice(start, end));
    }
  }

  return result.length === charCount ? result : [cleanPinyin];
}

// Split Chinese characters into individual characters
// Filters out whitespace characters (including full-width spaces U+3000)
export function splitChineseCharacters(text: string): string[] {
  return [...text].filter(char => !/\s/.test(char));
}
