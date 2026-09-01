import React, { useState, useRef, useEffect } from 'react';
import { useBudget, formatRubles } from '../context/BudgetContext';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  CalendarDays, 
  LayoutGrid, 
  ListOrdered,
  Clock,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const MONTH_OPTIONS = [
  { value: 1, name: 'Январь' },
  { value: 2, name: 'Февраль' },
  { value: 3, name: 'Март' },
  { value: 4, name: 'Апрель' },
  { value: 5, name: 'Май' },
  { value: 6, name: 'Июнь' },
  { value: 7, name: 'Июль' },
  { value: 8, name: 'Август' },
  { value: 9, name: 'Сентябрь' },
  { value: 10, name: 'Октябрь' },
  { value: 11, name: 'Ноябрь' },
  { value: 12, name: 'Декабрь' },
];

const YEAR_OPTIONS = [2025, 2026, 2027, 2028];
const WEEK_DAYS_HEADER = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

interface MonthCalendarNavigatorProps {}

export const MonthCalendarNavigator: React.FC<MonthCalendarNavigatorProps> = () => {
  const { state, selectedDate, setSelectedDate, ensureDaysForMonth, salarySchedule, baseDailyNorm } = useBudget();

  // Parse current selected date into year, month, day
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    try {
      return parseInt(selectedDate.split('-')[0], 10) || 2026;
    } catch {
      return 2026;
    }
  });

  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    try {
      return parseInt(selectedDate.split('-')[1], 10) || 8;
    } catch {
      return 8;
    }
  });

  const [viewMode, setViewMode] = useState<'strip' | 'grid'>('strip');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Sync year/month when selectedDate changes from external sources
  useEffect(() => {
    if (selectedDate) {
      const parts = selectedDate.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(y) && y !== selectedYear) setSelectedYear(y);
      if (!isNaN(m) && m !== selectedMonth) setSelectedMonth(m);
    }
  }, [selectedDate]);

  // Ensure days exist whenever year or month changes
  useEffect(() => {
    ensureDaysForMonth(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth, ensureDaysForMonth]);

  // Auto-scroll selected day card into view in horizontal strip
  useEffect(() => {
    if (viewMode === 'strip' && scrollContainerRef.current) {
      const activeEl = scrollContainerRef.current.querySelector('[data-selected="true"]') as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [selectedDate, viewMode]);

  // Handle month change
  const handleMonthChange = (newMonth: number) => {
    setSelectedMonth(newMonth);
    ensureDaysForMonth(selectedYear, newMonth);
    const formattedMonth = newMonth.toString().padStart(2, '0');
    // Try to keep current day number or clamp to max days in new month
    const currentDay = parseInt(selectedDate.split('-')[2], 10) || 1;
    const maxDays = new Date(selectedYear, newMonth, 0).getDate();
    const targetDay = Math.min(currentDay, maxDays).toString().padStart(2, '0');
    setSelectedDate(`${selectedYear}-${formattedMonth}-${targetDay}`);
  };

  // Handle year change
  const handleYearChange = (newYear: number) => {
    setSelectedYear(newYear);
    ensureDaysForMonth(newYear, selectedMonth);
    const formattedMonth = selectedMonth.toString().padStart(2, '0');
    const currentDay = parseInt(selectedDate.split('-')[2], 10) || 1;
    const maxDays = new Date(newYear, selectedMonth, 0).getDate();
    const targetDay = Math.min(currentDay, maxDays).toString().padStart(2, '0');
    setSelectedDate(`${newYear}-${formattedMonth}-${targetDay}`);
  };

  // Scroll controls for strip
  const handleScrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -220, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 220, behavior: 'smooth' });
    }
  };

  // Quick jump to today
  const handleJumpToToday = () => {
    const today = state.todayDate || '2026-08-26';
    const parts = today.split('-');
    setSelectedYear(parseInt(parts[0], 10));
    setSelectedMonth(parseInt(parts[1], 10));
    ensureDaysForMonth(parseInt(parts[0], 10), parseInt(parts[1], 10));
    setSelectedDate(today);
  };

  // Jump to day range in month (1-10, 11-20, 21-31)
  const handleJumpToRange = (startDay: number) => {
    const formattedMonth = selectedMonth.toString().padStart(2, '0');
    const formattedDay = startDay.toString().padStart(2, '0');
    setSelectedDate(`${selectedYear}-${formattedMonth}-${formattedDay}`);
  };

  // Filter day records for the active selected year and month
  const currentMonthDays = (state.days || []).filter(d => {
    const [y, m] = d.date.split('-').map(Number);
    return y === selectedYear && m === selectedMonth;
  }).sort((a, b) => a.date.localeCompare(b.date));

  // Build grid cells for calendar grid view (accounting for Monday-start day offset)
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const firstDayOfWeek = new Date(selectedYear, selectedMonth - 1, 1).getDay(); // 0 = Sun, 1 = Mon ...
  // Convert to Mon=0 ... Sun=6
  const startOffset = (firstDayOfWeek + 6) % 7;

  return (
    <div className="flex flex-col gap-2.5">
      {/* 1. Header: Month & Year Dropdowns + View Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        {/* Month & Year Selectors */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => handleMonthChange(parseInt(e.target.value, 10))}
              className="appearance-none bg-[var(--color-bg-card)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] text-[var(--color-text-main)] font-bold text-sm sm:text-base py-1.5 pl-3 pr-8 rounded-xl shadow-xs cursor-pointer focus:outline-hidden transition-all"
            >
              {MONTH_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[var(--color-text-muted)]">
              <ChevronRight className="w-3.5 h-3.5 rotate-90" />
            </div>
          </div>

          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => handleYearChange(parseInt(e.target.value, 10))}
              className="appearance-none bg-[var(--color-bg-card)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] text-[var(--color-text-main)] font-bold text-sm sm:text-base py-1.5 pl-3 pr-8 rounded-xl shadow-xs cursor-pointer focus:outline-hidden transition-all"
            >
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[var(--color-text-muted)]">
              <ChevronRight className="w-3.5 h-3.5 rotate-90" />
            </div>
          </div>

          {/* Jump to Today Button */}
          <button
            type="button"
            onClick={handleJumpToToday}
            className="px-2.5 py-1.5 rounded-xl bg-[var(--color-bg-card-subtle)] hover:bg-[var(--color-bg-card-muted)] border border-[var(--color-border)] text-[var(--color-accent)] hover:text-[var(--color-text-main)] font-bold text-xs shadow-xs active:scale-95 transition-all flex items-center gap-1"
            title="Перейти к сегодняшнему дню"
          >
            <Clock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Сегодня</span>
          </button>
        </div>

        {/* View Mode Toggle & Navigation */}
        <div className="flex items-center gap-1.5 ml-auto">
          {/* Scroll left/right buttons for strip mode */}
          {viewMode === 'strip' && (
            <div className="flex items-center gap-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-0.5">
              <button
                type="button"
                onClick={handleScrollLeft}
                className="p-1 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-card-subtle)] active:scale-90 transition-all"
                title="Листать назад"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleScrollRight}
                className="p-1 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-card-subtle)] active:scale-90 transition-all"
                title="Листать вперед"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Grid vs Strip Toggle */}
          <div className="flex items-center bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('strip')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                viewMode === 'strip'
                  ? 'bg-[var(--color-accent-badge-bg)] text-[var(--color-accent)] font-bold shadow-xs'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
              }`}
              title="Горизонтальная лента дней"
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Лента</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                viewMode === 'grid'
                  ? 'bg-[var(--color-accent-badge-bg)] text-[var(--color-accent)] font-bold shadow-xs'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
              }`}
              title="Сетка календаря"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Сетка</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Fast decade range jump pill buttons */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-1 text-xs">
        <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mr-1">
          Дни:
        </span>
        <button
          type="button"
          onClick={() => handleJumpToRange(1)}
          className="px-2.5 py-1 rounded-lg bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-card-muted)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] font-semibold transition-colors active:scale-95"
        >
          1–10
        </button>
        <button
          type="button"
          onClick={() => handleJumpToRange(11)}
          className="px-2.5 py-1 rounded-lg bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-card-muted)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] font-semibold transition-colors active:scale-95"
        >
          11–20
        </button>
        <button
          type="button"
          onClick={() => handleJumpToRange(21)}
          className="px-2.5 py-1 rounded-lg bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-card-muted)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] font-semibold transition-colors active:scale-95"
        >
          21–{daysInMonth}
        </button>
      </div>

      {/* 3. Main Views: STRIP VIEW or GRID VIEW */}
      {viewMode === 'strip' ? (
        /* Strip View */
        <div
          ref={scrollContainerRef}
          className="flex gap-2 overflow-x-auto no-scrollbar py-1 px-1 scroll-smooth"
        >
          {currentMonthDays.map((day) => {
            const isSelected = day.date === selectedDate;
            const isToday = day.date === state.todayDate;
            const hasSpending = day.spent > 0;
            const isOverLimit = day.spent > baseDailyNorm;

            return (
              <button
                key={day.date}
                data-selected={isSelected}
                onClick={() => setSelectedDate(day.date)}
                className={`shrink-0 flex flex-col items-center justify-between w-14 h-19 py-1.5 rounded-2xl transition-all relative ${
                  isSelected
                    ? 'bg-[#041627] dark:bg-[#10b981] text-white dark:text-[#041627] shadow-md ring-2 ring-[var(--color-accent)] ring-offset-1'
                    : 'bg-[var(--color-bg-card)] text-[var(--color-text-main)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)]'
                }`}
              >
                <span className={`text-[10px] font-medium uppercase tracking-tight ${isSelected ? 'opacity-90' : 'text-[var(--color-text-muted)]'}`}>
                  {day.dayOfWeekShort}
                </span>

                <div className="flex flex-col items-center justify-center my-auto">
                  <span className="text-sm font-extrabold leading-none">
                    {day.dayNumber < 10 ? `0${day.dayNumber}` : day.dayNumber}
                  </span>
                  {isToday && (
                    <span className={`text-[8.5px] font-extrabold tracking-tight mt-0.5 ${
                      isSelected ? 'text-[#6bfe9c] dark:text-[#041627]' : 'text-[var(--color-accent)]'
                    }`}>
                      СЕГОДНЯ
                    </span>
                  )}
                </div>

                {/* Spent indicator or status dot */}
                <div className="h-2 flex items-center justify-center">
                  {hasSpending ? (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected
                          ? 'bg-white dark:bg-[#041627]'
                          : (isOverLimit ? 'bg-[var(--color-danger)]' : 'bg-[var(--color-accent)]')
                      }`}
                    />
                  ) : (
                    <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white/30' : 'bg-transparent'}`} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        /* Full Month Grid View */
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-3.5 shadow-xs">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
            {WEEK_DAYS_HEADER.map((w, idx) => (
              <span
                key={w}
                className={`text-[11px] font-bold py-1 ${
                  idx >= 5 ? 'text-rose-500/80 dark:text-rose-400' : 'text-[var(--color-text-muted)]'
                }`}
              >
                {w}
              </span>
            ))}
          </div>

          {/* Calendar Day Cells */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Blank offset cells */}
            {Array.from({ length: startOffset }).map((_, idx) => (
              <div key={`offset-${idx}`} className="h-12 rounded-xl bg-transparent" />
            ))}

            {/* Actual day cells */}
            {currentMonthDays.map((day) => {
              const isSelected = day.date === selectedDate;
              const isToday = day.date === state.todayDate;
              const hasSpending = day.spent > 0;

              return (
                <button
                  key={day.date}
                  onClick={() => setSelectedDate(day.date)}
                  className={`h-12 rounded-xl flex flex-col items-center justify-center p-1 relative transition-all ${
                    isSelected
                      ? 'bg-[#041627] dark:bg-[#10b981] text-white dark:text-[#041627] font-bold shadow-md'
                      : isToday
                      ? 'bg-[var(--color-accent-badge-bg)] text-[var(--color-accent)] border border-[var(--color-accent-badge-border)] font-bold'
                      : 'hover:bg-[var(--color-bg-card-subtle)] text-[var(--color-text-main)] border border-transparent'
                  }`}
                >
                  <span className="text-xs font-bold leading-none">
                    {day.dayNumber}
                  </span>

                  {hasSpending && (
                    <span className={`text-[9px] truncate max-w-full font-medium mt-0.5 ${
                      isSelected ? 'text-white/90 dark:text-[#041627]' : 'text-[var(--color-text-muted)]'
                    }`}>
                      {Math.round(day.spent)} ₽
                    </span>
                  )}

                  {isToday && !hasSpending && (
                    <span className={`text-[8px] font-bold mt-0.5 ${
                      isSelected ? 'text-[#6bfe9c] dark:text-[#041627]' : 'text-[var(--color-accent)]'
                    }`}>
                      сегодня
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
