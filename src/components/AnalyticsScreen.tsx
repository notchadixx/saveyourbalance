import React, { useState } from 'react';
import { useBudget, formatRubles } from '../context/BudgetContext';
import { 
  TrendingUp, 
  TrendingDown, 
  ChevronDown, 
  Calendar
} from 'lucide-react';
import { motion } from 'motion/react';

export const AnalyticsScreen: React.FC = () => {
  const { 
    state, 
    cleanRemainderToday, 
    avgSpendPerDay, 
    medianSpendPerDay, 
    baseDailyNorm,
    setSelectedDate,
    setActiveTab
  } = useBudget();

  const [filterMode, setFilterMode] = useState<'all' | 'economy' | 'overspend'>('all');
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  // Active days with spending recorded (17.08 to 22.08 or full range)
  const chartDays = state.days.filter((_, idx) => idx >= 12 && idx <= 21); // 17.08 - 26.08

  // Deviation list items sorted from recent to oldest
  const deviationDays = state.days
    .filter(d => d.spent > 0)
    .sort((a, b) => b.date.localeCompare(a.date));

  const filteredDeviations = deviationDays.filter(d => {
    if (filterMode === 'economy') return d.spent <= d.normLimit;
    if (filterMode === 'overspend') return d.spent > d.normLimit;
    return true;
  });

  // Calculate chart max height scale
  const maxSpend = Math.max(...chartDays.map(d => d.spent), baseDailyNorm * 1.5, 1800);
  const chartHeight = 160;

  return (
    <div className="flex flex-col gap-4 pb-28 pt-2">
      {/* 1. Period Selector Dropdown */}
      <div className="relative">
        <button className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm font-semibold text-[var(--color-text-main)] flex items-center justify-between shadow-xs hover:border-[var(--color-accent)] transition-all">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[var(--color-text-muted)]" />
            <span>05.08.2026 — 03.09.2026</span>
          </div>
          <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)]" />
        </button>
      </div>

      {/* 2. Main Dark Navy Metric Card */}
      <motion.div 
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#1a2b3c] dark:bg-[#1e293b] rounded-2xl p-5 text-white shadow-md relative overflow-hidden border border-transparent dark:border-[var(--color-border)]"
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-white/10 to-transparent rounded-bl-full pointer-events-none" />

        <span className="text-xs font-semibold text-[#8192a7] dark:text-[#94a3b8] block mb-1">
          Чистый остаток
        </span>
        
        <div className="text-3xl font-extrabold tracking-tight mb-2">
          {formatRubles(cleanRemainderToday, { showCents: true })}
        </div>

        <div className="inline-flex items-center gap-1 text-xs font-bold text-[#6bfe9c] dark:text-[#34d399]">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>+12% к прошлому месяцу</span>
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

      {/* 4. Interactive Bar Chart Card */}
      <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 shadow-xs border border-[var(--color-border)] flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-base font-bold text-[var(--color-text-main)]">
              Расходы по дням
            </h3>
            <p className="text-xs text-[var(--color-text-muted)] font-medium mt-0.5">
              Норма: {formatRubles(baseDailyNorm, { showCents: true })}
            </p>
          </div>
          <span className="text-xs font-bold text-[var(--color-danger)] bg-[var(--color-danger-bg)] px-2 py-0.5 rounded-md border border-[var(--color-danger)]/20">
            -5% от лимита
          </span>
        </div>

        {/* Chart Visualization */}
        <div className="relative pt-6 pb-2">
          {/* Daily limit dashed guide line */}
          <div 
            className="absolute left-0 right-0 border-b border-dashed border-[var(--color-text-muted)] opacity-60 z-10 flex items-center justify-end"
            style={{
              bottom: `${(baseDailyNorm / maxSpend) * chartHeight + 28}px`,
            }}
          >
            <span className="text-[10px] font-bold text-[var(--color-text-secondary)] bg-[var(--color-bg-card)] px-1 -translate-y-2.5 rounded">
              {formatRubles(baseDailyNorm, { showCents: false })}
            </span>
          </div>

          {/* Bar Columns */}
          <div className="h-44 flex items-end justify-between gap-2 px-1">
            {chartDays.map((day) => {
              const isOver = day.spent > day.normLimit;
              const barHeight = Math.max(12, (day.spent / maxSpend) * chartHeight);
              const dayLabel = `${day.dayNumber < 10 ? '0' : ''}${day.dayNumber}.08`;
              const isHovered = hoveredDay === day.date;

              return (
                <div 
                  key={day.date}
                  className="flex-1 flex flex-col items-center group relative cursor-pointer"
                  onMouseEnter={() => setHoveredDay(day.date)}
                  onMouseLeave={() => setHoveredDay(null)}
                  onClick={() => {
                    setSelectedDate(day.date);
                    setActiveTab('budget');
                  }}
                >
                  {/* Tooltip on hover */}
                  {isHovered && (
                    <div className="absolute -top-10 bg-[#041627] dark:bg-[#1e293b] text-white text-[10px] font-bold py-1 px-2 rounded-lg shadow-lg whitespace-nowrap z-30 pointer-events-none border border-white/10">
                      {formatRubles(day.spent)}
                      <div className="text-[9px] font-normal opacity-80">
                        {isOver ? 'Превышение' : 'В лимите'}
                      </div>
                    </div>
                  )}

                  {/* Bar */}
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${barHeight}px` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className={`w-full max-w-[28px] rounded-t-md transition-all ${
                      isOver 
                        ? 'bg-[var(--color-danger)] hover:opacity-85' 
                        : 'bg-[var(--color-accent)] hover:opacity-85'
                    } ${isHovered ? 'ring-2 ring-[var(--color-text-main)]' : ''}`}
                  />

                  {/* Date label */}
                  <span className="text-[10px] text-[var(--color-text-muted)] mt-2 font-medium tracking-tighter">
                    {dayLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. Deviations from Norm List */}
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
          {filteredDeviations.slice(0, 6).map((day) => {
            const dev = day.normLimit - day.spent;
            const isEconomy = dev >= 0;

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
                    <div className="text-sm font-bold text-[var(--color-text-main)]">
                      {day.dayNumber} августа, {day.dayOfWeekShort}
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
      </div>
    </div>
  );
};
