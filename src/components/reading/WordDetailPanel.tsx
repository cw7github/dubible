/**
 * WordDetailPanel - Enhanced word information display
 *
 * A beautiful "Scholarly Lexicon Entry" design showing:
 * - Chinese character with pinyin
 * - Part of speech with color-coded badge
 * - Character breakdown (etymology)
 * - Frequency indicator
 * - Usage notes
 * - Save to vocabulary action
 */

import { memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { SegmentedWord, VerseReference } from '../../types';
import { useVocabularyStore } from '../../stores';
import { getBookById } from '../../data/bible';

interface WordDetailPanelProps {
  word: SegmentedWord;
  verseRef: VerseReference | null;
  onClose: () => void;
}

// Part of speech display config
const POS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  n: { label: 'noun', color: '#5B7553', bg: '#E8F0E6' },
  v: { label: 'verb', color: '#8B5A3C', bg: '#F5EDE8' },
  adj: { label: 'adj', color: '#6B5B95', bg: '#EDE8F5' },
  adv: { label: 'adv', color: '#4A7C8F', bg: '#E6F0F3' },
  prep: { label: 'prep', color: '#7C6A5B', bg: '#F0EDE8' },
  conj: { label: 'conj', color: '#8B7355', bg: '#F5F0E8' },
  part: { label: 'particle', color: '#9B8579', bg: '#F5F0ED' },
  mw: { label: 'measure', color: '#6B8E7B', bg: '#E8F0EC' },
  pron: { label: 'pron', color: '#7B6B8E', bg: '#EFEBF5' },
  num: { label: 'num', color: '#5B7B8E', bg: '#E8EDF0' },
  prop: { label: 'name', color: '#8B6B53', bg: '#F5EDE6' },
};

// Frequency display config
const FREQ_CONFIG: Record<string, { label: string; icon: string }> = {
  common: { label: 'Common', icon: '●●●' },
  uncommon: { label: 'Uncommon', icon: '●●○' },
  rare: { label: 'Rare', icon: '●○○' },
  biblical: { label: 'Biblical', icon: '✝' },
};

// Name type display
const NAME_TYPE_LABELS: Record<string, string> = {
  person: 'Person',
  place: 'Place',
  group: 'Group',
};

export const WordDetailPanel = memo(function WordDetailPanel({
  word,
  verseRef,
  onClose,
}: WordDetailPanelProps) {
  const { addWord, removeWord, isWordSaved, getWordByChars } = useVocabularyStore();

  const isSaved = isWordSaved(word.chinese);
  const savedWord = getWordByChars(word.chinese);
  const book = verseRef ? getBookById(verseRef.bookId) : null;

  const handleSaveToggle = useCallback(() => {
    if (!verseRef) return;

    if (isSaved && savedWord) {
      removeWord(savedWord.id);
    } else {
      addWord(
        word.chinese,
        word.pinyin,
        word.definition || '',
        verseRef,
        word.partOfSpeech,
        word.hskLevel
      );
    }
  }, [word, verseRef, isSaved, savedWord, addWord, removeWord]);

  const posConfig = word.partOfSpeech ? POS_CONFIG[word.partOfSpeech] : null;
  const freqConfig = word.freq ? FREQ_CONFIG[word.freq] : null;
  const hasBreakdown = word.breakdown && word.breakdown.length > 1;
  const isNameEntry = word.isName;
  const hasEnhancedData = word.breakdown || word.note || word.freq || word.nameType;

  return (
    <motion.div
      className="px-5 py-4"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      {/* Name category header for biblical names */}
      {isNameEntry && (
        <div className="flex items-center gap-2 mb-3 pb-2.5 border-b" style={{ borderColor: 'var(--border)' }}>
          <span className="text-[10px] uppercase tracking-widest font-medium flex items-center gap-1.5" style={{ color: '#9B7B5B' }}>
            <span className="text-xs">✝</span> Biblical Name
          </span>
          {word.nameType && (
            <span
              className="rounded-full px-2 py-0.5 text-[9px] font-medium"
              style={{
                backgroundColor: word.nameType === 'person' ? '#F5EBE0' : word.nameType === 'place' ? '#E8F0E6' : '#EDE8F5',
                color: word.nameType === 'person' ? '#8B6B53' : word.nameType === 'place' ? '#5B7553' : '#6B5B95',
              }}
            >
              {NAME_TYPE_LABELS[word.nameType]}
            </span>
          )}
        </div>
      )}

      {/* Main word display row */}
      <div className="flex items-start gap-5">
        {/* Chinese character - large and prominent */}
        <div className="flex flex-col items-center flex-shrink-0">
          <span
            className="font-body text-xs tracking-wide italic mb-0.5"
            style={{ color: 'var(--text-secondary)', opacity: 0.8 }}
          >
            {word.pinyin}
          </span>
          <span
            className="font-chinese-serif text-4xl leading-tight"
            style={{
              color: isNameEntry ? '#8B6B53' : 'var(--text-primary)',
              letterSpacing: '0.02em'
            }}
          >
            {word.chinese}
          </span>

          {/* Badges row */}
          <div className="flex items-center gap-1.5 mt-2">
            {/* HSK badge */}
            {word.hskLevel && (
              <span
                className="rounded px-1.5 py-0.5 text-[9px] font-medium tracking-wide"
                style={{
                  backgroundColor: 'var(--accent-subtle)',
                  color: 'var(--accent)',
                }}
              >
                HSK {word.hskLevel}
              </span>
            )}

            {/* Part of speech badge - hide for names since we show it above */}
            {posConfig && !isNameEntry && (
              <span
                className="rounded px-1.5 py-0.5 text-[9px] font-medium tracking-wide"
                style={{
                  backgroundColor: posConfig.bg,
                  color: posConfig.color,
                }}
              >
                {posConfig.label}
              </span>
            )}
          </div>
        </div>

        {/* Divider */}
        <div
          className="w-px self-stretch my-1 flex-shrink-0"
          style={{ backgroundColor: 'var(--border)' }}
        />

        {/* Definition and details */}
        <div className="flex-1 min-w-0 py-0.5">
          {/* Definition */}
          <p
            className="font-body text-[15px] leading-relaxed"
            style={{ color: 'var(--text-primary)', lineHeight: '1.7' }}
          >
            {word.definition || 'No definition available'}
          </p>

          {/* Character breakdown - etymology style */}
          {hasBreakdown && (
            <div className="mt-3 pt-2.5 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              <p
                className="text-[9px] uppercase tracking-widest mb-2 font-medium flex items-center gap-1.5"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <span className="inline-block w-1 h-1 rounded-full" style={{ backgroundColor: 'var(--text-tertiary)', opacity: 0.5 }} />
                Character Breakdown
              </p>
              <div className="flex flex-wrap gap-2">
                {word.breakdown!.map((char, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 border"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderColor: 'var(--border-subtle)'
                    }}
                  >
                    <span
                      className="font-chinese-serif text-lg"
                      style={{ color: 'var(--text-primary)', letterSpacing: '0.02em' }}
                    >
                      {char.c}
                    </span>
                    <span
                      className="text-[11px]"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {char.m}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Usage note */}
          {word.note && (
            <div
              className="mt-3 rounded-lg px-3 py-2.5 border-l-[3px]"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderLeftColor: 'var(--accent)',
              }}
            >
              <p
                className="font-body text-xs italic leading-relaxed"
                style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}
              >
                {word.note}
              </p>
            </div>
          )}

          {/* Footer: frequency + verse reference */}
          <div className="flex items-center justify-between mt-2.5 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            {/* Frequency indicator */}
            {freqConfig && (
              <div className="flex items-center gap-1.5">
                <span
                  className="text-[10px] tracking-wide"
                  style={{ color: 'var(--text-tertiary)', letterSpacing: '0.5px' }}
                >
                  {freqConfig.icon}
                </span>
                <span
                  className="text-[9px] uppercase tracking-wider"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {freqConfig.label}
                </span>
              </div>
            )}

            {/* Verse reference */}
            {verseRef && book && (
              <p
                className="font-body text-[9px] uppercase tracking-wider"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {book.name.english} {verseRef.chapter}:{verseRef.verse}
              </p>
            )}
          </div>
        </div>

        {/* Save button */}
        <motion.button
          onClick={handleSaveToggle}
          className="touch-feedback rounded-full p-2.5 flex-shrink-0 self-center"
          style={{
            backgroundColor: isSaved ? 'var(--accent)' : 'var(--bg-secondary)',
            color: isSaved ? 'white' : 'var(--text-tertiary)',
          }}
          whileTap={{ scale: 0.9 }}
          aria-label={isSaved ? 'Remove from vocabulary' : 'Save to vocabulary'}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill={isSaved ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth={2}
            className="h-5 w-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
            />
          </svg>
        </motion.button>
      </div>
    </motion.div>
  );
});

export default WordDetailPanel;
