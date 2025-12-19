/**
 * Bible Verse Preprocessor
 *
 * Uses Gemini Flash to pre-compute word segmentation, pinyin, and definitions
 * for all Bible verses. This runs once at build time, producing static JSON
 * that the app loads directly - no runtime dictionary lookups needed.
 *
 * Usage:
 *   npx ts-node scripts/preprocess-bible.ts --book matthew
 *   npx ts-node scripts/preprocess-bible.ts --book matthew --chapter 1
 *   npx ts-node scripts/preprocess-bible.ts --all
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

// Load .env file
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Types
interface CharacterBreakdown {
  c: string;      // Character
  m: string;      // Meaning
}

interface ProcessedWord {
  chinese: string;
  pinyin: string;
  definition: string;
  pos?: string;              // Part of speech: n=noun, v=verb, adj=adjective, adv=adverb, prep=preposition, conj=conjunction, part=particle, mw=measure word, pron=pronoun, num=numeral
  isName?: boolean;
  nameType?: 'person' | 'place' | 'group';  // For names: person, place, or group
  breakdown?: CharacterBreakdown[];         // Character-by-character meaning for compounds
  freq?: 'common' | 'uncommon' | 'rare' | 'biblical';  // Frequency in modern Chinese
  note?: string;             // Usage note, context, or insight
}

interface ProcessedVerse {
  number: number;
  text: string;
  words: ProcessedWord[];
  heading?: string;  // Section heading from NET Bible
}

// Section headings from NET Bible
interface SectionHeading {
  verse: number;
  heading: string;
}

interface SectionHeadingsData {
  [book: string]: {
    [chapter: string]: SectionHeading[];
  };
}

interface ProcessedChapter {
  book: string;
  bookId: string;
  chapter: number;
  verses: ProcessedVerse[];
  processedAt: string;
}

interface FHLVerseRecord {
  book: number;
  engs: string;
  chap: number;
  sec: number;
  chineses: string;
}

// OpenRouter API interface
interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  error?: {
    message: string;
  };
}

// Book mappings using Chinese abbreviations (same as app's bibleApi.ts)
// Complete 66-book Bible
const BOOK_MAPPINGS: Record<string, { abbrev: string; chapters: number }> = {
  // Old Testament (39 books)
  'genesis': { abbrev: '創', chapters: 50 },
  'exodus': { abbrev: '出', chapters: 40 },
  'leviticus': { abbrev: '利', chapters: 27 },
  'numbers': { abbrev: '民', chapters: 36 },
  'deuteronomy': { abbrev: '申', chapters: 34 },
  'joshua': { abbrev: '書', chapters: 24 },
  'judges': { abbrev: '士', chapters: 21 },
  'ruth': { abbrev: '得', chapters: 4 },
  '1samuel': { abbrev: '撒上', chapters: 31 },
  '2samuel': { abbrev: '撒下', chapters: 24 },
  '1kings': { abbrev: '王上', chapters: 22 },
  '2kings': { abbrev: '王下', chapters: 25 },
  '1chronicles': { abbrev: '代上', chapters: 29 },
  '2chronicles': { abbrev: '代下', chapters: 36 },
  'ezra': { abbrev: '拉', chapters: 10 },
  'nehemiah': { abbrev: '尼', chapters: 13 },
  'esther': { abbrev: '斯', chapters: 10 },
  'job': { abbrev: '伯', chapters: 42 },
  'psalms': { abbrev: '詩', chapters: 150 },
  'proverbs': { abbrev: '箴', chapters: 31 },
  'ecclesiastes': { abbrev: '傳', chapters: 12 },
  'songofsolomon': { abbrev: '歌', chapters: 8 },
  'isaiah': { abbrev: '賽', chapters: 66 },
  'jeremiah': { abbrev: '耶', chapters: 52 },
  'lamentations': { abbrev: '哀', chapters: 5 },
  'ezekiel': { abbrev: '結', chapters: 48 },
  'daniel': { abbrev: '但', chapters: 12 },
  'hosea': { abbrev: '何', chapters: 14 },
  'joel': { abbrev: '珥', chapters: 3 },
  'amos': { abbrev: '摩', chapters: 9 },
  'obadiah': { abbrev: '俄', chapters: 1 },
  'jonah': { abbrev: '拿', chapters: 4 },
  'micah': { abbrev: '彌', chapters: 7 },
  'nahum': { abbrev: '鴻', chapters: 3 },
  'habakkuk': { abbrev: '哈', chapters: 3 },
  'zephaniah': { abbrev: '番', chapters: 3 },
  'haggai': { abbrev: '該', chapters: 2 },
  'zechariah': { abbrev: '亞', chapters: 14 },
  'malachi': { abbrev: '瑪', chapters: 4 },
  // New Testament (27 books)
  'matthew': { abbrev: '太', chapters: 28 },
  'mark': { abbrev: '可', chapters: 16 },
  'luke': { abbrev: '路', chapters: 24 },
  'john': { abbrev: '約', chapters: 21 },
  'acts': { abbrev: '徒', chapters: 28 },
  'romans': { abbrev: '羅', chapters: 16 },
  '1corinthians': { abbrev: '林前', chapters: 16 },
  '2corinthians': { abbrev: '林後', chapters: 13 },
  'galatians': { abbrev: '加', chapters: 6 },
  'ephesians': { abbrev: '弗', chapters: 6 },
  'philippians': { abbrev: '腓', chapters: 4 },
  'colossians': { abbrev: '西', chapters: 4 },
  '1thessalonians': { abbrev: '帖前', chapters: 5 },
  '2thessalonians': { abbrev: '帖後', chapters: 3 },
  '1timothy': { abbrev: '提前', chapters: 6 },
  '2timothy': { abbrev: '提後', chapters: 4 },
  'titus': { abbrev: '多', chapters: 3 },
  'philemon': { abbrev: '門', chapters: 1 },
  'hebrews': { abbrev: '來', chapters: 13 },
  'james': { abbrev: '雅', chapters: 5 },
  '1peter': { abbrev: '彼前', chapters: 5 },
  '2peter': { abbrev: '彼後', chapters: 3 },
  '1john': { abbrev: '約一', chapters: 5 },
  '2john': { abbrev: '約二', chapters: 1 },
  '3john': { abbrev: '約三', chapters: 1 },
  'jude': { abbrev: '猶', chapters: 1 },
  'revelation': { abbrev: '啟', chapters: 22 },
};

// Configuration
const CONFIG = {
  apiKey: process.env.OPENROUTER_API_KEY || '',
  model: 'google/gemini-2.5-flash', // Gemini 2.5 Flash via OpenRouter
  apiUrl: 'https://openrouter.ai/api/v1/chat/completions',
  outputDir: path.join(__dirname, '../public/data/preprocessed'),
  batchSize: 5, // Verses per API call
  smallBatchSize: 2, // Smaller batch for problematic chapters
  delayBetweenBatches: 1000, // ms - respect rate limits
  maxRetries: 3,
};

// Chapters that consistently fail with normal batch size (JSON truncation issues)
// These need smaller batch sizes to avoid hitting model output limits
const PROBLEMATIC_CHAPTERS: Record<string, number[]> = {
  'isaiah': [66],
  'jeremiah': [49],
  'ezekiel': [32],
};

// Load section headings from NET Bible data
function loadSectionHeadings(): SectionHeadingsData {
  const headingsPath = path.join(__dirname, '../public/data/section-headings.json');
  if (fs.existsSync(headingsPath)) {
    const data = JSON.parse(fs.readFileSync(headingsPath, 'utf-8'));
    console.log('Loaded section headings from NET Bible');
    return data;
  }
  console.log('Warning: Section headings file not found');
  return {};
}

// Get heading for a specific verse
function getHeadingForVerse(
  sectionHeadings: SectionHeadingsData,
  bookId: string,
  chapter: number,
  verseNum: number
): string | undefined {
  const bookHeadings = sectionHeadings[bookId];
  if (!bookHeadings) return undefined;

  const chapterHeadings = bookHeadings[String(chapter)];
  if (!chapterHeadings) return undefined;

  const heading = chapterHeadings.find(h => h.verse === verseNum);
  return heading?.heading;
}

// Global section headings data
let SECTION_HEADINGS: SectionHeadingsData = {};

function getEffectiveBatchSize(bookId: string, chapter: number): number {
  const chapters = PROBLEMATIC_CHAPTERS[bookId];
  if (chapters && chapters.includes(chapter)) {
    console.log(`  Using small batch size (${CONFIG.smallBatchSize}) for ${bookId} ${chapter} (known problematic chapter)`);
    return CONFIG.smallBatchSize;
  }
  return CONFIG.batchSize;
}

// Validate API key
function validateApiKey() {
  if (!CONFIG.apiKey) {
    console.error('Error: OPENROUTER_API_KEY environment variable not set');
    console.error('Get your API key from: https://openrouter.ai/keys');
    process.exit(1);
  }
  console.log('OpenRouter API key configured');
}

// Fetch verses from FHL API using Chinese abbreviation
async function fetchChapter(abbrev: string, chapter: number): Promise<FHLVerseRecord[]> {
  const url = `https://bible.fhl.net/json/qb.php?chineses=${encodeURIComponent(abbrev)}&chap=${chapter}&version=ncv&gb=0`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch chapter: ${response.statusText}`);
  }

  const data = await response.json();
  return data.record || [];
}

// Strip HTML tags and cross-references from text
function stripHtml(text: string): string {
  let cleaned = text
    // MOST ROBUST: Remove section headers entirely (they contain cross-references)
    // Headers like <h3>Section Title（cross-refs）</h3> should be removed completely
    .replace(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/gi, '')
    // Remove any other HTML tags (but keep their content)
    .replace(/<[^>]*>/g, '')
    // Fallback: Remove any remaining parenthetical cross-references
    // Pattern: (書名 chapter:verse) or variations
    .replace(/[（(][^）)]*[\u4e00-\u9fff]{1,4}\s*\d+[:：]\s*\d+[^）)]*[）)]/g, '')
    // Remove parenthetical book abbreviation lists like （路得代上） or （參路3:23）
    // These are cross-references without chapter:verse or with just book names
    .replace(/[（(][\s參]*[\u4e00-\u9fff上下]{1,6}(?:[\s；、，,;。．.]*[\u4e00-\u9fff上下]{1,6})*[\s。．.]*[）)]/g, '')
    // Remove isolated cross-references with ranges
    .replace(/[\u4e00-\u9fff]{1,4}\s*\d+\s*[:：]\s*\d+\s*[~～]\s*\d+/g, '')
    // Remove isolated cross-references
    .replace(/[\u4e00-\u9fff]{1,4}\s*\d+\s*[:：]\s*\d+/g, '');

  // Remove duplicated section header text
  // The NCV translation duplicates headers like "耶穌基督的降生耶穌基督的降生是這樣的"
  // We detect phrases 3-15 chars that repeat immediately and remove the first occurrence
  cleaned = removeDuplicatedHeaders(cleaned);

  // Clean up any extra whitespace
  return cleaned.trim().replace(/\s+/g, ' ');
}

// Remove duplicated section header text from verse content
// Example: "耶穌基督的降生耶穌基督的降生是這樣的" -> "耶穌基督的降生是這樣的"
function removeDuplicatedHeaders(text: string): string {
  // Pattern: 3-15 Chinese characters that repeat immediately at the start
  // The header from <h3> gets prepended, then the verse text starts with the same phrase
  const match = text.match(/^([\u4e00-\u9fff]{3,15})\1/);
  if (match) {
    // Remove the first (duplicated) occurrence
    return text.slice(match[1].length);
  }

  // Also check for near-duplicates where the second occurrence has slight variation
  // e.g., "問安問安為基督" -> second "問安" is part of actual verse
  // We look for 2-8 char phrases that repeat
  const shortMatch = text.match(/^([\u4e00-\u9fff]{2,8})\1/);
  if (shortMatch) {
    return text.slice(shortMatch[1].length);
  }

  return text;
}

// Build the prompt for Gemini
function buildPrompt(verses: FHLVerseRecord[]): string {
  // Use bible_text which contains the full verse text, strip HTML
  const versesText = verses.map(v => {
    const rawText = (v as any).bible_text || v.chineses;
    return `${v.sec}. ${stripHtml(rawText)}`;
  }).join('\n');

  return `You are a Chinese-English Bible translation assistant helping learners study scripture. For each verse below, segment the Chinese text into meaningful words and provide comprehensive learning data.

SEGMENTATION RULES:
1. Keep names together as single units (e.g., 亞伯拉罕, 耶穌基督, 馬利亞)
2. Keep compound words together (e.g., 天國, 福音, 聖靈, 門徒)
3. Keep verb-object compounds together when they form a unit (e.g., 禱告, 傳道)
4. Include punctuation as separate entries with empty fields

FOR EACH WORD, PROVIDE:
1. "chinese": The Chinese word/phrase
2. "pinyin": Pinyin with tone marks (e.g., Yēsū not Yesu)
3. "definition": Concise English meaning (1-5 words), contextually appropriate
4. "pos": Part of speech code:
   - n=noun, v=verb, adj=adjective, adv=adverb
   - prep=preposition, conj=conjunction, part=particle
   - mw=measure word, pron=pronoun, num=numeral, prop=proper noun
5. "isName": true if it's a name (person, place, or group)
6. "nameType": For names only - "person", "place", or "group"
7. "breakdown": For 2+ character words, array of {c: character, m: meaning}
   - Only include if breakdown adds insight (skip for names/transliterations)
8. "freq": Frequency in modern Chinese: "common", "uncommon", "rare", or "biblical"
   - "biblical" = primarily used in religious contexts
9. "note": Optional brief insight (etymology, usage context, or cultural note)
   - Keep under 15 words, only if genuinely helpful

VERSES:
${versesText}

EXAMPLE OUTPUT FORMAT:
[
  {
    "verse": 1,
    "words": [
      {"chinese": "福音", "pinyin": "fúyīn", "definition": "gospel, good news", "pos": "n", "breakdown": [{"c": "福", "m": "blessing"}, {"c": "音", "m": "news"}], "freq": "biblical", "note": "Lit. 'blessed news'"},
      {"chinese": "耶穌", "pinyin": "Yēsū", "definition": "Jesus", "pos": "prop", "isName": true, "nameType": "person", "freq": "biblical"},
      {"chinese": "的", "pinyin": "de", "definition": "possessive particle", "pos": "part", "freq": "common"},
      {"chinese": "，", "pinyin": "", "definition": ""}
    ]
  }
]

Respond with ONLY valid JSON array, no markdown or explanation.`;
}

// Process verses with OpenRouter (Gemini via OpenRouter)
async function processVersesWithGemini(
  verses: FHLVerseRecord[]
): Promise<Map<number, ProcessedWord[]>> {
  const prompt = buildPrompt(verses);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < CONFIG.maxRetries; attempt++) {
    try {
      const response = await fetch(CONFIG.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CONFIG.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://bilingual-bible.app',
          'X-Title': 'Bilingual Bible Preprocessor',
        },
        body: JSON.stringify({
          model: CONFIG.model,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 16000,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error ${response.status}: ${errorText}`);
      }

      const data = (await response.json()) as OpenRouterResponse;

      if (data.error) {
        throw new Error(`OpenRouter error: ${data.error.message}`);
      }

      const text = data.choices[0]?.message?.content || '';

      // Clean up response (remove markdown code blocks if present)
      let jsonText = text.trim();
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
      }

      const parsed = JSON.parse(jsonText) as Array<{
        verse: number;
        words: ProcessedWord[];
      }>;

      const resultMap = new Map<number, ProcessedWord[]>();
      for (const item of parsed) {
        resultMap.set(item.verse, item.words);
      }

      return resultMap;
    } catch (error) {
      lastError = error as Error;
      console.warn(`  Attempt ${attempt + 1} failed: ${lastError.message}`);

      if (attempt < CONFIG.maxRetries - 1) {
        await sleep(2000 * (attempt + 1)); // Exponential backoff
      }
    }
  }

  throw lastError || new Error('Failed to process verses');
}

// Process a single chapter
async function processChapter(
  bookId: string,
  bookName: string,
  abbrev: string,
  chapterNum: number
): Promise<ProcessedChapter> {
  console.log(`Processing ${bookName} chapter ${chapterNum}...`);

  // Fetch verses from API using Chinese abbreviation
  const verses = await fetchChapter(abbrev, chapterNum);
  if (verses.length === 0) {
    throw new Error(`No verses found for ${bookName} ${chapterNum}`);
  }

  console.log(`  Fetched ${verses.length} verses`);

  // Get effective batch size (smaller for known problematic chapters)
  const effectiveBatchSize = getEffectiveBatchSize(bookId, chapterNum);

  // Process in batches
  const processedVerses: ProcessedVerse[] = [];

  for (let i = 0; i < verses.length; i += effectiveBatchSize) {
    const batch = verses.slice(i, i + effectiveBatchSize);
    console.log(`  Processing verses ${i + 1}-${Math.min(i + effectiveBatchSize, verses.length)}...`);

    const wordsMap = await processVersesWithGemini(batch);

    for (const verse of batch) {
      const words = wordsMap.get(verse.sec);
      if (!words) {
        console.warn(`  Warning: No words returned for verse ${verse.sec}`);
        continue;
      }

      // Check for section heading at this verse
      const heading = getHeadingForVerse(SECTION_HEADINGS, bookId, chapterNum, verse.sec);

      const processedVerse: ProcessedVerse = {
        number: verse.sec,
        text: stripHtml((verse as any).bible_text || verse.chineses),
        words,
      };

      if (heading) {
        processedVerse.heading = heading;
      }

      processedVerses.push(processedVerse);
    }

    // Rate limiting
    if (i + effectiveBatchSize < verses.length) {
      await sleep(CONFIG.delayBetweenBatches);
    }
  }

  return {
    book: bookName,
    bookId,
    chapter: chapterNum,
    verses: processedVerses,
    processedAt: new Date().toISOString(),
  };
}

// Save processed chapter to JSON
function saveChapter(chapter: ProcessedChapter): void {
  const dir = path.join(CONFIG.outputDir, chapter.bookId);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const filePath = path.join(dir, `chapter-${chapter.chapter}.json`);
  fs.writeFileSync(filePath, JSON.stringify(chapter, null, 2));

  console.log(`  Saved to ${filePath}`);
}

// Helper
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main entry point
async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  let bookId: string | null = null;
  let chapterNum: number | null = null;
  let startChapter: number | null = null;
  let processAll = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--book' && args[i + 1]) {
      bookId = args[i + 1].toLowerCase();
      i++;
    } else if (args[i] === '--chapter' && args[i + 1]) {
      chapterNum = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--start' && args[i + 1]) {
      startChapter = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--all') {
      processAll = true;
    }
  }

  if (!bookId && !processAll) {
    console.log('Usage:');
    console.log('  npx ts-node scripts/preprocess-bible.ts --book matthew');
    console.log('  npx ts-node scripts/preprocess-bible.ts --book matthew --chapter 1');
    console.log('  npx ts-node scripts/preprocess-bible.ts --book matthew --start 5  (resume from chapter 5)');
    console.log('  npx ts-node scripts/preprocess-bible.ts --all');
    console.log('\nAvailable books:', Object.keys(BOOK_MAPPINGS).join(', '));
    process.exit(1);
  }

  // Validate API key
  validateApiKey();
  console.log('Initialized OpenRouter API (Gemini 2.5 Flash)');

  // Load section headings
  SECTION_HEADINGS = loadSectionHeadings();

  // Ensure output directory exists
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  // Process books
  const booksToProcess = processAll
    ? Object.keys(BOOK_MAPPINGS)
    : [bookId!];

  for (const book of booksToProcess) {
    const mapping = BOOK_MAPPINGS[book];
    if (!mapping) {
      console.error(`Unknown book: ${book}`);
      continue;
    }

    let chaptersToProcess: number[];
    if (chapterNum) {
      chaptersToProcess = [chapterNum];
    } else if (startChapter) {
      chaptersToProcess = Array.from(
        { length: mapping.chapters - startChapter + 1 },
        (_, i) => startChapter + i
      );
    } else {
      chaptersToProcess = Array.from({ length: mapping.chapters }, (_, i) => i + 1);
    }

    console.log(`\nProcessing ${book} (${chaptersToProcess.length} chapters)`);

    for (const chapter of chaptersToProcess) {
      try {
        const processed = await processChapter(
          book,
          book.charAt(0).toUpperCase() + book.slice(1),
          mapping.abbrev,
          chapter
        );

        saveChapter(processed);

        // Stats
        const wordCount = processed.verses.reduce((sum, v) => sum + v.words.length, 0);
        console.log(`  Chapter ${chapter}: ${processed.verses.length} verses, ${wordCount} words`);

      } catch (error) {
        console.error(`  Error processing chapter ${chapter}:`, error);
      }
    }
  }

  console.log('\nDone!');
}

// Run
main().catch(console.error);
