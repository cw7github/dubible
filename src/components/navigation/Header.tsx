import { memo } from 'react';
import { useConvertedBookName } from '../../hooks';

// Helper to split pinyin string into individual syllables
function splitPinyinToSyllables(pinyin: string, targetCount: number): string[] {
  const cleaned = pinyin.replace(/\s+/g, '');
  const vowels = /[aeiouüāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/i;

  const syllables: string[] = [];
  let current = '';

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    const nextChar = cleaned[i + 1];
    current += char;

    const hasVowel = vowels.test(current);
    const nextIsCapital = nextChar && nextChar === nextChar.toUpperCase() && /[A-Z]/.test(nextChar);
    const nextStartsNew = nextChar && /[bpmfdtnlgkhjqxzhchshrzcsyw]/i.test(nextChar) &&
                          !['g', 'n', 'r'].includes(char.toLowerCase());

    if (hasVowel && (nextIsCapital || (nextStartsNew && !vowels.test(nextChar)) || i === cleaned.length - 1)) {
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
        }
      }
      if (current) {
        syllables.push(current);
        current = '';
      }
    }
  }
  if (current) syllables.push(current);

  if (syllables.length !== targetCount) {
    const words = pinyin.split(/\s+/);
    const result: string[] = [];
    for (const word of words) {
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
    if (result.length === targetCount) return result;
  }

  if (syllables.length !== targetCount && targetCount > 0) {
    const words = pinyin.split(/\s+/);
    if (words.length === targetCount) return words;
    while (syllables.length < targetCount) syllables.push('');
    return syllables.slice(0, targetCount);
  }

  return syllables;
}

interface HeaderProps {
  bookName: {
    chinese: string;
    english: string;
    pinyin: string;
  };
  chapter: number;
  onMenuClick?: () => void;
  onSettingsClick?: () => void;
  onVocabClick?: () => void;
}

export const Header = memo(function Header({
  bookName,
  chapter,
  onMenuClick,
  onSettingsClick,
  onVocabClick,
}: HeaderProps) {
  // Convert book name to correct character set (Traditional/Simplified)
  const convertedBookName = useConvertedBookName(bookName);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-30 safe-area-top"
      style={{
        backgroundColor: 'var(--bg-primary)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <div className="mx-auto flex max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl items-center justify-between px-4 py-1.5">
        {/* Left side - Vocabulary/Words button */}
        <div className="flex items-center w-20">
          <button
            className="touch-feedback rounded-lg px-3 py-1.5 transition-colors hover:bg-[var(--bg-secondary)]"
            style={{
              color: 'var(--text-secondary)',
              backgroundColor: 'transparent',
            }}
            onClick={onVocabClick}
            aria-label="Open vocabulary"
          >
            <span className="text-sm font-medium">Words</span>
          </button>
        </div>

        {/* Center - Book name with icon and chapter on same line */}
        <button
          className="touch-feedback flex items-center gap-2.5 rounded-lg px-3 py-1.5 transition-all hover:bg-[var(--bg-secondary)] group"
          onClick={onMenuClick}
        >
          {/* Book Name with Pinyin - book icon and chapter inline */}
          <div className="flex items-end gap-0.5">
            {(() => {
              const chars = convertedBookName.chinese.split('');
              const pinyinSyllables = splitPinyinToSyllables(convertedBookName.pinyin, chars.length);
              return chars.map((char, i) => (
                <span key={i} className="flex flex-col items-center">
                  <span
                    className="font-body text-[8px] italic leading-tight mb-0.5"
                    style={{ color: 'var(--text-tertiary)', opacity: 0.7 }}
                  >
                    {pinyinSyllables[i] || ''}
                  </span>
                  <span
                    className="font-chinese-serif text-[17px] leading-tight"
                    style={{ color: 'var(--text-primary)', letterSpacing: '0.02em' }}
                  >
                    {char}
                  </span>
                </span>
              ));
            })()}
          </div>

          {/* Chapter Number - same baseline as Chinese characters */}
          <span
            className="font-display text-lg font-medium tracking-wider transition-all group-hover:scale-105"
            style={{
              color: 'var(--text-secondary)',
              letterSpacing: '0.08em',
            }}
          >
            {chapter}
          </span>

          {/* Dropdown chevron */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4 transition-transform group-hover:translate-y-0.5"
            style={{ color: 'var(--text-tertiary)', opacity: 0.6 }}
          >
            <path
              fillRule="evenodd"
              d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {/* Right side buttons - same width as left for centering */}
        <div className="flex items-center justify-end gap-0.5 w-20">
          {/* Settings button */}
          <button
            className="touch-feedback rounded-lg p-2.5 transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
            onClick={onSettingsClick}
            aria-label="Open settings"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
});
