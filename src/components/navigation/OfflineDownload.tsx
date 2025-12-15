import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getPreprocessedBookInfo,
  downloadBookForOffline,
  isBookDownloaded,
  clearBookDownload,
} from '../../services/preprocessedLoader';

interface OfflineDownloadProps {
  bookId: string;
  bookName: string; // For future use in notifications/messages
}

export function OfflineDownload({ bookId }: OfflineDownloadProps) {
  const [hasPreprocessed, setHasPreprocessed] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  // Check if book has preprocessed data
  useEffect(() => {
    getPreprocessedBookInfo(bookId).then((info) => {
      setHasPreprocessed(!!info);
      setIsDownloaded(isBookDownloaded(bookId));
    });
  }, [bookId]);

  // Update download status when storage changes
  useEffect(() => {
    const handleStorageChange = () => {
      setIsDownloaded(isBookDownloaded(bookId));
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [bookId]);

  const handleDownload = useCallback(async () => {
    setIsDownloading(true);
    setError(null);

    try {
      const result = await downloadBookForOffline(bookId, (current, total) => {
        setDownloadProgress({ current, total });
      });

      if (result.success) {
        setIsDownloaded(true);
      } else {
        setError(`Downloaded ${result.downloaded} chapters, ${result.failed} failed`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setIsDownloading(false);
      setDownloadProgress({ current: 0, total: 0 });
    }
  }, [bookId]);

  const handleRemove = useCallback(() => {
    clearBookDownload(bookId);
    setIsDownloaded(false);
  }, [bookId]);

  // Don't show anything if no preprocessed data available
  if (!hasPreprocessed) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {isDownloaded ? (
        <motion.button
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-secondary)',
          }}
          onClick={handleRemove}
          whileTap={{ scale: 0.95 }}
          title="Remove offline data"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-3.5 w-3.5"
          >
            <path
              fillRule="evenodd"
              d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
              clipRule="evenodd"
            />
          </svg>
          <span>Offline</span>
        </motion.button>
      ) : (
        <motion.button
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors touch-feedback"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-secondary)',
          }}
          onClick={handleDownload}
          disabled={isDownloading}
          whileTap={{ scale: 0.95 }}
          title="Download for offline use"
        >
          {isDownloading ? (
            <>
              <motion.svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-3.5 w-3.5"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <path
                  fillRule="evenodd"
                  d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z"
                  clipRule="evenodd"
                />
              </motion.svg>
              <span>
                {downloadProgress.current}/{downloadProgress.total}
              </span>
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-3.5 w-3.5"
              >
                <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
              </svg>
              <span>Download</span>
            </>
          )}
        </motion.button>
      )}

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="text-xs"
            style={{ color: 'var(--text-error)' }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
