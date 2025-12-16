import { memo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProgressStore, useReadingPlansStore, READING_PLANS } from '../../stores';
import { getBookById } from '../../data/bible/books';
import { splitPinyinSyllables } from '../../utils/pinyin';
import type { ReadingPlan, PlanPassage } from '../../types/progress';

// Helper component for displaying Chinese text with pinyin above each character
const ChineseWithPinyin = memo(function ChineseWithPinyin({
  chinese,
  pinyin,
  className = '',
  pinyinClassName = '',
}: {
  chinese: string;
  pinyin: string;
  className?: string;
  pinyinClassName?: string;
}) {
  const chars = [...chinese];
  const syllables = splitPinyinSyllables(pinyin, chars.length);

  return (
    <span className="inline-flex">
      {chars.map((char, idx) => (
        <span key={idx} className="flex flex-col items-center">
          <span
            className={`text-[8px] md:text-[10px] leading-tight ${pinyinClassName || 'opacity-70'}`}
            style={pinyinClassName ? undefined : { color: 'var(--text-tertiary)' }}
          >
            {syllables[idx] || ''}
          </span>
          <span className={className}>{char}</span>
        </span>
      ))}
    </span>
  );
});

interface DashboardScreenProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (bookId: string, chapter: number) => void;
}

export const DashboardScreen = memo(function DashboardScreen({
  isOpen,
  onClose,
  onNavigate,
}: DashboardScreenProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-45 glass"
            style={{ backgroundColor: 'var(--overlay)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Panel - slides in from right */}
          <motion.div
            className="fixed top-0 right-0 bottom-0 z-46 w-80 max-w-[85vw] md:w-[420px] lg:w-[480px] md:max-w-[60vw] overflow-hidden shadow-elevated safe-area-top safe-area-bottom"
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderLeft: '1px solid var(--border-subtle)',
            }}
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{
              type: 'spring',
              damping: 32,
              stiffness: 380,
              opacity: { duration: 0.2 }
            }}
          >
            {/* Header */}
            <motion.div
              className="px-5 py-4 md:px-7 md:py-6"
              style={{ borderBottom: '1px solid var(--border)' }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.3, ease: 'easeOut' }}
            >
              <div className="flex items-center justify-between">
                <h2
                  className="font-display text-xs md:text-sm tracking-widest uppercase flex items-center gap-2"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  <span className="inline-block w-1 h-1 rounded-full" style={{ backgroundColor: 'var(--text-tertiary)', opacity: 0.5 }} />
                  Reading Plans
                </h2>
                <motion.button
                  className="touch-feedback rounded-lg p-1.5"
                  style={{ color: 'var(--text-tertiary)' }}
                  onClick={onClose}
                  aria-label="Close"
                  whileTap={{ scale: 0.92 }}
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </motion.button>
              </div>

              {/* Title with pinyin */}
              <div className="mt-3 md:mt-4 flex items-center gap-2">
                <ChineseWithPinyin
                  chinese="讀經計劃"
                  pinyin="dú jīng jì huà"
                  className="font-chinese-serif text-lg md:text-2xl"
                  pinyinClassName="text-[7px] md:text-[9px]"
                />
              </div>
            </motion.div>

            {/* Content - Single unified view */}
            <motion.div
              className="h-full overflow-y-auto pb-20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.3 }}
            >
              <PlansContent onNavigate={onNavigate} onClose={onClose} />
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

// ============================================
// UNIFIED PLANS CONTENT
// ============================================

const PlansContent = memo(function PlansContent({
  onNavigate,
  onClose,
}: {
  onNavigate: (bookId: string, chapter: number) => void;
  onClose: () => void;
}) {
  const { streak, getWeekHistory } = useProgressStore();
  const {
    activePlan,
    startPlan,
    markDayComplete,
    goToDay,
    goToNextDay,
    goToPreviousDay,
    abandonPlan,
    getCurrentDayReading,
    getPlanProgress,
  } = useReadingPlansStore();

  const weekHistory = getWeekHistory();
  const currentReading = getCurrentDayReading();
  const planProgress = getPlanProgress();
  const activePlanData = activePlan ? READING_PLANS.find(p => p.id === activePlan.planId) : null;

  // Day navigation state
  const canGoBack = activePlan && activePlan.currentDay > 1;
  const canGoForward = activePlan && activePlanData && activePlan.currentDay < activePlanData.totalDays;

  // Generate last 7 days for streak visualization
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });

  const dayNames = ['日', '一', '二', '三', '四', '五', '六'];

  const handleStartReading = useCallback(() => {
    if (!currentReading) return;
    const firstPassage = currentReading.passages[0];
    if (firstPassage) {
      onNavigate(firstPassage.bookId, firstPassage.startChapter);
      onClose();
    }
  }, [currentReading, onNavigate, onClose]);

  const formatPassage = (passage: PlanPassage): string => {
    const book = getBookById(passage.bookId);
    const bookName = book?.name.chinese || passage.bookId;
    if (passage.endChapter && passage.endChapter !== passage.startChapter) {
      return `${bookName} ${passage.startChapter}-${passage.endChapter}`;
    }
    return `${bookName} ${passage.startChapter}`;
  };

  return (
    <div className="px-4 md:px-6 py-6 md:py-8 space-y-6 md:space-y-8">
      {/* Streak Card - Compact elegant design */}
      <motion.div
        className="rounded-2xl p-5 md:p-7 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
        }}
        initial={{ opacity: 0, y: 12, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.05, duration: 0.4, ease: 'easeOut' }}
      >
        {/* Subtle decorative pattern */}
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: '16px 16px',
          }}
        />

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4 md:gap-6">
            <div className="flex items-end gap-1">
              <span className="text-white text-4xl md:text-5xl font-display font-bold leading-none">
                {streak.currentStreak}
              </span>
              <span className="text-white/70 text-sm md:text-base mb-1">天</span>
            </div>
            <div>
              <div className="flex items-center">
                <ChineseWithPinyin
                  chinese="連續閱讀"
                  pinyin="lián xù yuè dú"
                  className="text-white/90 text-xs md:text-sm font-medium"
                  pinyinClassName="text-[6px] md:text-[7px] text-white/60"
                />
              </div>
              <p className="text-white/60 text-[10px] md:text-xs">Reading Streak</p>
            </div>
          </div>

          {streak.longestStreak > 0 && (
            <div className="flex items-center gap-1 px-2.5 md:px-3 py-1 md:py-1.5 rounded-full bg-white/15 backdrop-blur-sm">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 md:w-4 md:h-4 text-white/70">
                <path d="M8 1.75a.75.75 0 01.692.462l1.41 3.393 3.664.293a.75.75 0 01.428 1.317l-2.791 2.39.853 3.574a.75.75 0 01-1.12.814L8 11.67l-3.136 1.823a.75.75 0 01-1.12-.814l.853-3.574-2.791-2.39a.75.75 0 01.428-1.317l3.664-.293 1.41-3.393A.75.75 0 018 1.75z" />
              </svg>
              <span className="text-white/80 text-[10px] md:text-xs font-medium">{streak.longestStreak}</span>
            </div>
          )}
        </div>

        {/* Week visualization - minimal */}
        <div className="relative mt-4 md:mt-6 flex justify-between gap-1 md:gap-2">
          {last7Days.map((date) => {
            const dayOfWeek = new Date(date).getDay();
            const hasReading = weekHistory.some(d => d.date === date);
            const isToday = date === new Date().toISOString().split('T')[0];

            return (
              <div key={date} className="flex-1 flex flex-col items-center gap-1 md:gap-1.5">
                <div
                  className={`w-7 h-7 md:w-9 md:h-9 rounded-md flex items-center justify-center transition-all ${
                    isToday ? 'ring-1 ring-white/40' : ''
                  }`}
                  style={{
                    backgroundColor: hasReading ? 'white' : 'rgba(255,255,255,0.12)',
                  }}
                >
                  {hasReading && (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="var(--accent)" className="w-3.5 h-3.5 md:w-4 md:h-4">
                      <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 01.208 1.04l-5 7.5a.75.75 0 01-1.154.114l-3-3a.75.75 0 011.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 011.04-.207z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <span className="text-white/50 text-[9px] md:text-[10px]">{dayNames[dayOfWeek]}</span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Active Plan */}
      {activePlan && activePlanData && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35, ease: 'easeOut' }}
        >
          <div className="flex items-center gap-2 mb-3 md:mb-4">
            <ChineseWithPinyin
              chinese="目前計劃"
              pinyin="mù qián jì huà"
              className="text-xs md:text-sm font-medium"
              pinyinClassName="text-[6px] md:text-[7px]"
            />
            <span className="text-[10px] md:text-xs uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
              Current Plan
            </span>
          </div>

          <div
            className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            {/* Plan header */}
            <div
              className="p-4 md:p-5 pb-3 md:pb-4"
              style={{
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm md:text-base font-medium" style={{ color: 'var(--text-primary)' }}>
                    <ChineseWithPinyin
                      chinese={activePlanData.name.chinese}
                      pinyin={activePlanData.name.pinyin}
                      className="text-sm md:text-base font-medium"
                      pinyinClassName="text-[6px] md:text-[7px]"
                    />
                  </h4>
                  <p className="text-xs md:text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    {activePlanData.name.english}
                  </p>
                </div>
                <button
                  className="text-xs md:text-sm px-2 md:px-3 py-1 md:py-1.5 rounded-md transition-colors"
                  style={{ color: 'var(--text-tertiary)' }}
                  onClick={abandonPlan}
                >
                  <ChineseWithPinyin
                    chinese="放棄"
                    pinyin="fàng qì"
                    className="text-xs md:text-sm"
                    pinyinClassName="text-[5px] md:text-[6px]"
                  />
                </button>
              </div>

              {/* Progress */}
              {planProgress && (
                <div className="mt-3 md:mt-4">
                  <div className="flex justify-between text-xs md:text-sm mb-1.5 md:mb-2" style={{ color: 'var(--text-tertiary)' }}>
                    <span>Day {currentReading?.day || planProgress.completed}</span>
                    <span>{planProgress.completed} / {planProgress.total}</span>
                  </div>
                  <div
                    className="h-1.5 md:h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: 'var(--bg-tertiary)' }}
                  >
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: 'var(--accent)' }}
                      initial={{ width: 0 }}
                      animate={{ width: `${planProgress.percent}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Day reading with navigation */}
            {currentReading && (
              <div className="p-4 md:p-5">
                {/* Day navigation header */}
                <div className="flex items-center justify-between mb-3 md:mb-4">
                  <div className="flex items-center gap-2">
                    {/* Previous day button */}
                    <button
                      className="p-1.5 rounded-lg transition-colors disabled:opacity-30"
                      style={{
                        backgroundColor: canGoBack ? 'var(--bg-tertiary)' : 'transparent',
                        color: 'var(--text-secondary)',
                      }}
                      onClick={goToPreviousDay}
                      disabled={!canGoBack}
                      aria-label="Previous day"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                      </svg>
                    </button>

                    {/* Day selector dropdown */}
                    <select
                      value={currentReading.day}
                      onChange={(e) => goToDay(parseInt(e.target.value, 10))}
                      className="appearance-none text-xs md:text-sm font-medium px-2 py-1 rounded-lg cursor-pointer"
                      style={{
                        backgroundColor: 'var(--bg-tertiary)',
                        color: 'var(--text-primary)',
                        border: 'none',
                        outline: 'none',
                      }}
                    >
                      {activePlanData && Array.from({ length: activePlanData.totalDays }, (_, i) => i + 1).map(day => (
                        <option key={day} value={day}>
                          Day {day}
                        </option>
                      ))}
                    </select>

                    {/* Next day button */}
                    <button
                      className="p-1.5 rounded-lg transition-colors disabled:opacity-30"
                      style={{
                        backgroundColor: canGoForward ? 'var(--bg-tertiary)' : 'transparent',
                        color: 'var(--text-secondary)',
                      }}
                      onClick={goToNextDay}
                      disabled={!canGoForward}
                      aria-label="Next day"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>

                  {currentReading.isComplete && (
                    <div className="flex items-center gap-1 text-[10px] md:text-xs px-2 md:px-2.5 py-0.5 md:py-1 rounded-full font-medium"
                      style={{
                        backgroundColor: 'var(--accent-subtle)',
                        color: 'var(--accent)',
                      }}
                    >
                      <ChineseWithPinyin
                        chinese="已完成"
                        pinyin="yǐ wán chéng"
                        className="text-[10px] md:text-xs"
                        pinyinClassName="text-[5px] md:text-[6px] opacity-75"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 md:space-y-2 mb-4 md:mb-5">
                  {currentReading.passages.map((passage, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-sm md:text-base"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <span
                        className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: 'var(--accent)' }}
                      />
                      {formatPassage(passage)}
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-2 md:gap-3">
                  {/* Main action buttons */}
                  <div className="flex gap-2 md:gap-3">
                    <button
                      className="flex-1 py-2.5 md:py-3 rounded-xl text-sm md:text-base font-medium transition-colors"
                      style={{
                        backgroundColor: 'var(--accent)',
                        color: 'white',
                      }}
                      onClick={handleStartReading}
                    >
                      <ChineseWithPinyin
                        chinese={currentReading.isComplete ? "再讀一次" : "開始閱讀"}
                        pinyin={currentReading.isComplete ? "zài dú yī cì" : "kāi shǐ yuè dú"}
                        className="text-sm md:text-base font-medium text-white"
                        pinyinClassName="text-[6px] md:text-[7px] text-white/75"
                      />
                    </button>
                    {!currentReading.isComplete && (
                      <button
                        className="px-4 md:px-5 py-2.5 md:py-3 rounded-xl text-sm md:text-base font-medium transition-colors"
                        style={{
                          backgroundColor: 'var(--bg-tertiary)',
                          color: 'var(--text-secondary)',
                        }}
                        onClick={() => markDayComplete(currentReading.day)}
                      >
                        <ChineseWithPinyin
                          chinese="標記完成"
                          pinyin="biāo jì wán chéng"
                          className="text-sm md:text-base font-medium"
                          pinyinClassName="text-[6px] md:text-[7px]"
                        />
                      </button>
                    )}
                  </div>

                  {/* Continue to next day button - shown when current day is complete */}
                  {currentReading.isComplete && canGoForward && (
                    <button
                      className="w-full py-2.5 md:py-3 rounded-xl text-sm md:text-base font-medium transition-colors flex items-center justify-center gap-2"
                      style={{
                        backgroundColor: 'var(--bg-tertiary)',
                        color: 'var(--accent)',
                        border: '1px solid var(--accent)',
                      }}
                      onClick={goToNextDay}
                    >
                      <ChineseWithPinyin
                        chinese="繼續下一天"
                        pinyin="jì xù xià yī tiān"
                        className="text-sm md:text-base font-medium"
                        pinyinClassName="text-[6px] md:text-[7px]"
                      />
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 md:w-5 md:h-5">
                        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Available Plans */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: activePlan ? 0.15 : 0.1, duration: 0.35, ease: 'easeOut' }}
      >
        <div className="flex items-center gap-2 mb-3 md:mb-4">
          <ChineseWithPinyin
            chinese={activePlan ? "其他計劃" : "選擇計劃"}
            pinyin={activePlan ? "qí tā jì huà" : "xuǎn zé jì huà"}
            className="text-xs md:text-sm font-medium"
            pinyinClassName="text-[6px] md:text-[7px]"
          />
          <span className="text-[10px] md:text-xs uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
            {activePlan ? 'Other Plans' : 'Choose a Plan'}
          </span>
        </div>

        <div className="space-y-3 md:space-y-4">
          {READING_PLANS.filter(p => !activePlan || p.id !== activePlan.planId).map((plan, index) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onStart={() => startPlan(plan.id)}
              disabled={!!activePlan}
              index={index}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
});

// ============================================
// PLAN CARD
// ============================================

const PlanCard = memo(function PlanCard({
  plan,
  onStart,
  disabled,
  index,
}: {
  plan: ReadingPlan;
  onStart: () => void;
  disabled: boolean;
  index: number;
}) {
  const [isHovered, setIsHovered] = useState(false);

  const categoryConfig = {
    beginner: { color: '#22C55E', label: '初學', pinyin: 'chū xué', bg: 'rgba(34, 197, 94, 0.1)' },
    standard: { color: '#3B82F6', label: '標準', pinyin: 'biāo zhǔn', bg: 'rgba(59, 130, 246, 0.1)' },
    intensive: { color: '#F59E0B', label: '密集', pinyin: 'mì jí', bg: 'rgba(245, 158, 11, 0.1)' },
  };

  const config = categoryConfig[plan.category];

  return (
    <motion.div
      className="rounded-xl p-4 md:p-5 cursor-pointer transition-colors"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: index * 0.06,
        duration: 0.35,
        ease: 'easeOut'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={disabled ? undefined : onStart}
    >
      <div className="flex items-start justify-between mb-2 md:mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm md:text-base font-medium" style={{ color: 'var(--text-primary)' }}>
              <ChineseWithPinyin
                chinese={plan.name.chinese}
                pinyin={plan.name.pinyin}
                className="text-sm md:text-base font-medium"
                pinyinClassName="text-[6px] md:text-[7px]"
              />
            </h4>
            <span
              className="text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 md:py-1 rounded"
              style={{
                backgroundColor: config.bg,
                color: config.color,
              }}
            >
              <ChineseWithPinyin
                chinese={config.label}
                pinyin={config.pinyin}
                className="text-[10px] md:text-xs"
                pinyinClassName="text-[5px] md:text-[6px] opacity-75"
              />
            </span>
          </div>
          <p className="text-xs md:text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {plan.name.english}
          </p>
        </div>
        <span
          className="text-xs md:text-sm tabular-nums"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {plan.totalDays}天
        </span>
      </div>

      <p className="text-xs md:text-sm mb-3 md:mb-4" style={{ color: 'var(--text-secondary)' }}>
        {plan.description}
      </p>

      <motion.button
        className="w-full py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-medium transition-colors"
        style={{
          backgroundColor: disabled
            ? 'var(--bg-tertiary)'
            : isHovered
            ? 'var(--accent)'
            : 'var(--accent-subtle)',
          color: disabled
            ? 'var(--text-tertiary)'
            : isHovered
            ? 'white'
            : 'var(--accent)',
        }}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) onStart();
        }}
      >
        <ChineseWithPinyin
          chinese={disabled ? "需先完成目前計劃" : "開始計劃"}
          pinyin={disabled ? "xū xiān wán chéng mù qián jì huà" : "kāi shǐ jì huà"}
          className="text-xs md:text-sm font-medium"
          pinyinClassName={`text-[5px] md:text-[6px] ${isHovered && !disabled ? 'text-white/75' : ''}`}
        />
      </motion.button>
    </motion.div>
  );
});
