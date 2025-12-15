import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
  setChineseVersion: (version: string) => void;
  setEnglishVersion: (version: string) => void;
  updateLastReadingPosition: (position: Settings['lastReadingPosition']) => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      setTheme: (theme) => {
        // Update DOM for CSS variable switching
        document.documentElement.setAttribute('data-theme', theme);
        set({ theme });
      },

      setFontFamily: (fontFamily) => set({ fontFamily }),

      setTextSize: (textSize) => set({ textSize }),

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

      setChineseVersion: (chineseVersion) => set({ chineseVersion }),

      setEnglishVersion: (englishVersion) => set({ englishVersion }),

      updateLastReadingPosition: (lastReadingPosition) =>
        set({ lastReadingPosition }),

      resetSettings: () => {
        document.documentElement.setAttribute('data-theme', DEFAULT_SETTINGS.theme);
        document.documentElement.setAttribute('data-pinyin-level', DEFAULT_SETTINGS.pinyinLevel);
        document.documentElement.setAttribute('data-pinyin', DEFAULT_SETTINGS.pinyinDisplay);
        document.documentElement.setAttribute(
          'data-show-hsk',
          String(DEFAULT_SETTINGS.showHskIndicators)
        );
        set(DEFAULT_SETTINGS);
      },
    }),
    {
      name: 'bilingual-bible-settings',
      onRehydrateStorage: () => (state) => {
        // Apply settings to DOM on rehydration
        if (state) {
          document.documentElement.setAttribute('data-theme', state.theme);
          document.documentElement.setAttribute('data-pinyin-level', state.pinyinLevel || 'all');
          document.documentElement.setAttribute('data-pinyin', state.pinyinDisplay);
          document.documentElement.setAttribute(
            'data-show-hsk',
            String(state.showHskIndicators)
          );
        }
      },
    }
  )
);
