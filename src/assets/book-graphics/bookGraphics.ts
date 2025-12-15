// Mapping of Bible book names to their corresponding SVG graphics
// These graphics are displayed at the beginning of each book (chapter 1)

import genesis from './genesis.svg';
import exodus from './exodus.svg';
import leviticus from './leviticus.svg';
import numbers from './numbers.svg';
import deuteronomy from './deuteronomy.svg';
import joshua from './joshua.svg';
import judges from './judges.svg';
import ruth from './ruth.svg';
import samuel1 from './1samuel.svg';
import samuel2 from './2samuel.svg';
import kings1 from './1kings.svg';
import kings2 from './2kings.svg';
import chronicles1 from './1chronicles.svg';
import chronicles2 from './2chronicles.svg';
import ezra from './ezra.svg';
import nehemiah from './nehemiah.svg';
import esther from './esther.svg';
import job from './job.svg';
import psalms from './psalms.svg';
import proverbs from './proverbs.svg';
import ecclesiastes from './ecclesiastes.svg';
import songofsolomon from './songofsolomon.svg';
import isaiah from './isaiah.svg';
import jeremiah from './jeremiah.svg';
import lamentations from './lamentations.svg';
import ezekiel from './ezekiel.svg';
import daniel from './daniel.svg';
import hosea from './hosea.svg';
import joel from './joel.svg';
import amos from './amos.svg';
import obadiah from './obadiah.svg';
import jonah from './jonah.svg';
import micah from './micah.svg';
import nahum from './nahum.svg';
import habakkuk from './habakkuk.svg';
import zephaniah from './zephaniah.svg';
import haggai from './haggai.svg';
import zechariah from './zechariah.svg';
import malachi from './malachi.svg';
import matthew from './matthew.svg';
import mark from './mark.svg';
import luke from './luke.svg';
import john from './john.svg';
import acts from './acts.svg';
import romans from './romans.svg';
import corinthians1 from './1corinthians.svg';
import corinthians2 from './2corinthians.svg';
import galatians from './galatians.svg';
import ephesians from './ephesians.svg';
import philippians from './philippians.svg';
import colossians from './colossians.svg';
import thessalonians1 from './1thessalonians.svg';
import thessalonians2 from './2thessalonians.svg';
import timothy1 from './1timothy.svg';
import timothy2 from './2timothy.svg';
import titus from './titus.svg';
import philemon from './philemon.svg';
import hebrews from './hebrews.svg';
import james from './james.svg';
import peter1 from './1peter.svg';
import peter2 from './2peter.svg';
import john1 from './1john.svg';
import john2 from './2john.svg';
import john3 from './3john.svg';
import jude from './jude.svg';
import revelation from './revelation.svg';

export const bookGraphics: Record<string, string> = {
  // Old Testament
  'Genesis': genesis,
  'Exodus': exodus,
  'Leviticus': leviticus,
  'Numbers': numbers,
  'Deuteronomy': deuteronomy,
  'Joshua': joshua,
  'Judges': judges,
  'Ruth': ruth,
  '1 Samuel': samuel1,
  '2 Samuel': samuel2,
  '1 Kings': kings1,
  '2 Kings': kings2,
  '1 Chronicles': chronicles1,
  '2 Chronicles': chronicles2,
  'Ezra': ezra,
  'Nehemiah': nehemiah,
  'Esther': esther,
  'Job': job,
  'Psalms': psalms,
  'Proverbs': proverbs,
  'Ecclesiastes': ecclesiastes,
  'Song of Solomon': songofsolomon,
  'Isaiah': isaiah,
  'Jeremiah': jeremiah,
  'Lamentations': lamentations,
  'Ezekiel': ezekiel,
  'Daniel': daniel,
  'Hosea': hosea,
  'Joel': joel,
  'Amos': amos,
  'Obadiah': obadiah,
  'Jonah': jonah,
  'Micah': micah,
  'Nahum': nahum,
  'Habakkuk': habakkuk,
  'Zephaniah': zephaniah,
  'Haggai': haggai,
  'Zechariah': zechariah,
  'Malachi': malachi,

  // New Testament
  'Matthew': matthew,
  'Mark': mark,
  'Luke': luke,
  'John': john,
  'Acts': acts,
  'Romans': romans,
  '1 Corinthians': corinthians1,
  '2 Corinthians': corinthians2,
  'Galatians': galatians,
  'Ephesians': ephesians,
  'Philippians': philippians,
  'Colossians': colossians,
  '1 Thessalonians': thessalonians1,
  '2 Thessalonians': thessalonians2,
  '1 Timothy': timothy1,
  '2 Timothy': timothy2,
  'Titus': titus,
  'Philemon': philemon,
  'Hebrews': hebrews,
  'James': james,
  '1 Peter': peter1,
  '2 Peter': peter2,
  '1 John': john1,
  '2 John': john2,
  '3 John': john3,
  'Jude': jude,
  'Revelation': revelation,
};
