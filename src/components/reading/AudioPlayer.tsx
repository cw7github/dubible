import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AudioPlayerProps {
  isPlaying: boolean;
  isAvailable: boolean;
  isLoading?: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  currentVerseNumber: number | null;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onSetPlaybackRate: (rate: number) => void;
}

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5];

export const AudioPlayer = memo(function AudioPlayer({
  isPlaying,
  isAvailable,
  isLoading = false,
  currentTime,
  duration,
  playbackRate,
  currentVerseNumber,
  onTogglePlay,
  onSeek,
  onSetPlaybackRate,
}: AudioPlayerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showRateSelector, setShowRateSelector] = useState(false);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAvailable || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    onSeek(percentage * duration);
  };

  if (isLoading) {
    return (
      <motion.div
        className="flex items-center gap-2.5 rounded-full px-4 py-2"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          color: 'var(--text-tertiary)',
        }}
      >
        <motion.svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="h-5 w-5"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <circle cx="12" cy="12" r="10" strokeOpacity={0.25} />
          <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
        </motion.svg>
        <span className="font-body text-sm tracking-wide">Loading...</span>
      </motion.div>
    );
  }

  if (!isAvailable) {
    return (
      <motion.button
        className="touch-feedback flex items-center gap-2.5 rounded-full px-4 py-2 transition-colors"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          color: 'var(--text-tertiary)',
          opacity: 0.5,
        }}
        disabled
        whileTap={{ scale: 0.98 }}
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
            d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
          />
        </svg>
        <span className="font-body text-sm tracking-wide">Listen</span>
      </motion.button>
    );
  }

  return (
    <>
      {/* Collapsed: Simple play button */}
      <AnimatePresence mode="wait">
        {!isExpanded ? (
          <motion.button
            key="collapsed"
            className="touch-feedback flex items-center gap-2.5 rounded-full px-4 py-2 transition-colors"
            style={{
              backgroundColor: isPlaying ? 'var(--accent)' : 'var(--bg-secondary)',
              color: isPlaying ? 'white' : 'var(--text-secondary)',
            }}
            onClick={() => {
              if (isPlaying) {
                setIsExpanded(true);
              } else {
                onTogglePlay();
                setIsExpanded(true);
              }
            }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileTap={{ scale: 0.95 }}
          >
            {isPlaying ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 5.25v13.5m-7.5-13.5v13.5"
                />
              </svg>
            ) : (
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
                  d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
                />
              </svg>
            )}
            <span className="font-body text-sm tracking-wide">
              {isPlaying ? (currentVerseNumber ? `v${currentVerseNumber}` : 'Playing') : 'Listen'}
            </span>
          </motion.button>
        ) : (
          <motion.div
            key="expanded"
            className="flex flex-1 items-center gap-3"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Play/Pause button */}
            <motion.button
              className="touch-feedback flex h-10 w-10 items-center justify-center rounded-full transition-colors"
              style={{
                backgroundColor: isPlaying ? 'var(--accent)' : 'var(--bg-secondary)',
                color: isPlaying ? 'white' : 'var(--text-primary)',
              }}
              onClick={onTogglePlay}
              whileTap={{ scale: 0.92 }}
            >
              {isPlaying ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 5.25v13.5m-7.5-13.5v13.5"
                  />
                </svg>
              ) : (
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
                    d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
                  />
                </svg>
              )}
            </motion.button>

            {/* Progress bar */}
            <div className="flex flex-1 flex-col gap-1">
              <div
                className="h-1 cursor-pointer rounded-full overflow-hidden"
                style={{ backgroundColor: 'var(--bg-tertiary)' }}
                onClick={handleProgressClick}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    backgroundColor: 'var(--accent)',
                    boxShadow: '0 0 8px var(--accent-light)',
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              <div className="flex justify-between">
                <span
                  className="font-body text-xs tabular-nums tracking-wide"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {formatTime(currentTime)}
                </span>
                <span
                  className="font-body text-xs tabular-nums tracking-wide"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {formatTime(duration)}
                </span>
              </div>
            </div>

            {/* Speed selector */}
            <div className="relative">
              <motion.button
                className="touch-feedback rounded-lg px-2.5 py-1.5 font-body text-xs tabular-nums tracking-wide"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                }}
                onClick={() => setShowRateSelector(!showRateSelector)}
                whileTap={{ scale: 0.95 }}
              >
                {playbackRate}×
              </motion.button>

              <AnimatePresence>
                {showRateSelector && (
                  <motion.div
                    className="absolute bottom-full right-0 mb-2 rounded-xl overflow-hidden shadow-elevated"
                    style={{
                      backgroundColor: 'var(--card-bg)',
                      border: '1px solid var(--border-subtle)',
                    }}
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                  >
                    {PLAYBACK_RATES.map((rate, index) => (
                      <motion.button
                        key={rate}
                        className="block w-full px-4 py-2.5 font-body text-sm text-left transition-colors"
                        style={{
                          backgroundColor: rate === playbackRate ? 'var(--accent-subtle)' : 'transparent',
                          color: rate === playbackRate ? 'var(--accent)' : 'var(--text-primary)',
                        }}
                        onClick={() => {
                          onSetPlaybackRate(rate);
                          setShowRateSelector(false);
                        }}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        {rate}×
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Close/collapse button */}
            <motion.button
              className="touch-feedback rounded-lg p-2"
              style={{ color: 'var(--text-tertiary)' }}
              onClick={() => setIsExpanded(false)}
              whileTap={{ scale: 0.92 }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="h-4 w-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});
