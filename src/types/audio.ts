// Audio timing metadata for synchronized word highlighting

export interface WordTiming {
  wordIndex: number;      // Index of word in verse.words array
  startTime: number;      // Start time in milliseconds
  endTime: number;        // End time in milliseconds
}

export interface VerseTiming {
  verseNumber: number;
  startTime: number;      // When this verse starts in the audio
  endTime: number;        // When this verse ends
  words: WordTiming[];    // Timing for each word
}

export interface ChapterAudio {
  bookId: string;
  chapter: number;
  audioUrl: string;       // URL to audio file (or base64 data URI for demo)
  duration: number;       // Total duration in milliseconds
  verses: VerseTiming[];
}

export interface AudioPlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  currentVerseNumber: number | null;
  currentWordIndex: number | null;
}
