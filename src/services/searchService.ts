import { BIBLE_BOOKS, getBookById } from '../data/bible/books';

export interface SearchResult {
  bookId: string;
  bookName: {
    chinese: string;
    english: string;
  };
  chapter: number;
  verse: number;
  text: string;
  matchedText: string;
  matchStart: number;
  matchEnd: number;
}

interface CachedChapter {
  bookId: string;
  chapter: number;
  verses: Array<{
    number: number;
    text: string;
  }>;
}

class SearchService {
  private chapterCache: Map<string, CachedChapter> = new Map();
  private isIndexing = false;
  private indexProgress = 0;

  /**
   * Load a chapter's data for searching
   */
  private async loadChapter(bookId: string, chapter: number): Promise<CachedChapter | null> {
    const key = `${bookId}:${chapter}`;
    if (this.chapterCache.has(key)) {
      return this.chapterCache.get(key)!;
    }

    try {
      const response = await fetch(`/data/preprocessed/${bookId}/chapter-${chapter}.json`);
      if (!response.ok) return null;

      const data = await response.json();
      const cached: CachedChapter = {
        bookId,
        chapter,
        verses: data.verses.map((v: { number: number; text: string }) => ({
          number: v.number,
          text: v.text,
        })),
      };

      this.chapterCache.set(key, cached);
      return cached;
    } catch {
      return null;
    }
  }

  /**
   * Pre-load all chapters for faster searching
   */
  async buildIndex(onProgress?: (percent: number) => void): Promise<void> {
    if (this.isIndexing) return;
    this.isIndexing = true;

    const totalChapters = BIBLE_BOOKS.reduce((sum, book) => sum + book.chapterCount, 0);
    let loaded = 0;

    for (const book of BIBLE_BOOKS) {
      for (let chapter = 1; chapter <= book.chapterCount; chapter++) {
        await this.loadChapter(book.id, chapter);
        loaded++;
        this.indexProgress = Math.round((loaded / totalChapters) * 100);
        if (onProgress) {
          onProgress(this.indexProgress);
        }
      }
    }

    this.isIndexing = false;
  }

  /**
   * Get index build progress
   */
  getIndexProgress(): number {
    return this.indexProgress;
  }

  /**
   * Check if a specific book is indexed
   */
  isBookIndexed(bookId: string): boolean {
    const book = BIBLE_BOOKS.find(b => b.id === bookId);
    if (!book) return false;

    for (let chapter = 1; chapter <= book.chapterCount; chapter++) {
      if (!this.chapterCache.has(`${bookId}:${chapter}`)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Search for text across all loaded chapters
   */
  async search(
    query: string,
    options: {
      maxResults?: number;
      bookFilter?: string[];
      testamentFilter?: 'old' | 'new' | null;
    } = {}
  ): Promise<SearchResult[]> {
    const { maxResults = 50, bookFilter, testamentFilter } = options;
    const results: SearchResult[] = [];
    const normalizedQuery = query.toLowerCase().trim();

    if (!normalizedQuery) return results;

    // Determine which books to search
    let booksToSearch = BIBLE_BOOKS;
    if (testamentFilter) {
      booksToSearch = booksToSearch.filter(b => b.testament === testamentFilter);
    }
    if (bookFilter && bookFilter.length > 0) {
      booksToSearch = booksToSearch.filter(b => bookFilter.includes(b.id));
    }

    // Search through books
    for (const book of booksToSearch) {
      if (results.length >= maxResults) break;

      for (let chapter = 1; chapter <= book.chapterCount; chapter++) {
        if (results.length >= maxResults) break;

        const chapterData = await this.loadChapter(book.id, chapter);
        if (!chapterData) continue;

        for (const verse of chapterData.verses) {
          if (results.length >= maxResults) break;

          const normalizedText = verse.text.toLowerCase();
          const matchIndex = normalizedText.indexOf(normalizedQuery);

          if (matchIndex !== -1) {
            const bookInfo = getBookById(book.id);
            results.push({
              bookId: book.id,
              bookName: bookInfo ? bookInfo.name : { chinese: book.id, english: book.id },
              chapter,
              verse: verse.number,
              text: verse.text,
              matchedText: verse.text.substring(matchIndex, matchIndex + query.length),
              matchStart: matchIndex,
              matchEnd: matchIndex + query.length,
            });
          }
        }
      }
    }

    return results;
  }

  /**
   * Quick search in a single book (faster, on-demand loading)
   */
  async searchInBook(bookId: string, query: string, maxResults = 20): Promise<SearchResult[]> {
    return this.search(query, { maxResults, bookFilter: [bookId] });
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.chapterCache.clear();
    this.indexProgress = 0;
  }
}

export const searchService = new SearchService();
