import type { ChapterAudio } from '../../types';

// Sample audio timing data for Matthew 5 (Beatitudes)
// In production, this would be generated from actual audio files with timing metadata
// For demo purposes, we simulate realistic word timings

function generateWordTimings(
  _verseNumber: number,
  wordCount: number,
  startTime: number,
  averageWordDuration: number = 400
): { words: { wordIndex: number; startTime: number; endTime: number }[]; endTime: number } {
  const words = [];
  let currentTime = startTime;

  for (let i = 0; i < wordCount; i++) {
    // Add some variation to word duration (300-600ms)
    const duration = averageWordDuration + (Math.random() - 0.5) * 200;
    words.push({
      wordIndex: i,
      startTime: Math.round(currentTime),
      endTime: Math.round(currentTime + duration),
    });
    currentTime += duration + 50; // Small gap between words
  }

  return { words, endTime: Math.round(currentTime) };
}

// Matthew 5 word counts per verse (from sampleData)
const matthew5WordCounts: Record<number, number> = {
  1: 9,  // 耶穌看見這許多的人，就上了山，既已坐下，門徒到他跟前來，
  2: 2,  // 他就開口教訓他們，說：
  3: 7,  // 虛心的人有福了！因為天國是他們的。
  4: 7,  // 哀慟的人有福了！因為他們必得安慰。
  5: 7,  // 溫柔的人有福了！因為他們必承受地土。
  6: 9,  // 飢渴慕義的人有福了！因為他們必得飽足。
  7: 7,  // 憐恤人的人有福了！因為他們必蒙憐恤。
  8: 7,  // 清心的人有福了！因為他們必得見神。
  9: 8,  // 使人和睦的人有福了！因為他們必稱為神的兒子。
  10: 10, // 為義受逼迫的人有福了！因為天國是他們的。
  11: 12, // 人若因我辱罵你們，逼迫你們，捏造各樣壞話毀謗你們，你們就有福了！
  12: 13, // 應當歡喜快樂，因為你們在天上的賞賜是大的。在你們以前的先知，人也是這樣逼迫他們。
};

// Generate Matthew 5 audio timing
function generateMatthew5Audio(): ChapterAudio {
  const verses: ChapterAudio['verses'] = [];
  let currentTime = 500; // Start after brief silence

  for (let verseNum = 1; verseNum <= 12; verseNum++) {
    const wordCount = matthew5WordCounts[verseNum] || 5;
    const { words, endTime } = generateWordTimings(verseNum, wordCount, currentTime);

    verses.push({
      verseNumber: verseNum,
      startTime: currentTime,
      endTime: endTime,
      words,
    });

    currentTime = endTime + 800; // Pause between verses
  }

  return {
    bookId: 'matthew',
    chapter: 5,
    audioUrl: '', // Would be actual audio URL in production
    duration: currentTime,
    verses,
  };
}

// John 3 word counts
const john3WordCounts: Record<number, number> = {
  16: 17, // 神愛世人，甚至將他的獨生子賜給他們，叫一切信他的，不致滅亡，反得永生。
  17: 13, // 因為神差他的兒子降世，不是要定世人的罪，乃是要叫世人因他得救。
};

function generateJohn3Audio(): ChapterAudio {
  const verses: ChapterAudio['verses'] = [];
  let currentTime = 500;

  for (const verseNum of [16, 17]) {
    const wordCount = john3WordCounts[verseNum] || 10;
    const { words, endTime } = generateWordTimings(verseNum, wordCount, currentTime);

    verses.push({
      verseNumber: verseNum,
      startTime: currentTime,
      endTime: endTime,
      words,
    });

    currentTime = endTime + 800;
  }

  return {
    bookId: 'john',
    chapter: 3,
    audioUrl: '',
    duration: currentTime,
    verses,
  };
}

// Cache generated timings
let matthew5Cache: ChapterAudio | null = null;
let john3Cache: ChapterAudio | null = null;

export function getChapterAudio(bookId: string, chapter: number): ChapterAudio | null {
  if (bookId === 'matthew' && chapter === 5) {
    if (!matthew5Cache) {
      matthew5Cache = generateMatthew5Audio();
    }
    return matthew5Cache;
  }

  if (bookId === 'john' && chapter === 3) {
    if (!john3Cache) {
      john3Cache = generateJohn3Audio();
    }
    return john3Cache;
  }

  return null;
}

// Find the current verse and word based on playback time
export function getPositionAtTime(
  audioData: ChapterAudio,
  currentTime: number
): { verseNumber: number | null; wordIndex: number | null } {
  for (const verse of audioData.verses) {
    if (currentTime >= verse.startTime && currentTime <= verse.endTime) {
      // Find current word within verse
      for (const word of verse.words) {
        if (currentTime >= word.startTime && currentTime <= word.endTime) {
          return {
            verseNumber: verse.verseNumber,
            wordIndex: word.wordIndex,
          };
        }
      }
      // Between words in this verse
      return {
        verseNumber: verse.verseNumber,
        wordIndex: null,
      };
    }
  }

  return { verseNumber: null, wordIndex: null };
}
