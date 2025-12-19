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

const GEMINI_API_KEY = 'REDACTED_KEY';
const ELEVENLABS_API_KEY = 'REDACTED_KEY';

// Voice mapping configuration
interface VoiceMapping {
  [book: string]: {
    [chapterRange: string]: {
      voiceId: string;
      voiceName: string;
    };
  };
}

// Voice ID constants for 10 Taiwan Mandarin voices
const VOICES = {
  KEVIN_TU: { voiceId: 'BrbEfHMQu0fyclQR7lfh', voiceName: 'Kevin Tu' },      // Teaching, measured, clear
  EVAN: { voiceId: 'kbrsaic1zriFXx1pgRYN', voiceName: 'Evan' },              // Warm, pastoral, comfort
  NEIL_CHUANG: { voiceId: 'auoHciLZJwKTwYUoRTYz', voiceName: 'Neil Chuang' }, // Deep, authoritative
  YU: { voiceId: 'fQj4gJSexpu8RDE2Ii5m', voiceName: 'Yu' },                  // Energetic, dramatic
  LIANG: { voiceId: 'FjfxJryh105iTLL4ktHB', voiceName: 'Liang' },            // Calm, natural
  STACY: { voiceId: 'hkfHEbBvdQFNX4uWHqRF', voiceName: 'Stacy' },            // Sweet, tender
  YUI: { voiceId: 'kGjJqO6wdwRN9iJsoeIC', voiceName: 'Yui' },                // Peaceful, hope
  YAO_YUAN_WU: { voiceId: 'R55vTH9XmVSyAcM6YvtV', voiceName: 'Yao Yuan Wu' }, // Friendly, warm
  ANNA_SU: { voiceId: '9lHjugDhwqoxA5MhX0az', voiceName: 'Anna Su' },        // Expressive, bright
  JIN: { voiceId: 'vZZLclMx4wouUtKBRfZn', voiceName: 'Jin' },                // Philosophical, clear
};

const VOICE_MAPPINGS: VoiceMapping = {
  // ============ GOSPELS ============
  matthew: {
    '1-7': VOICES.KEVIN_TU,      // Sermon on Mount - teaching
    '8-15': VOICES.EVAN,         // Ministry & miracles - warm
    '16-20': VOICES.JIN,         // Theological teachings
    '21-28': VOICES.NEIL_CHUANG, // Passion week - deep, weighty
  },
  mark: {
    '1-8': VOICES.YU,            // Galilean ministry - urgent, action
    '9-13': VOICES.EVAN,         // Journey teachings
    '14-16': VOICES.NEIL_CHUANG, // Passion & resurrection
  },
  luke: {
    '1-4': VOICES.LIANG,         // Birth narratives - calm, reverent
    '5-12': VOICES.EVAN,         // Ministry - warm
    '13-18': VOICES.ANNA_SU,     // Parables - expressive
    '19-24': VOICES.LIANG,       // Passion & resurrection
  },
  john: {
    '1-6': VOICES.KEVIN_TU,      // Signs & discourses - theological
    '7-12': VOICES.JIN,          // Conflict & revelation - philosophical
    '13-17': VOICES.EVAN,        // Upper Room - intimate, warm
    '18-21': VOICES.NEIL_CHUANG, // Passion & resurrection
  },

  // ============ ACTS ============
  acts: {
    '1-7': VOICES.EVAN,          // Jerusalem church - community
    '8-12': VOICES.YU,           // Expansion - adventure
    '13-20': VOICES.LIANG,       // Paul's journeys - narrative
    '21-28': VOICES.KEVIN_TU,    // Paul's trials - defense speeches
  },

  // ============ PAULINE EPISTLES ============
  romans: {
    '1-4': VOICES.KEVIN_TU,      // Justification - theological
    '5-8': VOICES.JIN,           // Sanctification - deep reflection
    '9-11': VOICES.NEIL_CHUANG,  // Israel's destiny - climactic
    '12-16': VOICES.EVAN,        // Practical living - warm
  },
  '1corinthians': {
    '1-6': VOICES.KEVIN_TU,      // Church problems - direct
    '7-11': VOICES.JIN,          // Marriage, worship - reflective
    '12-14': VOICES.ANNA_SU,     // Spiritual gifts - expressive
    '15-16': VOICES.EVAN,        // Resurrection hope - warm
  },
  '2corinthians': {
    '1-7': VOICES.EVAN,          // Comfort & reconciliation
    '8-9': VOICES.YAO_YUAN_WU,   // Giving - friendly appeal
    '10-13': VOICES.NEIL_CHUANG, // Paul's defense - passionate
  },
  galatians: {
    '1-6': VOICES.NEIL_CHUANG,   // All - passionate defense
  },
  ephesians: {
    '1-3': VOICES.KEVIN_TU,      // Cosmic vision - theological
    '4-6': VOICES.JIN,           // Practical unity - reflective
  },
  philippians: {
    '1-4': VOICES.EVAN,          // All - joyful warmth
  },
  colossians: {
    '1-4': VOICES.KEVIN_TU,      // All - Christ-focused
  },
  '1thessalonians': {
    '1-5': VOICES.EVAN,          // All - friendly encouragement
  },
  '2thessalonians': {
    '1-3': VOICES.KEVIN_TU,      // All - clarifying teaching
  },
  '1timothy': {
    '1-6': VOICES.KEVIN_TU,      // All - pastoral maturity
  },
  '2timothy': {
    '1-4': VOICES.EVAN,          // All - tender farewell
  },
  titus: {
    '1-3': VOICES.KEVIN_TU,      // All - clear instructions
  },
  philemon: {
    '1-1': VOICES.YAO_YUAN_WU,   // All - friendly personal appeal
  },

  // ============ GENERAL EPISTLES ============
  hebrews: {
    '1-4': VOICES.KEVIN_TU,      // Christ's supremacy
    '5-7': VOICES.JIN,           // Melchizedek - philosophical
    '8-10': VOICES.NEIL_CHUANG,  // New covenant - authoritative
    '11-13': VOICES.EVAN,        // Faith heroes - warm encouragement
  },
  james: {
    '1-5': VOICES.NEIL_CHUANG,   // All - direct commands
  },
  '1peter': {
    '1-5': VOICES.EVAN,          // All - warm in suffering
  },
  '2peter': {
    '1-3': VOICES.NEIL_CHUANG,   // All - warning, firm
  },
  '1john': {
    '1-5': VOICES.STACY,         // All - gentle pastoral love
  },
  '2john': {
    '1-1': VOICES.STACY,         // All - same author
  },
  '3john': {
    '1-1': VOICES.YAO_YUAN_WU,   // All - personal note
  },
  jude: {
    '1-1': VOICES.NEIL_CHUANG,   // All - contending for faith
  },

  // ============ REVELATION ============
  revelation: {
    '1-3': VOICES.NEIL_CHUANG,   // Letters to churches
    '4-11': VOICES.YU,           // Seals & trumpets - dramatic
    '12-18': VOICES.KEVIN_TU,    // Beasts & Babylon - intense
    '19-22': VOICES.YUI,         // Victory & new creation - peaceful hope
  },
};

function getVoiceForChapter(bookName: string, chapterNum: number): { voiceId: string; voiceName: string } {
  const bookMapping = VOICE_MAPPINGS[bookName.toLowerCase()];

  if (!bookMapping) {
    // Default voice if book not in mapping
    return {
      voiceId: 'auoHciLZJwKTwYUoRTYz',
      voiceName: 'Neil Chuang',
    };
  }

  // Find the appropriate range for this chapter
  for (const [range, voice] of Object.entries(bookMapping)) {
    const [start, end] = range.split('-').map(Number);
    if (chapterNum >= start && chapterNum <= end) {
      return voice;
    }
  }

  // Default if no range matches
  return {
    voiceId: 'auoHciLZJwKTwYUoRTYz',
    voiceName: 'Neil Chuang',
  };
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
