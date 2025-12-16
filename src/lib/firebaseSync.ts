import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  writeBatch,
  onSnapshot,
  query,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type { SavedWord } from '../types/vocabulary';
import type { Bookmark } from '../stores/bookmarkStore';
import type { PassageEntry } from '../stores/historyStore';
import type { Settings } from '../types';

// Firestore collection paths
const getUserPath = (uid: string) => `users/${uid}`;
const getVocabularyPath = (uid: string) => `${getUserPath(uid)}/vocabulary`;
const getBookmarksPath = (uid: string) => `${getUserPath(uid)}/bookmarks`;
const getHistoryPath = (uid: string) => `${getUserPath(uid)}/history`;
const getSettingsPath = (uid: string) => `${getUserPath(uid)}/settings`;

// Generic sync functions
export class FirestoreSync {
  private unsubscribers: Unsubscribe[] = [];

  // Clean up all listeners
  cleanup() {
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
  }

  // Vocabulary sync
  async syncVocabularyToCloud(uid: string, words: SavedWord[]): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');

    const batch = writeBatch(db);
    const vocabPath = getVocabularyPath(uid);

    // Add all words to batch
    words.forEach((word) => {
      const wordRef = doc(db, vocabPath, word.id);
      batch.set(wordRef, word);
    });

    await batch.commit();
  }

  async loadVocabularyFromCloud(uid: string): Promise<SavedWord[]> {
    if (!db) throw new Error('Firestore not initialized');

    const vocabPath = getVocabularyPath(uid);
    const vocabCollection = collection(db, vocabPath);
    const snapshot = await getDocs(vocabCollection);

    return snapshot.docs.map((doc) => doc.data() as SavedWord);
  }

  async addVocabularyWord(uid: string, word: SavedWord): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');

    const wordRef = doc(db, getVocabularyPath(uid), word.id);
    await setDoc(wordRef, word);
  }

  async removeVocabularyWord(uid: string, wordId: string): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');

    const wordRef = doc(db, getVocabularyPath(uid), wordId);
    await deleteDoc(wordRef);
  }

  async updateVocabularyWord(uid: string, word: SavedWord): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');

    const wordRef = doc(db, getVocabularyPath(uid), word.id);
    await setDoc(wordRef, word, { merge: true });
  }

  subscribeToVocabulary(
    uid: string,
    callback: (words: SavedWord[]) => void
  ): Unsubscribe {
    if (!db) throw new Error('Firestore not initialized');

    const vocabCollection = collection(db, getVocabularyPath(uid));
    const q = query(vocabCollection);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const words = snapshot.docs.map((doc) => doc.data() as SavedWord);
      callback(words);
    });

    this.unsubscribers.push(unsubscribe);
    return unsubscribe;
  }

  // Bookmarks sync
  async syncBookmarksToCloud(uid: string, bookmarks: Bookmark[]): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');

    const batch = writeBatch(db);
    const bookmarksPath = getBookmarksPath(uid);

    bookmarks.forEach((bookmark) => {
      const bookmarkRef = doc(db, bookmarksPath, bookmark.id);
      batch.set(bookmarkRef, bookmark);
    });

    await batch.commit();
  }

  async loadBookmarksFromCloud(uid: string): Promise<Bookmark[]> {
    if (!db) throw new Error('Firestore not initialized');

    const bookmarksCollection = collection(db, getBookmarksPath(uid));
    const snapshot = await getDocs(bookmarksCollection);

    return snapshot.docs.map((doc) => doc.data() as Bookmark);
  }

  async addBookmark(uid: string, bookmark: Bookmark): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');

    const bookmarkRef = doc(db, getBookmarksPath(uid), bookmark.id);
    await setDoc(bookmarkRef, bookmark);
  }

  async removeBookmark(uid: string, bookmarkId: string): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');

    const bookmarkRef = doc(db, getBookmarksPath(uid), bookmarkId);
    await deleteDoc(bookmarkRef);
  }

  subscribeToBookmarks(
    uid: string,
    callback: (bookmarks: Bookmark[]) => void
  ): Unsubscribe {
    if (!db) throw new Error('Firestore not initialized');

    const bookmarksCollection = collection(db, getBookmarksPath(uid));
    const q = query(bookmarksCollection);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bookmarks = snapshot.docs.map((doc) => doc.data() as Bookmark);
      callback(bookmarks);
    });

    this.unsubscribers.push(unsubscribe);
    return unsubscribe;
  }

  // History sync
  async syncHistoryToCloud(uid: string, entries: PassageEntry[]): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');

    const batch = writeBatch(db);
    const historyPath = getHistoryPath(uid);

    entries.forEach((entry, index) => {
      // Use index as ID for history entries since they don't have unique IDs
      const entryRef = doc(db, historyPath, `entry-${index}`);
      batch.set(entryRef, entry);
    });

    await batch.commit();
  }

  async loadHistoryFromCloud(uid: string): Promise<PassageEntry[]> {
    if (!db) throw new Error('Firestore not initialized');

    const historyCollection = collection(db, getHistoryPath(uid));
    const snapshot = await getDocs(historyCollection);

    return snapshot.docs
      .map((doc) => doc.data() as PassageEntry)
      .sort((a, b) => a.timestamp - b.timestamp); // Sort by timestamp
  }

  subscribeToHistory(
    uid: string,
    callback: (entries: PassageEntry[]) => void
  ): Unsubscribe {
    if (!db) throw new Error('Firestore not initialized');

    const historyCollection = collection(db, getHistoryPath(uid));
    const q = query(historyCollection);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs
        .map((doc) => doc.data() as PassageEntry)
        .sort((a, b) => a.timestamp - b.timestamp);
      callback(entries);
    });

    this.unsubscribers.push(unsubscribe);
    return unsubscribe;
  }

  // Settings sync
  async syncSettingsToCloud(uid: string, settings: Settings): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');

    const settingsRef = doc(db, getSettingsPath(uid), 'user_settings');
    await setDoc(settingsRef, settings);
  }

  async loadSettingsFromCloud(uid: string): Promise<Settings | null> {
    if (!db) throw new Error('Firestore not initialized');

    const settingsRef = doc(db, getSettingsPath(uid), 'user_settings');
    const snapshot = await getDoc(settingsRef);

    if (snapshot.exists()) {
      return snapshot.data() as Settings;
    }

    return null;
  }

  subscribeToSettings(uid: string, callback: (settings: Settings) => void): Unsubscribe {
    if (!db) throw new Error('Firestore not initialized');

    const settingsRef = doc(db, getSettingsPath(uid), 'user_settings');

    const unsubscribe = onSnapshot(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as Settings);
      }
    });

    this.unsubscribers.push(unsubscribe);
    return unsubscribe;
  }

  // User profile
  async updateUserProfile(
    uid: string,
    profile: {
      email: string | null;
      displayName: string | null;
      photoURL: string | null;
      lastSync: number;
    }
  ): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');

    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, profile, { merge: true });
  }
}

// Export singleton instance
export const firestoreSync = new FirestoreSync();
