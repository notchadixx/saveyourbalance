import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useBudget, formatRubles } from '../context/BudgetContext';
import { PeriodDropdownSelector } from './PeriodDropdownSelector';
import { 
  TrendingUp, 
  TrendingDown, 
  ChevronDown, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Info
} from 'lucide-react';
import { motion } from 'motion/react';

export const AnalyticsScreen: React.FC = () => {
  const { 
    state, 
    cleanRemainderToday, 
    avgSpendPerDay, 
    medianSpendPerDay, 
    baseDailyNorm,
    activeViewingPeriod,
    setSelectedDate,
    setActiveTab
  } = useBudget();

  const [filterMode, setFilterMode] = useState<'all' | 'economy' | 'overspend'>('all');
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const [showAllDeviations, setShowAllDeviations] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filter days for the active viewing period template
  const periodDays = useMemo(() => {
    if (!activeViewingPeriod) return state.days;
    return state.days.filter(
      d => d.date >= activeViewingPeriod.startDateStr && d.date <= activeViewingPeriod.endDateStr
    );
  }, [state.days, activeViewingPeriod]);

  // All active days up to today or with spend
  const chartDays = useMemo(() => {
    if (periodDays.length === 0) return state.days.filter(d => d.spent > 0 || d.date <= state.todayDate);
    return periodDays;
  }, [periodDays, state.days, state.todayDate]);

  // Deviation list items sorted from recent to oldest
  const deviationDays = useMemo(() => {
    return chartDays
      .filter(d => d.spent > 0 || d.date <= state.todayDate)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [chartDays, state.todayDate]);

  const filteredDeviations = deviationDays.filter(d => {
    if (filterMode === 'economy') return d.spent <= baseDailyNorm;
    if (filterMode === 'overspend') return d.spent > baseDailyNorm;
    return true;
  });

  // Calculate chart max height scale
  const maxSpend = Math.max(...chartDays.map(d => d.spent), baseDailyNorm * 1.5, 1800);
  const chartHeight = 150;

  // Auto scroll to today / latest day on load
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [activeViewingPeriod]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -220 : 220;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const getMonthNameRu = (dateStr: string) => {
    const months = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];
    try {
      const parts = dateStr.split('-');
      const m = parseInt(parts[1], 10) - 1;
      return months[m] || 'августа';
    } catch {
      return 'августа';
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-28 pt-2">
      {/* 1. Period Selector Dropdown */}
      <PeriodDropdownSelector
        title="Расчетный период"
        showSalaryShiftNote={true}
      />

      {/* 2. Main Dark Navy Metric Card */}
      <motion.div 
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#1a2b3c] dark:bg-[#1e293b] rounded-2xl p-5 text-white shadow-md relative overflow-hidden border border-transparent dark:border-[var(--color-border)]"
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-white/10 to-transparent rounded-bl-full pointer-events-none" />

        <div className="flex justify-between items-start mb-1">
          <span className="text-xs font-semibold text-[#8192a7] dark:text-[#94a3b8]">
            {activeViewingPeriod?.isCurrent ? 'Чистый остаток (на сегодня)' : `Чистый остаток (${activeViewingPeriod?.monthName})`}
          </span>
          {activeViewingPeriod?.isSalaryShifted && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Выплата: {activeViewingPeriod.actualSalaryDay}-го
            </span>
          )}
        </div>
        
        <div className="text-3xl font-extrabold tracking-tight mb-2">
          {formatRubles(cleanRemainderToday, { showCents: true })}
        </div>

        <div className="flex items-center justify-between text-xs">
          <div className="inline-flex items-center gap-1 font-bold text-[#6bfe9c] dark:text-[#34d399]">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+12% к прошлому периоду</span>
          </div>
          <span className="text-[#8192a7] dark:text-[#94a3b8] text-[11px]">
            Период: {activeViewingPeriod?.totalDays} дн.
          </span>
        </div>
      </motion.div>

      {/* 3. Two Metric Cards: Daily Average & Median */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 shadow-xs border border-[var(--color-border)]">
          <span className="text-xs text-[var(--color-text-muted)] block font-medium mb-1">
            Средний / сутки
          </span>
          <div className="text-xl font-bold text-[var(--color-text-main)]">
            {formatRubles(avgSpendPerDay, { showCents: true })}
          </div>
        </div>

        <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 shadow-xs border border-[var(--color-border)]">
          <span className="text-xs text-[var(--color-text-muted)] block font-medium mb-1">
            Медианный
          </span>
          <div className="text-xl font-bold text-[var(--color-text-main)]">
            {formatRubles(medianSpendPerDay, { showCents: true })}
          </div>
        </div>
      </div>

      {/* 4. Interactive Bar Chart Card with Horizontal Scrolling & Above-Bar Labels */}
      <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 shadow-xs border border-[var(--color-border)] flex flex-col">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-base font-bold text-[var(--color-text-main)]">
              Расходы по дням
            </h3>
            <p className="text-xs text-[var(--color-text-muted)] font-medium mt-0.5">
              Норма: {formatRubles(baseDailyNorm, { showCents: true })}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => scroll('left')}
              className="p-1.5 rounded-lg bg-[var(--color-bg-card-muted)] hover:bg-[var(--color-border-subtle)] text-[var(--color-text-muted)] transition-colors"
              title="Прокрутить влево"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="p-1.5 rounded-lg bg-[var(--color-bg-card-muted)] hover:bg-[var(--color-border-subtle)] text-[var(--color-text-muted)] transition-colors"
              title="Прокрутить вправо"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Chart Visualization */}
        <div className="relative pt-4 pb-1">
          {/* Daily limit dashed guide line */}
          <div 
            className="absolute left-0 right-0 border-b border-dashed border-[var(--color-text-muted)] opacity-60 z-10 pointer-events-none flex items-center justify-end"
            style={{
              bottom: `${(baseDailyNorm / maxSpend) * chartHeight + 28}px`,
            }}
          >
            <span className="text-[9px] font-bold text-[var(--color-text-secondary)] bg-[var(--color-bg-card)] px-1 -translate-y-2.5 rounded">
              Лимит: {formatRubles(baseDailyNorm, { showCents: false })}
            </span>
          </div>

          {/* Bar Columns Container (Horizontal Scroll) */}
          <div 
            ref={scrollRef}
            className="h-52 flex items-end gap-2.5 overflow-x-auto no-scrollbar scroll-smooth px-1 py-1"
          >
            {chartDays.map((day) => {
              const isOver = day.spent > baseDailyNorm;
              const barHeight = Math.max(8, (day.spent / maxSpend) * chartHeight);
              const dayLabel = `${day.dayNumber < 10 ? '0' : ''}${day.dayNumber}.${day.date.split('-')[1]}`;
              const isHovered = hoveredDay === day.date;
              const isToday = day.date === state.todayDate || day.date === '2026-08-31';

              return (
                <div 
                  key={day.date}
                  className="flex-shrink-0 w-11 flex flex-col items-center group relative cursor-pointer select-none"
                  onMouseEnter={() => setHoveredDay(day.date)}
                  onMouseLeave={() => setHoveredDay(null)}
                  onClick={() => {
                    setSelectedDate(day.date);
                    setActiveTab('budget');
                  }}
                >
                  {/* Amount label directly above the candle for mobile & desktop */}
                  <span 
                    className={`text-[9px] font-bold mb-1 truncate px-0.5 tracking-tighter transition-colors ${
                      isOver 
                        ? 'text-[var(--color-danger)]' 
                        : day.spent > 0 
                          ? 'text-[var(--color-accent)]' 
                          : 'text-[var(--color-text-muted)] opacity-60'
                    }`}
                  >
                    {day.spent > 0 ? `${Math.round(day.spent)}` : '0'}
                  </span>

                  {/* Tooltip on hover */}
                  {isHovered && (
                    <div className="absolute -top-12 bg-[#041627] dark:bg-[#1e293b] text-white text-[10px] font-bold py-1 px-2 rounded-lg shadow-lg whitespace-nowrap z-30 pointer-events-none border border-white/10">
                      {formatRubles(day.spent)}
                      <div className="text-[9px] font-normal opacity-80">
                        {isOver ? 'Превышение' : 'В лимите'} • Нажмите для перехода
                      </div>
                    </div>
                  )}

                  {/* Bar Candle */}
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${barHeight}px` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className={`w-full max-w-[24px] rounded-t-md transition-all ${
                      isOver 
                        ? 'bg-[var(--color-danger)] hover:opacity-85' 
                        : day.spent > 0
                          ? 'bg-[var(--color-accent)] hover:opacity-85'
                          : 'bg-[var(--color-border)] hover:bg-[var(--color-text-muted)]'
                    } ${isHovered ? 'ring-2 ring-[var(--color-text-main)]' : ''} ${
                      isToday ? 'ring-2 ring-[var(--color-accent)] shadow-xs' : ''
                    }`}
                  />

                  {/* Date label & Today marker */}
                  <span className={`text-[10px] mt-1.5 font-semibold tracking-tighter ${
                    isToday ? 'text-[var(--color-accent)] font-bold' : 'text-[var(--color-text-muted)]'
                  }`}>
                    {dayLabel}
                  </span>
                  {isToday && (
                    <span className="text-[8px] leading-none font-bold text-[var(--color-accent)] mt-0.5">
                      сегодня
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. Deviations from Norm List (Actualized with 31.08) */}
      <div className="flex flex-col gap-2.5">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-base font-bold text-[var(--color-text-main)]">
            Отклонения от нормы
          </h3>
          <div className="flex items-center gap-1 bg-[var(--color-bg-card-muted)] p-0.5 rounded-lg text-xs border border-[var(--color-border-subtle)]">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2 py-0.5 rounded-md font-medium text-[11px] transition-colors ${
                filterMode === 'all' ? 'bg-[var(--color-bg-card)] text-[var(--color-text-main)] font-bold shadow-xs' : 'text-[var(--color-text-muted)]'
              }`}
            >
              Все
            </button>
            <button
              onClick={() => setFilterMode('economy')}
              className={`px-2 py-0.5 rounded-md font-medium text-[11px] transition-colors ${
                filterMode === 'economy' ? 'bg-[var(--color-bg-card)] text-[var(--color-accent)] font-bold shadow-xs' : 'text-[var(--color-text-muted)]'
              }`}
            >
              Экономия
            </button>
            <button
              onClick={() => setFilterMode('overspend')}
              className={`px-2 py-0.5 rounded-md font-medium text-[11px] transition-colors ${
                filterMode === 'overspend' ? 'bg-[var(--color-bg-card)] text-[var(--color-danger)] font-bold shadow-xs' : 'text-[var(--color-text-muted)]'
              }`}
            >
              Превышение
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {filteredDeviations.slice(0, showAllDeviations ? undefined : 8).map((day) => {
            const dev = baseDailyNorm - day.spent;
            const isEconomy = dev >= 0;
            const monthRu = getMonthNameRu(day.date);

            return (
              <motion.div
                key={day.date}
                whileHover={{ scale: 1.01 }}
                onClick={() => {
                  setSelectedDate(day.date);
                  setActiveTab('budget');
                }}
                className={`rounded-2xl p-3.5 flex items-center justify-between cursor-pointer border transition-all ${
                  isEconomy
                    ? 'bg-[var(--color-accent-badge-bg)] border-[var(--color-accent-badge-border)] text-[var(--color-text-main)]'
                    : 'bg-[var(--color-danger-bg)] border-[var(--color-danger)]/30 text-[var(--color-text-main)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    isEconomy ? 'bg-[var(--color-accent)] text-white dark:text-[#041627]' : 'bg-[var(--color-danger)] text-white'
                  }`}>
                    {isEconomy ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[var(--color-text-main)] flex items-center gap-1.5">
                      <span>{day.dayNumber} {monthRu}, {day.dayOfWeekShort}</span>
                      {day.date === '2026-08-31' && (
                        <span className="text-[10px] font-bold bg-[var(--color-accent)] text-white dark:text-[#041627] px-1.5 py-0.2 rounded">
                          Сегодня
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[var(--color-text-muted)]">
                      Потрачено: {formatRubles(day.spent)}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`text-sm font-extrabold ${isEconomy ? 'text-[var(--color-accent)]' : 'text-[var(--color-danger)]'}`}>
                    {formatRubles(dev, { sign: true, showCents: true })}
                  </div>
                  <div className="text-[10px] font-semibold text-[var(--color-text-muted)]">
                    {isEconomy ? 'Экономия' : 'Превышение'}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {filteredDeviations.length > 8 && (
          <button
            onClick={() => setShowAllDeviations(prev => !prev)}
            className="w-full py-2.5 text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl transition-all"
          >
            {showAllDeviations ? 'Свернуть список' : `Показать все (${filteredDeviations.length} дней)`}
          </button>
        )}
      </div>
    </div>
  );
};
