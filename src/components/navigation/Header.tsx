import { memo } from 'react';
import { useConvertedBookName } from '../../hooks';
import { splitChineseCharacters, splitPinyinSyllables } from '../../utils/pinyin';

// Chinese numerals with pinyin
const CHINESE_DIGITS: Record<number, { char: string; pinyin: string }> = {
  0: { char: '〇', pinyin: 'líng' },
  1: { char: '一', pinyin: 'yī' },
  2: { char: '二', pinyin: 'èr' },
  3: { char: '三', pinyin: 'sān' },
  4: { char: '四', pinyin: 'sì' },
  5: { char: '五', pinyin: 'wǔ' },
  6: { char: '六', pinyin: 'liù' },
  7: { char: '七', pinyin: 'qī' },
  8: { char: '八', pinyin: 'bā' },
  9: { char: '九', pinyin: 'jiǔ' },
  10: { char: '十', pinyin: 'shí' },
  100: { char: '百', pinyin: 'bǎi' },
};

// Convert number to Chinese characters with pinyin
function numberToChinese(num: number): Array<{ char: string; pinyin: string }> {
  if (num <= 0 || num > 150) return [{ char: String(num), pinyin: '' }];

  const result: Array<{ char: string; pinyin: string }> = [];

  if (num >= 100) {
    const hundreds = Math.floor(num / 100);
    result.push(CHINESE_DIGITS[hundreds]);
    result.push(CHINESE_DIGITS[100]);
    num = num % 100;
    if (num > 0 && num < 10) {
      result.push(CHINESE_DIGITS[0]); // Need 零 for numbers like 101
    }
  }

  if (num >= 10) {
    const tens = Math.floor(num / 10);
    // Only show tens digit if >= 20 or if we had hundreds
    if (tens > 1 || result.length > 0) {
      result.push(CHINESE_DIGITS[tens]);
    }
    result.push(CHINESE_DIGITS[10]);
    num = num % 10;
  }

  if (num > 0) {
    result.push(CHINESE_DIGITS[num]);
  }

  return result;
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
  onAudioClick?: () => void;
  isAudioActive?: boolean;
  isAudioAvailable?: boolean;
}

export const Header = memo(function Header({
  bookName,
  chapter,
  onMenuClick,
  onSettingsClick,
  onVocabClick,
  onAudioClick,
  isAudioActive = false,
  isAudioAvailable = false,
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
        {/* Left side - Vocabulary button (icon only) */}
        <div className="flex items-center w-20">
          <button
            className="touch-feedback rounded-lg p-2.5 transition-colors hover:bg-[var(--bg-secondary)]"
            style={{ color: 'var(--text-tertiary)' }}
            onClick={onVocabClick}
            aria-label="Open vocabulary"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="h-5 w-5"
            >
              {/* Card outline */}
              <rect x="4" y="5" width="16" height="14" rx="2" strokeLinecap="round" strokeLinejoin="round" />
              {/* Bold 文 character */}
              <text
                x="12"
                y="13"
                textAnchor="middle"
                dominantBaseline="middle"
                fill="currentColor"
                stroke="none"
                style={{
                  fontSize: '11px',
                  fontFamily: 'Noto Serif TC, serif',
                  fontWeight: 600,
                }}
              >
                文
              </text>
            </svg>
          </button>
        </div>

        {/* Center - Book name with icon and chapter on same line */}
        <button
          className="touch-feedback flex items-center gap-2.5 rounded-lg px-3 py-1.5 transition-all hover:bg-[var(--bg-secondary)] group"
          onClick={onMenuClick}
        >
          {/* Book Name and Chapter with Pinyin - cohesive inline display */}
          <div className="flex items-end gap-0.5">
            {(() => {
              const chars = splitChineseCharacters(convertedBookName.chinese);
              const pinyinSyllables = splitPinyinSyllables(convertedBookName.pinyin, chars.length);
              const chapterChars = numberToChinese(chapter);

              return (
                <>
                  {/* Book name characters */}
                  {chars.map((char, i) => (
                    <span key={`book-${i}`} className="flex flex-col items-center">
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
                  ))}
                  {/* Small gap between book name and chapter */}
                  <span className="w-1" />
                  {/* Chapter number in Chinese characters */}
                  {chapterChars.map((item, i) => (
                    <span key={`chapter-${i}`} className="flex flex-col items-center">
                      <span
                        className="font-body text-[8px] italic leading-tight mb-0.5"
                        style={{ color: 'var(--text-tertiary)', opacity: 0.7 }}
                      >
                        {item.pinyin}
                      </span>
                      <span
                        className="font-chinese-serif text-[17px] leading-tight"
                        style={{ color: 'var(--text-secondary)', letterSpacing: '0.02em' }}
                      >
                        {item.char}
                      </span>
                    </span>
                  ))}
                </>
              );
            })()}
          </div>

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
          {/* Audio button - only show if audio available or active */}
          {(isAudioAvailable || isAudioActive) && (
            <button
              className="touch-feedback rounded-lg p-2.5 transition-colors"
              style={{
                color: isAudioActive ? 'var(--accent)' : 'var(--text-tertiary)',
              }}
              onClick={onAudioClick}
              aria-label={isAudioActive ? 'Audio playing' : 'Listen to audio'}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill={isAudioActive ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth={isAudioActive ? 0 : 1.5}
                className="h-5 w-5"
              >
                {isAudioActive ? (
                  // Animated speaker icon when playing
                  <>
                    <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06z" />
                    <path d="M18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
                    <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
                  </>
                ) : (
                  // Simple speaker outline when not playing
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"
                  />
                )}
              </svg>
            </button>
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
        </div>
      </div>
    </header>
  );
});
