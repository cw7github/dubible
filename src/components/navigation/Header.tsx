import { memo } from 'react';
import { useSettingsStore, useAuthStore } from '../../stores';

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
  /** Hide header for focus mode */
  isHidden?: boolean;
}

export const Header = memo(function Header({
  bookName,
  chapter,
  onMenuClick,
  onSettingsClick,
  onVocabClick,
  isHidden = false,
}: HeaderProps) {
  const { theme, setTheme } = useSettingsStore();
  const { isAuthenticated, isSyncing } = useAuthStore();

  const cycleTheme = () => {
    const themes: ('light' | 'sepia' | 'dark')[] = ['light', 'sepia', 'dark'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-30 safe-area-top"
      style={{
        backgroundColor: 'var(--bg-primary)',
        borderBottom: '1px solid var(--border-subtle)',
        transform: isHidden ? 'translateY(-100%)' : 'translateY(0)',
        opacity: isHidden ? 0 : 1,
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        willChange: 'transform, opacity',
      }}
    >
      <div className="mx-auto flex max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl items-center justify-between px-4 py-3">
        {/* Left side - Vocabulary/Words button */}
        <div className="flex items-center w-20">
          <button
            className="touch-feedback flex items-center gap-1.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-[var(--bg-secondary)]"
            style={{
              color: 'var(--text-secondary)',
              backgroundColor: 'transparent',
            }}
            onClick={onVocabClick}
            aria-label="Open vocabulary"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-4.5 w-4.5"
              style={{ width: '18px', height: '18px' }}
            >
              <path d="M11.25 4.533A9.707 9.707 0 006 3a9.735 9.735 0 00-3.25.555.75.75 0 00-.5.707v14.25a.75.75 0 001 .707A8.237 8.237 0 016 18.75c1.995 0 3.823.707 5.25 1.886V4.533zM12.75 20.636A8.214 8.214 0 0118 18.75c.966 0 1.89.166 2.75.47a.75.75 0 001-.708V4.262a.75.75 0 00-.5-.707A9.735 9.735 0 0018 3a9.707 9.707 0 00-5.25 1.533v16.103z" />
            </svg>
            <span className="text-xs font-medium">Words</span>
          </button>
        </div>

        {/* Center - Book and chapter (absolutely centered) */}
        <button
          className="touch-feedback flex items-center gap-2.5 rounded-lg px-3 py-1.5 transition-colors hover:bg-[var(--bg-secondary)]"
          onClick={onMenuClick}
        >
          <div className="flex items-end gap-0.5">
            {(() => {
              const chars = bookName.chinese.split('');
              const pinyinSyllables = splitPinyinToSyllables(bookName.pinyin, chars.length);
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
          <span
            className="font-display text-sm"
            style={{ color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}
          >
            {chapter}
          </span>
        </button>

        {/* Right side buttons - same width as left for centering */}
        <div className="flex items-center justify-end gap-0.5 w-20">
          {/* Sync status indicator */}
          {isAuthenticated && isSyncing && (
            <div className="mr-1">
              <div className="animate-spin">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="h-4 w-4"
                  style={{ color: 'var(--text-accent)' }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                  />
                </svg>
              </div>
            </div>
          )}

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

          {/* Theme toggle - elegant */}
          <button
            className="touch-feedback rounded-lg p-2.5 transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onClick={cycleTheme}
            aria-label={`Current theme: ${theme}. Click to change.`}
          >
            {theme === 'light' && (
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
                  d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
                />
              </svg>
            )}
            {theme === 'sepia' && (
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
                  d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
                />
              </svg>
            )}
            {theme === 'dark' && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-5 w-5"
              >
                <path
                  fillRule="evenodd"
                  d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
  );
});
