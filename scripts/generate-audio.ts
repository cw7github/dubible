/**
 * Audio Generation Script
 *
 * Generates audio files with word-level timing for Bible chapters.
 * Uses ElevenLabs API with the with-timestamps endpoint.
 *
 * Usage:
 *   npx tsx scripts/generate-audio.ts --book matthew --chapter 1
 *   npx tsx scripts/generate-audio.ts --book matthew  # All chapters
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  apiKey: process.env.ELEVENLABS_API_KEY || '',

  // Voice Configuration for Traditional Chinese (Taiwan)
  // IMPORTANT: For authentic Taiwanese pronunciation, consider these options:
  //
  // OPTION 1: ElevenLabs (Current)
  // - Search for "Taiwan" or "Taiwanese" voices in ElevenLabs Voice Library
  // - Recommended: Look for female voices tagged with "Taiwanese accent"
  // - Current voice 'pFZP5JQG7iQjIQuC4Bku' (Lily) may not have Taiwanese accent
  //
  // OPTION 2: Azure Cognitive Services (Recommended for authentic Taiwanese)
  // - zh-TW-HsiaoChenNeural (曉臻) - Female, sounds natural at default speed
  // - zh-TW-HsiaoYuNeural (曉雨) - Female, sounds better at 1.2x speed
  //
  // OPTION 3: Google Cloud TTS
  // - cmn-TW-Wavenet-A - Female, Taiwanese WaveNet voice
  //
  voiceId: 'pFZP5JQG7iQjIQuC4Bku', // TO UPDATE: Replace with Taiwanese female voice
  modelId: 'eleven_multilingual_v2',
  preprocessedDir: path.join(__dirname, '../public/data/preprocessed'),
  audioOutputDir: path.join(__dirname, '../public/audio'),
  delayBetweenVerses: 500, // ms between API calls
};

// Types
interface ProcessedWord {
  chinese: string;
  pinyin: string;
  definition: string;
  pos?: string;
  isName?: boolean;
  nameType?: string;
  breakdown?: { c: string; m: string }[];
  freq?: string;
  note?: string;
}

interface ProcessedVerse {
  number: number;
  text: string;
  words: ProcessedWord[];
}

interface ProcessedChapter {
  book: string;
  bookId: string;
  chapter: number;
  verses: ProcessedVerse[];
  processedAt: string;
}

interface ElevenLabsResponse {
  audio_base64: string;
  alignment: {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
  };
}

interface WordTiming {
  wordIndex: number;
  startTime: number;
  endTime: number;
}

interface VerseAudioTiming {
  verseNumber: number;
  startTime: number;
  endTime: number;
  words: WordTiming[];
}

interface ChapterAudio {
  bookId: string;
  chapter: number;
  audioUrl: string;
  duration: number;
  voiceId: string;
  modelId: string;
  generatedAt: string;
  verses: VerseAudioTiming[];
}

// Generate audio for a single verse
async function generateVerseAudio(text: string): Promise<ElevenLabsResponse> {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${CONFIG.voiceId}/with-timestamps`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': CONFIG.apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: CONFIG.modelId,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
  }

  return response.json();
}

// Map character timings to word boundaries
function mapCharacterTimingsToWords(
  alignment: ElevenLabsResponse['alignment'],
  words: ProcessedWord[],
  timeOffset: number
): WordTiming[] {
  const wordTimings: WordTiming[] = [];
  let charIndex = 0;

  for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
    const word = words[wordIndex];
    const wordChars = word.chinese.split('');

    // Get the alignment characters for this word
    const startCharIndex = charIndex;
    const endCharIndex = charIndex + wordChars.length - 1;

    // Get timing from alignment data
    if (startCharIndex < alignment.characters.length) {
      const startTime = (alignment.character_start_times_seconds[startCharIndex] ?? 0) + timeOffset;
      const endTime = (alignment.character_end_times_seconds[Math.min(endCharIndex, alignment.characters.length - 1)] ?? startTime + 0.3) + timeOffset;

      wordTimings.push({
        wordIndex,
        startTime,
        endTime,
      });
    }

    charIndex += wordChars.length;
  }

  return wordTimings;
}

// Concatenate audio buffers
function concatenateAudioBuffers(buffers: Buffer[]): Buffer {
  // For MP3, we can't just concatenate - we need to process properly
  // For now, return the first buffer as a simplified approach
  // In production, use ffmpeg or similar to properly concatenate
  return Buffer.concat(buffers);
}

// Process a single chapter
async function processChapter(bookId: string, chapterNum: number): Promise<void> {
  console.log(`\nProcessing ${bookId} chapter ${chapterNum}...`);

  // Load preprocessed chapter
  const chapterPath = path.join(CONFIG.preprocessedDir, bookId, `chapter-${chapterNum}.json`);
  if (!fs.existsSync(chapterPath)) {
    console.error(`  Preprocessed data not found: ${chapterPath}`);
    return;
  }

  const chapter: ProcessedChapter = JSON.parse(fs.readFileSync(chapterPath, 'utf-8'));
  console.log(`  Loaded ${chapter.verses.length} verses`);

  // Generate audio for each verse and track timing
  const audioBuffers: Buffer[] = [];
  const verseTiming: VerseAudioTiming[] = [];
  let currentTime = 0;

  for (const verse of chapter.verses) {
    console.log(`  Generating audio for verse ${verse.number}...`);

    try {
      // Generate audio with timestamps
      const result = await generateVerseAudio(verse.text);

      // Decode audio
      const audioBuffer = Buffer.from(result.audio_base64, 'base64');
      audioBuffers.push(audioBuffer);

      // Calculate verse duration from alignment
      const lastCharIndex = result.alignment.characters.length - 1;
      const verseDuration = result.alignment.character_end_times_seconds[lastCharIndex] || 0;

      // Map word timings
      const wordTimings = mapCharacterTimingsToWords(
        result.alignment,
        verse.words,
        currentTime
      );

      verseTiming.push({
        verseNumber: verse.number,
        startTime: currentTime,
        endTime: currentTime + verseDuration,
        words: wordTimings,
      });

      currentTime += verseDuration + 0.3; // Small pause between verses

      // Rate limiting
      await sleep(CONFIG.delayBetweenVerses);

    } catch (error) {
      console.error(`  Error generating verse ${verse.number}:`, error);
      // Continue with next verse
    }
  }

  if (audioBuffers.length === 0) {
    console.error('  No audio generated');
    return;
  }

  // Create output directory
  const outputDir = path.join(CONFIG.audioOutputDir, bookId);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // For proper MP3 concatenation, we'll save individual verse files
  // and create a manifest - proper concatenation requires ffmpeg

  // Save individual verse audio files
  for (let i = 0; i < audioBuffers.length; i++) {
    const verseAudioPath = path.join(outputDir, `chapter-${chapterNum}-verse-${chapter.verses[i].number}.mp3`);
    fs.writeFileSync(verseAudioPath, audioBuffers[i]);
  }

  // Also save concatenated audio (note: may have playback issues without proper MP3 processing)
  const concatenatedPath = path.join(outputDir, `chapter-${chapterNum}.mp3`);
  const concatenatedBuffer = concatenateAudioBuffers(audioBuffers);
  fs.writeFileSync(concatenatedPath, concatenatedBuffer);
  console.log(`  Saved audio to: ${concatenatedPath}`);
  console.log(`  Total size: ${(concatenatedBuffer.length / 1024).toFixed(2)} KB`);

  // Save timing data
  const timingData: ChapterAudio = {
    bookId,
    chapter: chapterNum,
    audioUrl: `audio/${bookId}/chapter-${chapterNum}.mp3`,
    duration: currentTime,
    voiceId: CONFIG.voiceId,
    modelId: CONFIG.modelId,
    generatedAt: new Date().toISOString(),
    verses: verseTiming,
  };

  const timingPath = path.join(outputDir, `chapter-${chapterNum}-timing.json`);
  fs.writeFileSync(timingPath, JSON.stringify(timingData, null, 2));
  console.log(`  Saved timing to: ${timingPath}`);
  console.log(`  Total duration: ${currentTime.toFixed(2)}s`);
}

// Helper
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main
async function main() {
  const args = process.argv.slice(2);

  let bookId: string | null = null;
  let chapterNum: number | null = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--book' && args[i + 1]) {
      bookId = args[i + 1].toLowerCase();
      i++;
    } else if (args[i] === '--chapter' && args[i + 1]) {
      chapterNum = parseInt(args[i + 1], 10);
      i++;
    }
  }

  if (!bookId) {
    console.log('Usage:');
    console.log('  npx tsx scripts/generate-audio.ts --book matthew --chapter 1');
    console.log('  npx tsx scripts/generate-audio.ts --book matthew  # All chapters');
    process.exit(1);
  }

  // Ensure output directory exists
  if (!fs.existsSync(CONFIG.audioOutputDir)) {
    fs.mkdirSync(CONFIG.audioOutputDir, { recursive: true });
  }

  if (chapterNum) {
    // Single chapter
    await processChapter(bookId, chapterNum);
  } else {
    // All chapters - find all chapter files
    const bookDir = path.join(CONFIG.preprocessedDir, bookId);
    if (!fs.existsSync(bookDir)) {
      console.error(`Book not found: ${bookId}`);
      process.exit(1);
    }

    const files = fs.readdirSync(bookDir)
      .filter(f => f.startsWith('chapter-') && f.endsWith('.json'))
      .sort((a, b) => {
        const numA = parseInt(a.match(/chapter-(\d+)/)?.[1] || '0');
        const numB = parseInt(b.match(/chapter-(\d+)/)?.[1] || '0');
        return numA - numB;
      });

    console.log(`Found ${files.length} chapters for ${bookId}`);

    for (const file of files) {
      const num = parseInt(file.match(/chapter-(\d+)/)?.[1] || '0');
      if (num > 0) {
        await processChapter(bookId, num);
      }
    }
  }

  console.log('\nDone!');
}

main().catch(console.error);
