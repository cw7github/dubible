import { useEffect } from 'react';
import { ReadingScreen } from './components/reading';
import { useSettingsStore } from './stores';
import { useSyncManager } from './hooks';

function App() {
  const { theme, textSize, pinyinDisplay, showHskIndicators } = useSettingsStore();

  // Initialize sync manager for Firebase sync
  useSyncManager();

  // Initialize DOM attributes on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-text-size', textSize);
    document.documentElement.setAttribute('data-pinyin', pinyinDisplay);
    document.documentElement.setAttribute('data-show-hsk', String(showHskIndicators));
  }, [theme, textSize, pinyinDisplay, showHskIndicators]);

  return <ReadingScreen />;
}

export default App;
