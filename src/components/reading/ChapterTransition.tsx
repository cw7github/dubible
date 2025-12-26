import { memo } from 'react';
import { motion } from 'framer-motion';
import { BookGraphic } from './BookGraphic';
import { useConvertedBookName } from '../../hooks';
import { splitChineseCharacters, splitPinyinSyllables } from '../../utils/pinyin';

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
  // Convert book name to correct character set (Traditional/Simplified)
  const convertedBookName = useConvertedBookName(bookName);

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
            className="font-display text-3xl tracking-[0.2em] uppercase font-light"
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
          const chars = splitChineseCharacters(convertedBookName.chinese);
          const pinyinSyllables = splitPinyinSyllables(convertedBookName.pinyin, chars.length);

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
          className="font-display text-7xl font-light"
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
