import { memo, useCallback } from 'react';
import { motion } from 'framer-motion';

interface DailyReadingMarkerProps {
  /** Whether this is the last passage of the day */
  isLastPassage: boolean;
  /** Callback when user wants to navigate to next passage */
  onNextPassage?: () => void;
  /** Callback when user marks day as complete */
  onComplete?: () => void;
  /** Current passage info for display */
  passageInfo?: {
    bookName: string;
    chapter: number;
    passageRange?: string; // Full range like "1-3" or "5:1-20"
  };
}

/**
 * Elegant marker that appears at the end of a daily reading passage.
 * Indicates completion and provides navigation to the next passage or day completion.
 */
export const DailyReadingMarker = memo(function DailyReadingMarker({
  isLastPassage,
  onNextPassage,
  onComplete,
  passageInfo,
}: DailyReadingMarkerProps) {
  const handleNextPassage = useCallback(() => {
    onNextPassage?.();
  }, [onNextPassage]);

  const handleComplete = useCallback(() => {
    onComplete?.();
  }, [onComplete]);

  return (
    <motion.div
      className="py-12 md:py-16 flex flex-col items-center"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.19, 1, 0.22, 1] }}
    >
      {/* Decorative top divider */}
      <div className="mb-8 md:mb-10 flex items-center justify-center gap-3 md:gap-4 w-full max-w-xs">
        <div
          className="h-px flex-1"
          style={{
            background: 'linear-gradient(90deg, transparent, var(--border), var(--border))',
          }}
        />
        <div
          className="w-2 h-2 rounded-full"
          style={{
            backgroundColor: 'var(--accent)',
            opacity: 0.5,
          }}
        />
        <div
          className="h-px flex-1"
          style={{
            background: 'linear-gradient(90deg, var(--border), var(--border), transparent)',
          }}
        />
      </div>

      {/* Completion indicator */}
      <motion.div
        className="mb-6 md:mb-7"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
      >
        <div
          className="w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center"
          style={{
            backgroundColor: 'var(--accent-subtle)',
            border: '1.5px solid var(--accent)',
            opacity: 0.9,
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--accent)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-7 h-7 md:w-8 md:h-8"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
      </motion.div>

      {/* Chinese text with pinyin */}
      <div className="mb-2 md:mb-3 flex flex-col items-center gap-1">
        <div className="flex items-center gap-1.5">
          {/* Pinyin above characters */}
          <span
            className="text-[10px] md:text-xs tracking-wider"
            style={{ color: 'var(--text-tertiary)', opacity: 0.7 }}
          >
            jīn
          </span>
          <span
            className="text-[10px] md:text-xs tracking-wider"
            style={{ color: 'var(--text-tertiary)', opacity: 0.7 }}
          >
            rì
          </span>
          <span
            className="text-[10px] md:text-xs tracking-wider"
            style={{ color: 'var(--text-tertiary)', opacity: 0.7 }}
          >
            yuè
          </span>
          <span
            className="text-[10px] md:text-xs tracking-wider"
            style={{ color: 'var(--text-tertiary)', opacity: 0.7 }}
          >
            dú
          </span>
          <span
            className="text-[10px] md:text-xs tracking-wider"
            style={{ color: 'var(--text-tertiary)', opacity: 0.7 }}
          >
            wán
          </span>
          <span
            className="text-[10px] md:text-xs tracking-wider"
            style={{ color: 'var(--text-tertiary)', opacity: 0.7 }}
          >
            chéng
          </span>
        </div>
        <div className="font-chinese-serif text-xl md:text-2xl" style={{ color: 'var(--text-primary)' }}>
          今日閱讀完成
        </div>
      </div>

      {/* English subtitle */}
      <p
        className="font-display text-xs md:text-sm tracking-[0.2em] uppercase mb-8 md:mb-10"
        style={{ color: 'var(--text-tertiary)' }}
      >
        Daily Reading Complete
      </p>

      {/* Action button(s) */}
      <div className="flex flex-col gap-3 md:gap-4 w-full max-w-xs px-4">
        {!isLastPassage && onNextPassage ? (
          // Next passage button
          <motion.button
            className="w-full py-3.5 md:py-4 px-6 rounded-xl font-medium text-sm md:text-base transition-all"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'white',
              boxShadow: '0 2px 8px var(--shadow)',
            }}
            onClick={handleNextPassage}
            whileHover={{ scale: 1.02, boxShadow: '0 4px 12px var(--shadow-md)' }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-2">
                {/* Pinyin */}
                <span className="text-[9px] md:text-[10px] opacity-80 tracking-wide">
                  xià yī piān
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-chinese-serif text-base md:text-lg">下一篇</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-4 h-4 md:w-5 md:h-5"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <span className="text-xs md:text-sm opacity-90">Next Passage</span>
            </div>
          </motion.button>
        ) : onComplete ? (
          // Complete day button
          <motion.button
            className="w-full py-3.5 md:py-4 px-6 rounded-xl font-medium text-sm md:text-base transition-all"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'white',
              boxShadow: '0 2px 8px var(--shadow)',
            }}
            onClick={handleComplete}
            whileHover={{ scale: 1.02, boxShadow: '0 4px 12px var(--shadow-md)' }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-2">
                {/* Pinyin */}
                <span className="text-[9px] md:text-[10px] opacity-80 tracking-wide">
                  biāo jì wán chéng
                </span>
              </div>
              <div className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-4 h-4 md:w-5 md:h-5"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="font-chinese-serif text-base md:text-lg">標記完成</span>
              </div>
              <span className="text-xs md:text-sm opacity-90">Mark as Complete</span>
            </div>
          </motion.button>
        ) : null}

        {/* Secondary context info */}
        {passageInfo && (
          <div
            className="text-center text-xs md:text-sm py-2"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {passageInfo.bookName} {passageInfo.passageRange || passageInfo.chapter}
          </div>
        )}
      </div>

      {/* Decorative bottom divider */}
      <div className="mt-8 md:mt-10 flex items-center justify-center gap-3 md:gap-4 w-full max-w-xs">
        <div
          className="h-px flex-1"
          style={{
            background: 'linear-gradient(90deg, transparent, var(--border))',
          }}
        />
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{
            backgroundColor: 'var(--accent)',
            opacity: 0.3,
          }}
        />
        <div
          className="h-px flex-1"
          style={{
            background: 'linear-gradient(90deg, var(--border), transparent)',
          }}
        />
      </div>
    </motion.div>
  );
});
