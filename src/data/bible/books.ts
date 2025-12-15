import type { Book } from '../../types';

// Complete list of Bible books with Chinese Traditional names
export const BIBLE_BOOKS: Omit<Book, 'chapters'>[] = [
  // Old Testament - 舊約
  { id: 'genesis', name: { chinese: '創世記', english: 'Genesis', pinyin: 'Chuàngshìjì' }, testament: 'old', chapterCount: 50 },
  { id: 'exodus', name: { chinese: '出埃及記', english: 'Exodus', pinyin: 'Chū Āijí Jì' }, testament: 'old', chapterCount: 40 },
  { id: 'leviticus', name: { chinese: '利未記', english: 'Leviticus', pinyin: 'Lìwèijì' }, testament: 'old', chapterCount: 27 },
  { id: 'numbers', name: { chinese: '民數記', english: 'Numbers', pinyin: 'Mínshùjì' }, testament: 'old', chapterCount: 36 },
  { id: 'deuteronomy', name: { chinese: '申命記', english: 'Deuteronomy', pinyin: 'Shēnmìngjì' }, testament: 'old', chapterCount: 34 },
  { id: 'joshua', name: { chinese: '約書亞記', english: 'Joshua', pinyin: 'Yuēshūyà Jì' }, testament: 'old', chapterCount: 24 },
  { id: 'judges', name: { chinese: '士師記', english: 'Judges', pinyin: 'Shìshījì' }, testament: 'old', chapterCount: 21 },
  { id: 'ruth', name: { chinese: '路得記', english: 'Ruth', pinyin: 'Lùdéjì' }, testament: 'old', chapterCount: 4 },
  { id: '1samuel', name: { chinese: '撒母耳記上', english: '1 Samuel', pinyin: 'Sāmǔěr Jì Shàng' }, testament: 'old', chapterCount: 31 },
  { id: '2samuel', name: { chinese: '撒母耳記下', english: '2 Samuel', pinyin: 'Sāmǔěr Jì Xià' }, testament: 'old', chapterCount: 24 },
  { id: '1kings', name: { chinese: '列王紀上', english: '1 Kings', pinyin: 'Lièwáng Jì Shàng' }, testament: 'old', chapterCount: 22 },
  { id: '2kings', name: { chinese: '列王紀下', english: '2 Kings', pinyin: 'Lièwáng Jì Xià' }, testament: 'old', chapterCount: 25 },
  { id: '1chronicles', name: { chinese: '歷代志上', english: '1 Chronicles', pinyin: 'Lìdàizhì Shàng' }, testament: 'old', chapterCount: 29 },
  { id: '2chronicles', name: { chinese: '歷代志下', english: '2 Chronicles', pinyin: 'Lìdàizhì Xià' }, testament: 'old', chapterCount: 36 },
  { id: 'ezra', name: { chinese: '以斯拉記', english: 'Ezra', pinyin: 'Yǐsīlā Jì' }, testament: 'old', chapterCount: 10 },
  { id: 'nehemiah', name: { chinese: '尼希米記', english: 'Nehemiah', pinyin: 'Níxīmǐ Jì' }, testament: 'old', chapterCount: 13 },
  { id: 'esther', name: { chinese: '以斯帖記', english: 'Esther', pinyin: 'Yǐsītiě Jì' }, testament: 'old', chapterCount: 10 },
  { id: 'job', name: { chinese: '約伯記', english: 'Job', pinyin: 'Yuēbó Jì' }, testament: 'old', chapterCount: 42 },
  { id: 'psalms', name: { chinese: '詩篇', english: 'Psalms', pinyin: 'Shīpiān' }, testament: 'old', chapterCount: 150 },
  { id: 'proverbs', name: { chinese: '箴言', english: 'Proverbs', pinyin: 'Zhēnyán' }, testament: 'old', chapterCount: 31 },
  { id: 'ecclesiastes', name: { chinese: '傳道書', english: 'Ecclesiastes', pinyin: 'Chuándàoshū' }, testament: 'old', chapterCount: 12 },
  { id: 'songofsolomon', name: { chinese: '雅歌', english: 'Song of Solomon', pinyin: 'Yǎgē' }, testament: 'old', chapterCount: 8 },
  { id: 'isaiah', name: { chinese: '以賽亞書', english: 'Isaiah', pinyin: 'Yǐsàiyà Shū' }, testament: 'old', chapterCount: 66 },
  { id: 'jeremiah', name: { chinese: '耶利米書', english: 'Jeremiah', pinyin: 'Yēlìmǐ Shū' }, testament: 'old', chapterCount: 52 },
  { id: 'lamentations', name: { chinese: '耶利米哀歌', english: 'Lamentations', pinyin: 'Yēlìmǐ Āigē' }, testament: 'old', chapterCount: 5 },
  { id: 'ezekiel', name: { chinese: '以西結書', english: 'Ezekiel', pinyin: 'Yǐxījié Shū' }, testament: 'old', chapterCount: 48 },
  { id: 'daniel', name: { chinese: '但以理書', english: 'Daniel', pinyin: 'Dànyǐlǐ Shū' }, testament: 'old', chapterCount: 12 },
  { id: 'hosea', name: { chinese: '何西阿書', english: 'Hosea', pinyin: 'Héxīē Shū' }, testament: 'old', chapterCount: 14 },
  { id: 'joel', name: { chinese: '約珥書', english: 'Joel', pinyin: 'Yuēěr Shū' }, testament: 'old', chapterCount: 3 },
  { id: 'amos', name: { chinese: '阿摩司書', english: 'Amos', pinyin: 'Āmósī Shū' }, testament: 'old', chapterCount: 9 },
  { id: 'obadiah', name: { chinese: '俄巴底亞書', english: 'Obadiah', pinyin: 'Ébādǐyà Shū' }, testament: 'old', chapterCount: 1 },
  { id: 'jonah', name: { chinese: '約拿書', english: 'Jonah', pinyin: 'Yuēná Shū' }, testament: 'old', chapterCount: 4 },
  { id: 'micah', name: { chinese: '彌迦書', english: 'Micah', pinyin: 'Míjiā Shū' }, testament: 'old', chapterCount: 7 },
  { id: 'nahum', name: { chinese: '那鴻書', english: 'Nahum', pinyin: 'Nàhóng Shū' }, testament: 'old', chapterCount: 3 },
  { id: 'habakkuk', name: { chinese: '哈巴谷書', english: 'Habakkuk', pinyin: 'Hābāgǔ Shū' }, testament: 'old', chapterCount: 3 },
  { id: 'zephaniah', name: { chinese: '西番雅書', english: 'Zephaniah', pinyin: 'Xīfānyǎ Shū' }, testament: 'old', chapterCount: 3 },
  { id: 'haggai', name: { chinese: '哈該書', english: 'Haggai', pinyin: 'Hāgāi Shū' }, testament: 'old', chapterCount: 2 },
  { id: 'zechariah', name: { chinese: '撒迦利亞書', english: 'Zechariah', pinyin: 'Sājiālìyà Shū' }, testament: 'old', chapterCount: 14 },
  { id: 'malachi', name: { chinese: '瑪拉基書', english: 'Malachi', pinyin: 'Mǎlājī Shū' }, testament: 'old', chapterCount: 4 },

  // New Testament - 新約
  { id: 'matthew', name: { chinese: '馬太福音', english: 'Matthew', pinyin: 'Mǎtài Fúyīn' }, testament: 'new', chapterCount: 28 },
  { id: 'mark', name: { chinese: '馬可福音', english: 'Mark', pinyin: 'Mǎkě Fúyīn' }, testament: 'new', chapterCount: 16 },
  { id: 'luke', name: { chinese: '路加福音', english: 'Luke', pinyin: 'Lùjiā Fúyīn' }, testament: 'new', chapterCount: 24 },
  { id: 'john', name: { chinese: '約翰福音', english: 'John', pinyin: 'Yuēhàn Fúyīn' }, testament: 'new', chapterCount: 21 },
  { id: 'acts', name: { chinese: '使徒行傳', english: 'Acts', pinyin: 'Shǐtú Xíngzhuàn' }, testament: 'new', chapterCount: 28 },
  { id: 'romans', name: { chinese: '羅馬書', english: 'Romans', pinyin: 'Luómǎ Shū' }, testament: 'new', chapterCount: 16 },
  { id: '1corinthians', name: { chinese: '哥林多前書', english: '1 Corinthians', pinyin: 'Gēlínduō Qián Shū' }, testament: 'new', chapterCount: 16 },
  { id: '2corinthians', name: { chinese: '哥林多後書', english: '2 Corinthians', pinyin: 'Gēlínduō Hòu Shū' }, testament: 'new', chapterCount: 13 },
  { id: 'galatians', name: { chinese: '加拉太書', english: 'Galatians', pinyin: 'Jiālātài Shū' }, testament: 'new', chapterCount: 6 },
  { id: 'ephesians', name: { chinese: '以弗所書', english: 'Ephesians', pinyin: 'Yǐfúsuǒ Shū' }, testament: 'new', chapterCount: 6 },
  { id: 'philippians', name: { chinese: '腓立比書', english: 'Philippians', pinyin: 'Féilìbǐ Shū' }, testament: 'new', chapterCount: 4 },
  { id: 'colossians', name: { chinese: '歌羅西書', english: 'Colossians', pinyin: 'Gēluóxī Shū' }, testament: 'new', chapterCount: 4 },
  { id: '1thessalonians', name: { chinese: '帖撒羅尼迦前書', english: '1 Thessalonians', pinyin: 'Tiēsāluóníjiā Qián Shū' }, testament: 'new', chapterCount: 5 },
  { id: '2thessalonians', name: { chinese: '帖撒羅尼迦後書', english: '2 Thessalonians', pinyin: 'Tiēsāluóníjiā Hòu Shū' }, testament: 'new', chapterCount: 3 },
  { id: '1timothy', name: { chinese: '提摩太前書', english: '1 Timothy', pinyin: 'Tímótài Qián Shū' }, testament: 'new', chapterCount: 6 },
  { id: '2timothy', name: { chinese: '提摩太後書', english: '2 Timothy', pinyin: 'Tímótài Hòu Shū' }, testament: 'new', chapterCount: 4 },
  { id: 'titus', name: { chinese: '提多書', english: 'Titus', pinyin: 'Tíduō Shū' }, testament: 'new', chapterCount: 3 },
  { id: 'philemon', name: { chinese: '腓利門書', english: 'Philemon', pinyin: 'Féilìmén Shū' }, testament: 'new', chapterCount: 1 },
  { id: 'hebrews', name: { chinese: '希伯來書', english: 'Hebrews', pinyin: 'Xībólái Shū' }, testament: 'new', chapterCount: 13 },
  { id: 'james', name: { chinese: '雅各書', english: 'James', pinyin: 'Yǎgè Shū' }, testament: 'new', chapterCount: 5 },
  { id: '1peter', name: { chinese: '彼得前書', english: '1 Peter', pinyin: 'Bǐdé Qián Shū' }, testament: 'new', chapterCount: 5 },
  { id: '2peter', name: { chinese: '彼得後書', english: '2 Peter', pinyin: 'Bǐdé Hòu Shū' }, testament: 'new', chapterCount: 3 },
  { id: '1john', name: { chinese: '約翰一書', english: '1 John', pinyin: 'Yuēhàn Yī Shū' }, testament: 'new', chapterCount: 5 },
  { id: '2john', name: { chinese: '約翰二書', english: '2 John', pinyin: 'Yuēhàn Èr Shū' }, testament: 'new', chapterCount: 1 },
  { id: '3john', name: { chinese: '約翰三書', english: '3 John', pinyin: 'Yuēhàn Sān Shū' }, testament: 'new', chapterCount: 1 },
  { id: 'jude', name: { chinese: '猶大書', english: 'Jude', pinyin: 'Yóudà Shū' }, testament: 'new', chapterCount: 1 },
  { id: 'revelation', name: { chinese: '啟示錄', english: 'Revelation', pinyin: 'Qǐshìlù' }, testament: 'new', chapterCount: 22 },
];

// Helper functions
export function getBookById(id: string): Omit<Book, 'chapters'> | undefined {
  return BIBLE_BOOKS.find((book) => book.id === id);
}

export function getBooksByTestament(testament: 'old' | 'new'): Omit<Book, 'chapters'>[] {
  return BIBLE_BOOKS.filter((book) => book.testament === testament);
}

export function getOldTestamentBooks(): Omit<Book, 'chapters'>[] {
  return getBooksByTestament('old');
}

export function getNewTestamentBooks(): Omit<Book, 'chapters'>[] {
  return getBooksByTestament('new');
}
