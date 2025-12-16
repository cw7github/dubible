import { firestoreSync } from './firebaseSync';
import type { SavedWord } from '../types/vocabulary';
import type { Bookmark } from '../stores/bookmarkStore';
import type { PassageEntry } from '../stores/historyStore';
import type { Settings } from '../types';

// Local storage keys used by the app
const STORAGE_KEYS = {
  vocabulary: 'bilingual-bible-vocabulary',
  bookmarks: 'bilingual-bible-bookmarks',
  history: 'passage-history-storage',
  settings: 'bilingual-bible-settings',
  migrationFlag: 'bilingual-bible-migration-complete',
};

interface LocalStorageData {
  vocabulary: SavedWord[];
  bookmarks: Bookmark[];
  history: PassageEntry[];
  settings: Settings | null;
}

// Read data from localStorage
function readLocalStorageData(): LocalStorageData {
  const vocabulary: SavedWord[] = [];
  const bookmarks: Bookmark[] = [];
  const history: PassageEntry[] = [];
  let settings: Settings | null = null;

  try {
    // Vocabulary
    const vocabData = localStorage.getItem(STORAGE_KEYS.vocabulary);
    if (vocabData) {
      const parsed = JSON.parse(vocabData);
      if (parsed.state && Array.isArray(parsed.state.words)) {
        vocabulary.push(...parsed.state.words);
      }
    }

    // Bookmarks
    const bookmarksData = localStorage.getItem(STORAGE_KEYS.bookmarks);
    if (bookmarksData) {
      const parsed = JSON.parse(bookmarksData);
      if (parsed.state && Array.isArray(parsed.state.bookmarks)) {
        bookmarks.push(...parsed.state.bookmarks);
      }
    }

    // History
    const historyData = localStorage.getItem(STORAGE_KEYS.history);
    if (historyData) {
      const parsed = JSON.parse(historyData);
      if (parsed.state && Array.isArray(parsed.state.entries)) {
        history.push(...parsed.state.entries);
      }
    }

    // Settings
    const settingsData = localStorage.getItem(STORAGE_KEYS.settings);
    if (settingsData) {
      const parsed = JSON.parse(settingsData);
      if (parsed.state) {
        settings = parsed.state as Settings;
      }
    }
  } catch (error) {
    console.error('Error reading localStorage data:', error);
  }

  return { vocabulary, bookmarks, history, settings };
}

// Check if migration has already been completed for this user
function hasMigrated(uid: string): boolean {
  const migrationFlag = localStorage.getItem(STORAGE_KEYS.migrationFlag);
  if (!migrationFlag) return false;

  try {
    const migratedUsers = JSON.parse(migrationFlag);
    return Array.isArray(migratedUsers) && migratedUsers.includes(uid);
  } catch {
    return false;
  }
}

// Mark migration as complete for this user
function markMigrationComplete(uid: string): void {
  try {
    const migrationFlag = localStorage.getItem(STORAGE_KEYS.migrationFlag);
    let migratedUsers: string[] = [];

    if (migrationFlag) {
      migratedUsers = JSON.parse(migrationFlag);
      if (!Array.isArray(migratedUsers)) {
        migratedUsers = [];
      }
    }

    if (!migratedUsers.includes(uid)) {
      migratedUsers.push(uid);
      localStorage.setItem(STORAGE_KEYS.migrationFlag, JSON.stringify(migratedUsers));
    }
  } catch (error) {
    console.error('Error marking migration complete:', error);
  }
}

// Main migration function
export async function migrateLocalDataToFirestore(
  uid: string,
  onProgress?: (step: string, current: number, total: number) => void
): Promise<{
  success: boolean;
  migratedCounts: {
    vocabulary: number;
    bookmarks: number;
    history: number;
    settings: boolean;
  };
  error?: string;
}> {
  // Check if already migrated
  if (hasMigrated(uid)) {
    return {
      success: true,
      migratedCounts: {
        vocabulary: 0,
        bookmarks: 0,
        history: 0,
        settings: false,
      },
    };
  }

  try {
    // Read all data from localStorage
    const localData = readLocalStorageData();

    const totalSteps = 4;
    let currentStep = 0;

    // Migrate vocabulary
    currentStep++;
    onProgress?.('Migrating vocabulary...', currentStep, totalSteps);
    if (localData.vocabulary.length > 0) {
      await firestoreSync.syncVocabularyToCloud(uid, localData.vocabulary);
    }

    // Migrate bookmarks
    currentStep++;
    onProgress?.('Migrating bookmarks...', currentStep, totalSteps);
    if (localData.bookmarks.length > 0) {
      await firestoreSync.syncBookmarksToCloud(uid, localData.bookmarks);
    }

    // Migrate history
    currentStep++;
    onProgress?.('Migrating history...', currentStep, totalSteps);
    if (localData.history.length > 0) {
      await firestoreSync.syncHistoryToCloud(uid, localData.history);
    }

    // Migrate settings
    currentStep++;
    onProgress?.('Migrating settings...', currentStep, totalSteps);
    if (localData.settings) {
      await firestoreSync.syncSettingsToCloud(uid, localData.settings);
    }

    // Mark migration as complete
    markMigrationComplete(uid);

    return {
      success: true,
      migratedCounts: {
        vocabulary: localData.vocabulary.length,
        bookmarks: localData.bookmarks.length,
        history: localData.history.length,
        settings: !!localData.settings,
      },
    };
  } catch (error) {
    console.error('Error migrating data to Firestore:', error);
    return {
      success: false,
      migratedCounts: {
        vocabulary: 0,
        bookmarks: 0,
        history: 0,
        settings: false,
      },
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Utility to merge cloud and local data (for conflict resolution)
export function mergeData<T extends { id?: string; createdAt?: number; timestamp?: number }>(
  cloudData: T[],
  localData: T[]
): T[] {
  const merged = new Map<string, T>();

  // Add cloud data first
  cloudData.forEach((item) => {
    const key =
      item.id || `${item.createdAt || item.timestamp || Date.now()}-${Math.random()}`;
    merged.set(key, item);
  });

  // Add local data, preferring newer items
  localData.forEach((item) => {
    const key =
      item.id || `${item.createdAt || item.timestamp || Date.now()}-${Math.random()}`;
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, item);
    } else {
      // Prefer the item with the latest timestamp
      const existingTime = existing.createdAt || existing.timestamp || 0;
      const itemTime = item.createdAt || item.timestamp || 0;

      if (itemTime > existingTime) {
        merged.set(key, item);
      }
    }
  });

  return Array.from(merged.values());
}
