import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Remove embedded section headers from verse text for cleaner audio narration.
 *
 * The NCV translation embeds Chinese section headers at the start of certain verses.
 * These headers appear in two patterns:
 *
 * 1. Immediate duplicate: "耶穌基督的降生耶穌基督的降生是這樣的"
 *    Header repeats immediately at position 0 and len(header)
 *
 * 2. Bookend duplicate: "耶穌基督的家譜大衛的子孫...耶穌基督的家譜："
 *    Header at position 0 appears again later in the verse
 *
 * This function finds the longest Chinese prefix that appears again later
 * in the text and strips it, as it's the embedded header.
 *
 * @param text - The verse text
 * @param hasHeading - Whether this verse has a section heading (from preprocessed data)
 */
function stripEmbeddedHeader(text: string, hasHeading: boolean): string {
  // Only attempt header removal on verses that have a heading field
  // This prevents false positives on verses without headers
  if (!hasHeading) return text;

  // Find the longest Chinese-only prefix that appears again later in the text
  let headerLen = 0;

  for (let len = 3; len <= 20 && len < text.length / 2; len++) {
    const prefix = text.slice(0, len);

    // Only consider pure Chinese character prefixes
    // Stop if we hit punctuation or other characters
    if (!/^[\u4e00-\u9fff]+$/.test(prefix)) break;

    // Check if this prefix appears again later in the text
    const laterIndex = text.indexOf(prefix, len);
    if (laterIndex !== -1) {
      headerLen = len; // Found a repeating prefix, remember it
      // Continue to find longer matches
    }
  }

  if (headerLen > 0) {
    console.log(`  [Header] Stripped "${text.slice(0, headerLen)}" from verse`);
    return text.slice(headerLen);
  }

  return text;
}

// Load API keys from environment variables (never hardcode!)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

if (!GEMINI_API_KEY || !ELEVENLABS_API_KEY) {
  console.error('Error: Missing required environment variables.');
  console.error('Set GEMINI_API_KEY and ELEVENLABS_API_KEY in your .env.local file');
  process.exit(1);
}

// Voice mapping configuration
interface VoiceMapping {
  [book: string]: {
    [chapterRange: string]: {
      voiceId: string;
      voiceName: string;
    };
  };
}

// ============================================================================
// 8 APPROVED VOICES FOR BILINGUAL BIBLE AUDIO
// ============================================================================
// Taiwan Mandarin voices (3):
//   - Kevin Tu: Calm, steady male - theological teaching
//   - Anna Su Video: Clear, trustworthy female - narrative, instruction
//   - Chihiro Yoko: Soothing, sweet female - storytelling, intimate
//
// Multilingual voices (5):
//   - George: Warm, authoritative male - teaching, dramatic, pronouncements
//   - Liam: Young, articulate male - dynamic action, energetic
//   - Charlie: Natural, conversational male - dialogue, pastoral, epistles
//   - Relaxed Renee: Refreshing, relaxing female - psalms, poetry, meditative
//   - Angela: Warm female - tender moments, comfort passages
// ============================================================================

const VOICES = {
  // Taiwan Mandarin voices
  KEVIN_TU: { voiceId: 'BrbEfHMQu0fyclQR7lfh', voiceName: 'Kevin Tu' },       // Calm, steady male
  ANNA_SU: { voiceId: 'r6qgCCGI7RWKXCagm158', voiceName: 'Anna Su Video' },   // Clear, trustworthy female
  CHIHIRO: { voiceId: 'NIqnuIdrAT3LLSSxN05L', voiceName: 'Chihiro Yoko' },    // Soothing, sweet female
  // Multilingual voices
  GEORGE: { voiceId: 'JBFqnCBsd6RMkjVDRZzb', voiceName: 'George' },           // Warm, authoritative male
  LIAM: { voiceId: 'TX3LPaxmHKxFdv7VOQHJ', voiceName: 'Liam' },               // Young, articulate male
  CHARLIE: { voiceId: 'IKne3meq5aSn9XLyUdCD', voiceName: 'Charlie' },         // Natural, conversational male
  RENEE: { voiceId: 'mgpcWiEXIWuENJCy8ADX', voiceName: 'Relaxed Renee' },     // Refreshing, relaxing female
  ANGELA: { voiceId: 'lqydY2xVUkg9cEIFmFMU', voiceName: 'Angela' },           // Warm female
};

// ============================================================================
// VOICE ROTATION PLAN FOR ALL 27 NEW TESTAMENT BOOKS
// ============================================================================
// Design principles:
// 1. Rotate voices every 3-7 chapters to prevent monotony
// 2. Match voice characteristics to content type
// 3. Balance usage across all 6 Taiwan Mandarin voices (~43 chapters each)
// 4. Neil Chuang for dramatic/authoritative, Kevin Tu for teaching,
//    Evan for pastoral, Yui for tender, Anna Su for narrative, Chihiro for intimate
// ============================================================================

const VOICE_MAPPINGS: VoiceMapping = {
  // ============================================================================
  // GOSPELS (89 chapters) - Narrative/storytelling focus, female-heavy
  // ============================================================================

  // MATTHEW (28 chapters) - Teaching-heavy Gospel with Sermon on Mount
  matthew: {
    '1-4': VOICES.ANNA_SU,       // Genealogy, birth, temptation - clear narrative
    '5-7': VOICES.KEVIN_TU,      // Sermon on Mount - calm theological teaching
    '8-10': VOICES.ANNA_SU,      // Miracles & sending disciples - clear narrative
    '11-13': VOICES.RENEE,       // Parables & teachings - meditative
    '14-17': VOICES.CHIHIRO,     // Peter's confession, Transfiguration - intimate
    '18-20': VOICES.ANGELA,      // Community teachings - warm instruction
    '21-24': VOICES.GEORGE,      // Temple confrontation, Olivet - authoritative
    '25-28': VOICES.KEVIN_TU,    // Final teachings, Passion - steady teaching
  },

  // MARK (16 chapters) - Fast-paced action Gospel
  mark: {
    '1-4': VOICES.CHIHIRO,       // Rapid ministry beginnings - storytelling
    '5-8': VOICES.ANNA_SU,       // Miracles & mission - clear storytelling
    '9-12': VOICES.CHARLIE,      // Transfiguration to Temple - warm
    '13-16': VOICES.GEORGE,      // Olivet discourse, Passion - dramatic
  },

  // LUKE (24 chapters) - Tender, compassionate Gospel
  luke: {
    '1-2': VOICES.ANGELA,        // Birth narratives - warm tender
    '3-6': VOICES.CHARLIE,       // Ministry beginnings - warm soothing
    '7-10': VOICES.CHIHIRO,      // Parables of mercy - sweet storytelling
    '11-14': VOICES.ANNA_SU,     // Teaching journeys - clear instruction
    '15-18': VOICES.RENEE,       // Lost parables, Rich man - meditative
    '19-21': VOICES.KEVIN_TU,    // Jerusalem entry, Temple - measured
    '22-24': VOICES.GEORGE,      // Passion & resurrection - climactic
  },

  // JOHN (21 chapters) - Theological, intimate Gospel
  john: {
    '1-3': VOICES.ANNA_SU,       // Prologue, Nicodemus - clear trustworthy
    '4-6': VOICES.ANGELA,        // Woman at well, Bread of Life - warm gentle
    '7-9': VOICES.GEORGE,        // Feast conflicts - authoritative
    '10-12': VOICES.CHIHIRO,     // Good Shepherd, Lazarus - intimate
    '13-17': VOICES.CHIHIRO,     // Upper Room, High Priestly Prayer - intimate
    '18-21': VOICES.GEORGE,      // Passion & resurrection - dramatic
  },

  // ============================================================================
  // ACTS (28 chapters) - Historical narrative, adventure
  // ============================================================================
  acts: {
    '1-4': VOICES.GEORGE,        // Ascension, Pentecost - authority
    '5-7': VOICES.KEVIN_TU,      // Persecution, Stephen - measured
    '8-10': VOICES.ANNA_SU,      // Philip, Paul's conversion - clear narrative
    '11-14': VOICES.ANGELA,      // Church expansion - warm
    '15-18': VOICES.CHIHIRO,     // Jerusalem council, journeys - storytelling
    '19-22': VOICES.ANNA_SU,     // Ephesus riot, Paul's defense - clear
    '23-25': VOICES.GEORGE,      // Trials before governors - authoritative
    '26-28': VOICES.KEVIN_TU,    // Defense to Agrippa, Rome - measured
  },

  // ============================================================================
  // PAULINE EPISTLES - One male voice per book
  // ============================================================================

  // ROMANS (16 chapters) - Kevin Tu: systematic theology, calm teaching
  romans: {
    '1-16': VOICES.KEVIN_TU,
  },

  // 1 CORINTHIANS (16 chapters) - George: authoritative correction
  '1corinthians': {
    '1-16': VOICES.GEORGE,
  },

  // 2 CORINTHIANS (13 chapters) - Charlie: personal, emotional
  '2corinthians': {
    '1-13': VOICES.CHARLIE,
  },

  // GALATIANS (6 chapters) - George: passionate defense
  galatians: {
    '1-6': VOICES.GEORGE,
  },

  // EPHESIANS (6 chapters) - Kevin Tu: theological depth
  ephesians: {
    '1-6': VOICES.KEVIN_TU,
  },

  // PHILIPPIANS (4 chapters) - Charlie: warm, joyful
  philippians: {
    '1-4': VOICES.CHARLIE,
  },

  // COLOSSIANS (4 chapters) - Liam: dynamic Christ hymn
  colossians: {
    '1-4': VOICES.LIAM,
  },

  // 1 THESSALONIANS (5 chapters) - Charlie: encouraging
  '1thessalonians': {
    '1-5': VOICES.CHARLIE,
  },

  // 2 THESSALONIANS (3 chapters) - Kevin Tu: corrective teaching
  '2thessalonians': {
    '1-3': VOICES.KEVIN_TU,
  },

  // 1 TIMOTHY (6 chapters) - Liam: instructions to young Timothy
  '1timothy': {
    '1-6': VOICES.LIAM,
  },

  // 2 TIMOTHY (4 chapters) - Charlie: tender farewell
  '2timothy': {
    '1-4': VOICES.CHARLIE,
  },

  // TITUS (3 chapters) - Kevin Tu: practical instruction
  titus: {
    '1-3': VOICES.KEVIN_TU,
  },

  // PHILEMON (1 chapter) - Charlie: personal appeal
  philemon: {
    '1-1': VOICES.CHARLIE,
  },

  // ============================================================================
  // GENERAL EPISTLES - One male voice per book
  // ============================================================================

  // HEBREWS (13 chapters) - George: sophisticated, authoritative
  hebrews: {
    '1-13': VOICES.GEORGE,
  },

  // JAMES (5 chapters) - Kevin Tu: practical wisdom
  james: {
    '1-5': VOICES.KEVIN_TU,
  },

  // 1 PETER (5 chapters) - Charlie: comfort in suffering
  '1peter': {
    '1-5': VOICES.CHARLIE,
  },

  // 2 PETER (3 chapters) - George: warning
  '2peter': {
    '1-3': VOICES.GEORGE,
  },

  // 1 JOHN (5 chapters) - Liam: dynamic love letter
  '1john': {
    '1-5': VOICES.LIAM,
  },

  // 2 JOHN (1 chapter) - Liam: brief, personal
  '2john': {
    '1-1': VOICES.LIAM,
  },

  // 3 JOHN (1 chapter) - Liam: personal
  '3john': {
    '1-1': VOICES.LIAM,
  },

  // JUDE (1 chapter) - George: urgent warning
  jude: {
    '1-1': VOICES.GEORGE,
  },

  // ============================================================================
  // REVELATION (22 chapters) - All male, apocalyptic drama
  // ============================================================================
  revelation: {
    '1-3': VOICES.GEORGE,        // Vision of Christ, letters - authoritative
    '4-7': VOICES.GEORGE,        // Throne, seals - dramatic majesty
    '8-11': VOICES.KEVIN_TU,     // Trumpets - measured intensity
    '12-14': VOICES.LIAM,        // Dragon, beasts, harvest - energetic
    '15-18': VOICES.GEORGE,      // Bowls, Babylon - judgment
    '19-20': VOICES.CHARLIE,     // Christ returns, millennium - triumphant
    '21-22': VOICES.KEVIN_TU,    // New creation, finale - peaceful
  },
};

function getVoiceForChapter(bookName: string, chapterNum: number): { voiceId: string; voiceName: string } {
  const bookMapping = VOICE_MAPPINGS[bookName.toLowerCase()];

  if (!bookMapping) {
    // Default voice if book not in mapping (Neil Chuang - deep, authoritative)
    return VOICES.GEORGE;
  }

  // Find the appropriate range for this chapter
  for (const [range, voice] of Object.entries(bookMapping)) {
    const [start, end] = range.split('-').map(Number);
    if (chapterNum >= start && chapterNum <= end) {
      return voice;
    }
  }

  // Default if no range matches (Neil Chuang - deep, authoritative)
  return VOICES.GEORGE;
}

interface EmotionSection {
  start: number;
  end: number;
  emotion: string;
  reasoning: string;
}

interface VerseData {
  number: number;
  text: string;
  heading?: string; // Section heading from NET Bible (indicates verse has embedded header)
}

interface WordAlignment {
  word: string;
  start: number;
  end: number;
}

async function analyzeEmotionalSections(
  verses: VerseData[],
  bookName: string,
  chapterNum: number
): Promise<EmotionSection[]> {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: 'gemini-3-flash-preview',
    generationConfig: {
      temperature: 0.4,
    }
  });

  const versesText = verses
    .map(v => `Verse ${v.number}: ${v.text}`)
    .join('\n');

  const prompt = `Analyze this biblical passage and identify natural emotional sections for text-to-speech narration.

Book: ${bookName} Chapter ${chapterNum}

${versesText}

Identify sections with distinct emotional tones. DO NOT artificially limit yourself to 3-5 sections - identify as many natural tone shifts as exist in the text. Short chapters might have 2-3 sections, longer chapters with many themes might have 8-10 or more.

Available emotions:
- dramatic: Intense, powerful declarations or confrontations
- gentle: Soft, tender, comforting passages
- whisper: Intimate, quiet, reverent moments
- awe: Majestic, wonder-filled, worshipful
- excited: Joyful, energetic, celebratory
- calm: Peaceful, steady, measured teaching
- majestic: Grand, authoritative, divine proclamations
- sad: Sorrowful, mourning, lament
- joyful: Happy, uplifting, hopeful

Return ONLY a JSON array with this structure:
[
  {
    "start": 1,
    "end": 5,
    "emotion": "dramatic",
    "reasoning": "Opening confrontation with strong language"
  },
  ...
]

Guidelines:
- Each section should span 1 or more verses
- Sections must be consecutive (no gaps)
- Choose the emotion that best fits the overall tone of each section
- Provide brief reasoning for each choice
- Let the content guide the number of sections - don't artificially limit or expand`;

  console.log('\nAnalyzing emotional sections with Gemini...');
  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  // Extract JSON from response (may be wrapped in markdown code blocks)
  const jsonMatch = responseText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from Gemini response');
  }

  const sections = JSON.parse(jsonMatch[0]) as EmotionSection[];

  console.log('\nIdentified emotion sections:');
  sections.forEach(section => {
    console.log(`  Verses ${section.start}-${section.end}: ${section.emotion}`);
    console.log(`    → ${section.reasoning}`);
  });

  return sections;
}

/**
 * Apply pronunciation fixes for ElevenLabs TTS.
 *
 * ElevenLabs' Chinese voices mispronounce certain characters, especially
 * uncommon ones used in biblical transliterations. This function substitutes
 * problem characters with phonetically equivalent alternatives.
 *
 * The displayed text remains unchanged - only TTS input is modified.
 */
function applyPronunciationFixes(text: string): string {
  // 耶穌 (Yēsū) - ElevenLabs mispronounces 穌 as "shoun" instead of "sū"
  // 蘇 is a common character (Suzhou, surname) with correct pronunciation
  return text.replace(/耶穌/g, '耶蘇');
}

function buildEmotionTaggedText(verses: VerseData[], sections: EmotionSection[]): string {
  let fullText = '';

  for (const section of sections) {
    // Add emotion tag at the start of this section
    fullText += `[${section.emotion}] `;

    // Add all verses in this section
    const sectionVerses = verses.filter(
      v => v.number >= section.start && v.number <= section.end
    );

    // Strip embedded section headers from verses before TTS
    // Only strips from verses that have a 'heading' field (indicating embedded header)
    // Then apply pronunciation fixes for ElevenLabs
    const processedText = sectionVerses
      .map(v => applyPronunciationFixes(stripEmbeddedHeader(v.text, !!v.heading)))
      .join(' ');
    fullText += processedText;
    fullText += ' ';
  }

  return fullText.trim();
}

async function generateAudioWithElevenLabs(
  text: string,
  outputPath: string,
  voiceId: string,
  voiceName: string,
  maxRetries: number = 3
): Promise<WordAlignment[]> {
  console.log('\nGenerating audio with ElevenLabs...');
  console.log(`Voice: ${voiceName} (${voiceId})`);
  console.log(`Text length: ${text.length} characters`);

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    if (attempt > 1) {
      console.log(`\n⟳ Retry attempt ${attempt}/${maxRetries} (request failed)...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': ELEVENLABS_API_KEY,
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_v3',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              style: 0.5,
              use_speaker_boost: true,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
      }

      const data = await response.json();

      // Save audio file temporarily to check actual duration
      const audioBuffer = Buffer.from(data.audio_base64, 'base64');
      const tempPath = outputPath + '.temp.mp3';
      fs.writeFileSync(tempPath, audioBuffer);

      // Get actual audio duration using ffprobe
      let actualDuration: number;
      try {
        const ffprobeOutput = execSync(
          `ffprobe -v error -show_entries format=duration -of csv=p=0 "${tempPath}"`,
          { encoding: 'utf8' }
        );
        actualDuration = parseFloat(ffprobeOutput.trim());
      } catch {
        console.warn(`  ⚠ Could not get duration with ffprobe, using file size estimate`);
        actualDuration = audioBuffer.length / 16000; // fallback ~128kbps
      }

      // Extract word alignments
      const alignments: WordAlignment[] = data.alignment.characters.map((char: string, i: number) => ({
        word: char,
        start: data.alignment.character_start_times_seconds[i],
        end: data.alignment.character_end_times_seconds[i],
      }));

      // Get last alignment timestamp
      const lastAlignmentTime = alignments.length > 0 ? alignments[alignments.length - 1].end : 0;

      // Calculate coverage (alignment should cover at least 95% of actual audio)
      const coverage = lastAlignmentTime / actualDuration;
      console.log(
        `  Alignment coverage: ${(coverage * 100).toFixed(1)}% (align=${lastAlignmentTime.toFixed(1)}s, audio=${actualDuration.toFixed(1)}s)`
      );

      // Move temp file to final location
      fs.renameSync(tempPath, outputPath);
      console.log(`✓ Audio saved: ${outputPath}`);
      console.log(`  Duration: ${actualDuration.toFixed(2)}s, Size: ${(audioBuffer.length / 1024).toFixed(0)}KB`);

      console.log(`✓ Word alignments extracted: ${alignments.length} characters`);

      if (coverage < 0.95) {
        console.log(
          `  ⚠ WARNING: Alignment appears truncated (${(coverage * 100).toFixed(0)}% < 95%). ` +
            `Run \`npx tsx scripts/convert-hybrid-timing.ts --book ${path.basename(path.dirname(outputPath))} --chapter ${path.basename(outputPath).match(/chapter-(\d+)/)?.[1] || '?'}\` ` +
            `with ELEVENLABS_API_KEY set to repair via forced alignment.`
        );
      }

      return alignments;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function saveMetadata(
  bookName: string,
  chapterNum: number,
  sections: EmotionSection[],
  alignments: WordAlignment[],
  outputDir: string,
  voiceName: string,
  voiceId: string
) {
  const metadata = {
    book: bookName,
    chapter: chapterNum,
    generated: new Date().toISOString(),
    approach: 'hybrid',
    description: 'Single continuous audio file with embedded emotion tags',
    voice: {
      name: voiceName,
      id: voiceId,
    },
    emotionSections: sections,
    wordAlignments: alignments,
    stats: {
      totalSections: sections.length,
      totalWords: alignments.length,
      emotions: [...new Set(sections.map(s => s.emotion))],
    },
  };

  const metadataPath = path.join(outputDir, `chapter-${chapterNum}-hybrid-metadata.json`);
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  console.log(`✓ Metadata saved: ${metadataPath}`);
}

async function generateHybridAudio(bookName: string, chapterNum: number) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Hybrid Audio Generation: ${bookName} Chapter ${chapterNum}`);
  console.log(`${'='.repeat(60)}`);

  // Get voice for this chapter
  const { voiceId, voiceName } = getVoiceForChapter(bookName, chapterNum);
  console.log(`Selected voice: ${voiceName}`);

  // Load preprocessed chapter data
  const dataPath = path.join(
    __dirname,
    '..',
    'public',
    'data',
    'preprocessed',
    bookName.toLowerCase(),
    `chapter-${chapterNum}.json`
  );

  if (!fs.existsSync(dataPath)) {
    throw new Error(`Chapter data not found: ${dataPath}`);
  }

  const chapterData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  const verses: VerseData[] = chapterData.verses.map((v: any) => ({
    number: v.number,
    text: v.text,
    heading: v.heading, // Include heading field for header detection
  }));

  console.log(`Loaded ${verses.length} verses`);

  // Step 1: Analyze emotional sections with Gemini
  const sections = await analyzeEmotionalSections(verses, bookName, chapterNum);

  // Step 2: Build emotion-tagged text
  const taggedText = buildEmotionTaggedText(verses, sections);
  console.log('\nEmotion-tagged text preview:');
  console.log(taggedText.substring(0, 200) + '...');

  // Step 3: Generate audio with ElevenLabs
  const outputDir = path.join(__dirname, '..', 'public', 'audio', bookName.toLowerCase());
  fs.mkdirSync(outputDir, { recursive: true });

  const audioPath = path.join(outputDir, `chapter-${chapterNum}-hybrid.mp3`);
  const alignments = await generateAudioWithElevenLabs(taggedText, audioPath, voiceId, voiceName);

  // Step 4: Save metadata
  saveMetadata(bookName, chapterNum, sections, alignments, outputDir, voiceName, voiceId);

  console.log('\n' + '='.repeat(60));
  console.log('✓ Hybrid audio generation complete!');
  console.log('='.repeat(60));
  console.log(`\nFiles generated:`);
  console.log(`  Audio: ${audioPath}`);
  console.log(`  Metadata: ${path.join(outputDir, `chapter-${chapterNum}-hybrid-metadata.json`)}`);
  console.log(`\nStats:`);
  console.log(`  Voice: ${voiceName}`);
  console.log(`  Emotion sections: ${sections.length}`);
  console.log(`  Emotions used: ${[...new Set(sections.map(s => s.emotion))].join(', ')}`);
  console.log(`  Word alignments: ${alignments.length}`);
}

async function generateAllChapters(bookName: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Generating ALL chapters for: ${bookName}`);
  console.log(`${'='.repeat(80)}\n`);

  // Find all chapter files for this book
  const bookDir = path.join(
    __dirname,
    '..',
    'public',
    'data',
    'preprocessed',
    bookName.toLowerCase()
  );

  if (!fs.existsSync(bookDir)) {
    throw new Error(`Book directory not found: ${bookDir}`);
  }

  const files = fs.readdirSync(bookDir);
  const chapterFiles = files
    .filter(f => f.match(/^chapter-\d+\.json$/))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || '0', 10);
      const numB = parseInt(b.match(/\d+/)?.[0] || '0', 10);
      return numA - numB;
    });

  const totalChapters = chapterFiles.length;
  console.log(`Found ${totalChapters} chapters total\n`);

  // Check which chapters already exist
  const audioDir = path.join(__dirname, '..', 'public', 'audio', bookName.toLowerCase());
  const existingAudio = fs.existsSync(audioDir)
    ? fs.readdirSync(audioDir).filter(f => f.match(/^chapter-\d+-hybrid\.mp3$/))
    : [];

  const existingChapters = new Set(
    existingAudio.map(f => parseInt(f.match(/\d+/)?.[0] || '0', 10))
  );

  console.log(`Already generated: ${existingChapters.size} chapters`);
  console.log(`To generate: ${totalChapters - existingChapters.size} chapters\n`);

  let successCount = 0;
  let skippedCount = 0;
  let failCount = 0;
  const failures: Array<{ chapter: number; error: string }> = [];

  for (let i = 0; i < chapterFiles.length; i++) {
    const file = chapterFiles[i];
    const chapterNum = parseInt(file.match(/\d+/)?.[0] || '0', 10);

    console.log(`\n[${ i + 1 }/${totalChapters}] Processing chapter ${chapterNum}...`);

    // Skip if already exists
    if (existingChapters.has(chapterNum)) {
      console.log(`⊘ Chapter ${chapterNum} already exists, skipping...`);
      skippedCount++;
      continue;
    }

    try {
      await generateHybridAudio(bookName, chapterNum);
      successCount++;
      console.log(`✓ Chapter ${chapterNum} complete`);
    } catch (error: any) {
      failCount++;
      const errorMsg = error.message || String(error);
      failures.push({ chapter: chapterNum, error: errorMsg });
      console.error(`✗ Chapter ${chapterNum} failed: ${errorMsg}`);
    }

    // Add a small delay between chapters to avoid rate limiting
    if (i < chapterFiles.length - 1) {
      console.log('Waiting 2 seconds before next chapter...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Final summary
  console.log(`\n${'='.repeat(80)}`);
  console.log('ALL CHAPTERS GENERATION COMPLETE');
  console.log(`${'='.repeat(80)}`);
  console.log(`\nSummary:`);
  console.log(`  Total chapters: ${totalChapters}`);
  console.log(`  Skipped (already exist): ${skippedCount}`);
  console.log(`  Newly generated: ${successCount}`);
  console.log(`  Failed: ${failCount}`);

  if (failures.length > 0) {
    console.log(`\nFailed chapters:`);
    failures.forEach(({ chapter, error }) => {
      console.log(`  Chapter ${chapter}: ${error}`);
    });
  }
}

async function regenerateChapters(bookName: string, chapters: number[]) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Regenerating ${chapters.length} chapters for: ${bookName}`);
  console.log(`Chapters: ${chapters.join(', ')}`);
  console.log(`${'='.repeat(80)}\n`);

  let successCount = 0;
  let failCount = 0;
  const failures: Array<{ chapter: number; error: string }> = [];

  for (let i = 0; i < chapters.length; i++) {
    const chapterNum = chapters[i];
    console.log(`\n[${i + 1}/${chapters.length}] Regenerating chapter ${chapterNum}...`);

    try {
      await generateHybridAudio(bookName, chapterNum);
      successCount++;
      console.log(`✓ Chapter ${chapterNum} complete`);
    } catch (error: any) {
      failCount++;
      const errorMsg = error.message || String(error);
      failures.push({ chapter: chapterNum, error: errorMsg });
      console.error(`✗ Chapter ${chapterNum} failed: ${errorMsg}`);
    }

    // Add a small delay between chapters to avoid rate limiting
    if (i < chapters.length - 1) {
      console.log('Waiting 2 seconds before next chapter...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Final summary
  console.log(`\n${'='.repeat(80)}`);
  console.log('REGENERATION COMPLETE');
  console.log(`${'='.repeat(80)}`);
  console.log(`\nSummary:`);
  console.log(`  Total chapters: ${chapters.length}`);
  console.log(`  Successful: ${successCount}`);
  console.log(`  Failed: ${failCount}`);

  if (failures.length > 0) {
    console.log(`\nFailed chapters:`);
    failures.forEach(({ chapter, error }) => {
      console.log(`  Chapter ${chapter}: ${error}`);
    });
  }
}

// CLI usage
const args = process.argv.slice(2);
const bookFlag = args.indexOf('--book');
const chapterFlag = args.indexOf('--chapter');
const chaptersFlag = args.indexOf('--chapters');
const allFlag = args.indexOf('--all');

if (bookFlag === -1) {
  console.error('Usage:');
  console.error('  Single chapter:    npx tsx scripts/generate-hybrid-audio.ts --book revelation --chapter 22');
  console.error('  Multiple chapters: npx tsx scripts/generate-hybrid-audio.ts --book revelation --chapters 2,3,4,5,9,11,12,16,20,21');
  console.error('  All chapters:      npx tsx scripts/generate-hybrid-audio.ts --book revelation --all');
  process.exit(1);
}

const bookName = args[bookFlag + 1];

if (!bookName) {
  console.error('Please provide --book');
  process.exit(1);
}

if (chaptersFlag !== -1) {
  // Regenerate specific chapters
  const chaptersStr = args[chaptersFlag + 1];
  if (!chaptersStr) {
    console.error('Please provide comma-separated chapter numbers after --chapters');
    process.exit(1);
  }
  const chapters = chaptersStr.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
  if (chapters.length === 0) {
    console.error('No valid chapter numbers provided');
    process.exit(1);
  }
  regenerateChapters(bookName, chapters).catch(error => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
} else if (allFlag !== -1) {
  // Generate all chapters
  generateAllChapters(bookName).catch(error => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
} else {
  // Generate single chapter
  if (chapterFlag === -1) {
    console.error('Please provide either --chapter, --chapters, or --all');
    process.exit(1);
  }

  const chapterNum = parseInt(args[chapterFlag + 1], 10);

  if (!chapterNum) {
    console.error('Please provide a valid chapter number');
    process.exit(1);
  }

  generateHybridAudio(bookName, chapterNum).catch(error => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
}
