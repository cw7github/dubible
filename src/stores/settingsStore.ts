import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import {
  DEFAULT_SETTINGS,
} from '../types';
import type {
  Settings,
  Theme,
  FontFamily,
  TextSize,
  PinyinLevel,
  PinyinDisplay,
  CharacterSet,
  AudioSpeed,
} from '../types';

// Theme colors for PWA status bar (matches --bg-primary from index.css)
const THEME_COLORS: Record<Theme, string> = {
  light: '#FAF8F3',  // Warm parchment
  sepia: '#F0E6D2',  // Aged manuscript
  dark: '#0F0C0A',   // Midnight gold
};

// Update the theme-color meta tag for PWA status bar
function updateThemeColor(theme: Theme): void {
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', THEME_COLORS[theme]);
  }
}

interface SettingsState extends Settings {
  // Actions
  setTheme: (theme: Theme) => void;
  setFontFamily: (fontFamily: FontFamily) => void;
  setTextSize: (textSize: TextSize) => void;
  setPinyinLevel: (pinyinLevel: PinyinLevel) => void;
  setPinyinDisplay: (pinyinDisplay: PinyinDisplay) => void; // Legacy
  setCharacterSet: (characterSet: CharacterSet) => void;
  setShowHskIndicators: (show: boolean) => void;
  setAudioSpeed: (speed: AudioSpeed) => void;
  setAmbientMusicEnabled: (enabled: boolean) => void;
  setChineseVersion: (version: string) => void;
  setEnglishVersion: (version: string) => void;
  updateLastReadingPosition: (position: Settings['lastReadingPosition']) => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  subscribeWithSelector(
    persist(
      (set) => ({
        ...DEFAULT_SETTINGS,

      setTheme: (theme) => {
        // Update DOM for CSS variable switching
        document.documentElement.setAttribute('data-theme', theme);
        // Update PWA status bar color
        updateThemeColor(theme);
        set({ theme });
      },

      setFontFamily: (fontFamily) => set({ fontFamily }),

      setTextSize: (textSize) => {
        document.documentElement.setAttribute('data-text-size', textSize);
        set({ textSize });
      },

      setPinyinLevel: (pinyinLevel) => {
        document.documentElement.setAttribute('data-pinyin-level', pinyinLevel);
        set({ pinyinLevel });
      },

      // Legacy - kept for backwards compatibility
      setPinyinDisplay: (pinyinDisplay) => {
        document.documentElement.setAttribute('data-pinyin', pinyinDisplay);
        set({ pinyinDisplay });
      },

      setCharacterSet: (characterSet) => set({ characterSet }),

      setShowHskIndicators: (showHskIndicators) => {
        document.documentElement.setAttribute(
          'data-show-hsk',
          String(showHskIndicators)
        );
        set({ showHskIndicators });
      },

      setAudioSpeed: (audioSpeed) => set({ audioSpeed }),

      setAmbientMusicEnabled: (ambientMusicEnabled) => set({ ambientMusicEnabled }),

      setChineseVersion: (chineseVersion) => set({ chineseVersion }),

      setEnglishVersion: (englishVersion) => set({ englishVersion }),

      updateLastReadingPosition: (lastReadingPosition) =>
        set({ lastReadingPosition }),

      resetSettings: () => {
        document.documentElement.setAttribute('data-theme', DEFAULT_SETTINGS.theme);
        document.documentElement.setAttribute('data-text-size', DEFAULT_SETTINGS.textSize);
        document.documentElement.setAttribute('data-pinyin-level', DEFAULT_SETTINGS.pinyinLevel);
        document.documentElement.setAttribute('data-pinyin', DEFAULT_SETTINGS.pinyinDisplay);
        document.documentElement.setAttribute(
          'data-show-hsk',
          String(DEFAULT_SETTINGS.showHskIndicators)
        );
        // Update PWA status bar color
        updateThemeColor(DEFAULT_SETTINGS.theme);
        set(DEFAULT_SETTINGS);
      },
      }),
      {
        name: 'bilingual-bible-settings',
        onRehydrateStorage: () => (state) => {
          // Apply settings to DOM on rehydration
          if (state) {
            document.documentElement.setAttribute('data-theme', state.theme);
            document.documentElement.setAttribute('data-text-size', state.textSize || 'md');
            document.documentElement.setAttribute('data-pinyin-level', state.pinyinLevel || 'all');
            document.documentElement.setAttribute('data-pinyin', state.pinyinDisplay);
            document.documentElement.setAttribute(
              'data-show-hsk',
              String(state.showHskIndicators)
            );
            // Update PWA status bar color
            updateThemeColor(state.theme);
          }
        },
      }
    )
  )
);
