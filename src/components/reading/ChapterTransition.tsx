import { memo } from 'react';
import { motion } from 'framer-motion';
import { BookGraphic } from './BookGraphic';

// Helper to split pinyin string into individual syllables
// e.g., "Mǎtài Fúyīn" -> ["Mǎ", "tài", "Fú", "yīn"]
function splitPinyinToSyllables(pinyin: string, targetCount: number): string[] {
  // Remove spaces and split by capital letters or tone marks
  const cleaned = pinyin.replace(/\s+/g, '');

  // Pinyin vowels with tone marks
  const vowels = /[aeiouüāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/i;

  const syllables: string[] = [];
  let current = '';

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    const nextChar = cleaned[i + 1];

    current += char;

    // Check if this might be end of syllable
    const hasVowel = vowels.test(current);
    const nextIsCapital = nextChar && nextChar === nextChar.toUpperCase() && /[A-Z]/.test(nextChar);
    const nextStartsNew = nextChar && /[bpmfdtnlgkhjqxzhchshrzcsyw]/i.test(nextChar) &&
                          !['g', 'n', 'r'].includes(char.toLowerCase());

    // End syllable conditions
    if (hasVowel && (nextIsCapital || (nextStartsNew && !vowels.test(nextChar)) || i === cleaned.length - 1)) {
      // Handle 'ng' and 'n' endings
      if (nextChar && ['n', 'g'].includes(nextChar.toLowerCase())) {
        const afterNext = cleaned[i + 2];
        if (nextChar.toLowerCase() === 'n') {
          if (afterNext === 'g') {
            current += nextChar + afterNext;
            i += 2;
          } else if (!afterNext || !vowels.test(afterNext)) {
            current += nextChar;
            i += 1;
          }
        } else if (nextChar.toLowerCase() === 'g' && current.endsWith('n')) {
          // Already handled
        }
      }

      if (current) {
        syllables.push(current);
        current = '';
      }
    }
  }

  if (current) {
    syllables.push(current);
  }

  // If we don't have enough syllables, try simpler split
  if (syllables.length !== targetCount) {
    // Fallback: split by spaces first, then by capitals
    const words = pinyin.split(/\s+/);
    const result: string[] = [];

    for (const word of words) {
      // Split each word by capital letters (except first)
      let temp = '';
      for (let i = 0; i < word.length; i++) {
        if (i > 0 && word[i] === word[i].toUpperCase() && /[A-Z]/.test(word[i])) {
          if (temp) result.push(temp);
          temp = word[i];
        } else {
          temp += word[i];
        }
      }
      if (temp) result.push(temp);
    }

    if (result.length === targetCount) {
      return result;
    }
  }

  // Final fallback: distribute evenly
  if (syllables.length !== targetCount && targetCount > 0) {
    const words = pinyin.split(/\s+/);
    if (words.length === targetCount) {
      return words;
    }
    // Just return what we have, padded or truncated
    while (syllables.length < targetCount) syllables.push('');
    return syllables.slice(0, targetCount);
  }

  return syllables;
}

interface ChapterTransitionProps {
  bookId: string;
  bookName: {
    chinese: string;
    english: string;
    pinyin: string;
  };
  chapter: number;
  isFirstChapter?: boolean;
}

export const ChapterTransition = memo(function ChapterTransition({
  bookId,
  bookName,
  chapter,
  isFirstChapter = false,
}: ChapterTransitionProps) {
  // Subtle inline chapter marker for chapters 2+
  if (!isFirstChapter) {
    return (
      <motion.div
        className="relative py-6 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {/* Elegant inline divider with chapter number */}
        <div className="flex items-center justify-center gap-4">
          {/* Left line */}
          <motion.div
            className="h-px flex-1 max-w-16"
            style={{
              background: 'linear-gradient(90deg, transparent, var(--border))',
            }}
            initial={{ scaleX: 0, originX: 1 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          />

          {/* Chapter number - refined and compact */}
          <motion.span
            className="font-display text-sm tracking-[0.2em] uppercase"
            style={{ color: 'var(--text-tertiary)' }}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            {chapter}
          </motion.span>

          {/* Right line */}
          <motion.div
            className="h-px flex-1 max-w-16"
            style={{
              background: 'linear-gradient(90deg, var(--border), transparent)',
            }}
            initial={{ scaleX: 0, originX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          />
        </div>
      </motion.div>
    );
  }

  // Full book title display for chapter 1
  return (
    <motion.div
      className="relative py-10 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      {/* Decorative top flourish */}
      <motion.div
        className="mx-auto mb-5 flex items-center justify-center gap-4"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div
          className="h-px w-12"
          style={{
            background: 'linear-gradient(90deg, transparent, var(--accent-light))',
          }}
        />
        <div
          className="h-2 w-2 rotate-45"
          style={{ backgroundColor: 'var(--accent-light)', opacity: 0.6 }}
        />
        <div
          className="h-px w-12"
          style={{
            background: 'linear-gradient(90deg, var(--accent-light), transparent)',
          }}
        />
      </motion.div>

      {/* Book category graphic */}
      <motion.div
        className="mx-auto mb-5 flex items-center justify-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 0.25, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <BookGraphic
          bookId={bookId}
          className="w-[60px] h-[60px]"
          style={{ color: 'var(--accent)' }}
        />
      </motion.div>

      {/* Chinese book name with pinyin - each syllable above its character */}
      <motion.h2
        className="flex items-end justify-center gap-1"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        {(() => {
          // Split pinyin into syllables and match with characters
          const chars = bookName.chinese.split('');
          const pinyinSyllables = splitPinyinToSyllables(bookName.pinyin, chars.length);

          return chars.map((char, i) => (
            <span key={i} className="flex flex-col items-center">
              <span
                className="font-body text-xs italic"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {pinyinSyllables[i] || ''}
              </span>
              <span
                className="font-chinese-serif text-3xl font-light"
                style={{ color: 'var(--text-primary)' }}
              >
                {char}
              </span>
            </span>
          ));
        })()}
      </motion.h2>

      {/* English subtitle */}
      <motion.p
        className="mt-2 font-display text-sm tracking-[0.25em] uppercase"
        style={{ color: 'var(--text-tertiary)' }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25 }}
      >
        {bookName.english}
      </motion.p>

      {/* Chapter number - large elegant display */}
      <motion.div
        className="mt-4"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.35 }}
      >
        <span
          className="font-display text-5xl font-light"
          style={{
            color: 'var(--accent)',
            opacity: 0.25,
            letterSpacing: '0.1em',
          }}
        >
          {chapter}
        </span>
      </motion.div>

      {/* Decorative bottom flourish */}
      <motion.div
        className="mx-auto mt-5 h-px w-24"
        style={{
          background: 'linear-gradient(90deg, transparent, var(--border), transparent)',
        }}
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      />
    </motion.div>
  );
});
