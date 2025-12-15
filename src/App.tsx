import { useEffect } from 'react';
import { ReadingScreen } from './components/reading';
import { useSettingsStore } from './stores';

function App() {
  const { theme, pinyinDisplay, showHskIndicators } = useSettingsStore();

  // Initialize DOM attributes on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-pinyin', pinyinDisplay);
    document.documentElement.setAttribute('data-show-hsk', String(showHskIndicators));
  }, [theme, pinyinDisplay, showHskIndicators]);

  return <ReadingScreen />;
}

export default App;
