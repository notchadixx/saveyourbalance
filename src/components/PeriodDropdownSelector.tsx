import React, { useState, useRef, useEffect } from 'react';
import { useBudget } from '../context/BudgetContext';
import { PeriodTemplate } from '../utils/periodUtils';
import { 
  Calendar, 
  ChevronDown, 
  Check, 
  Sparkles, 
  Clock, 
  CalendarCheck2, 
  AlertCircle,
  HelpCircle,
  TrendingUp,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PeriodDropdownSelectorProps {
  variant?: 'compact' | 'full' | 'card';
  selectedPeriodId?: string;
  onSelectPeriod?: (period: PeriodTemplate) => void;
  showSalaryShiftNote?: boolean;
  className?: string;
  title?: string;
}

export const PeriodDropdownSelector: React.FC<PeriodDropdownSelectorProps> = ({
  variant = 'full',
  selectedPeriodId: propSelectedPeriodId,
  onSelectPeriod,
  showSalaryShiftNote = true,
  className = '',
  title
}) => {
  const { 
    rollingPeriods, 
    currentPeriodTemplate, 
    selectedPeriodId: contextSelectedPeriodId, 
    setSelectedPeriodId,
    setPeriodByTemplate 
  } = useBudget();

  const [isOpen, setIsOpen] = useState(false);
  const [filterTab, setFilterTab] = useState<'all' | 'future' | 'past'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activePeriodId = propSelectedPeriodId || contextSelectedPeriodId || currentPeriodTemplate?.id || '2026-08';
  
  const activeTemplate = rollingPeriods.find(p => p.id === activePeriodId) || currentPeriodTemplate || rollingPeriods[0];

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (period: PeriodTemplate) => {
    setSelectedPeriodId(period.id);
    if (onSelectPeriod) {
      onSelectPeriod(period);
    } else {
      setPeriodByTemplate(period.id);
    }
    setIsOpen(false);
  };

  const filteredPeriods = rollingPeriods.filter(p => {
    if (filterTab === 'future') return p.isFuture || p.isCurrent;
    if (filterTab === 'past') return p.isPast;
    return true;
  });

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {title && (
        <span className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">
          {title}
        </span>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-card-subtle)] border border-[var(--color-border)] hover:border-[var(--color-accent)] rounded-xl px-3.5 py-2.5 sm:py-3 text-sm font-semibold text-[var(--color-text-main)] flex items-center justify-between shadow-xs transition-all cursor-pointer group"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-bg-card-muted)] group-hover:bg-[var(--color-accent-badge-bg)] text-[var(--color-accent)] flex items-center justify-center shrink-0 transition-colors">
            <Calendar className="w-4 h-4" />
          </div>
          
          <div className="flex flex-col text-left min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[var(--color-text-main)] truncate text-xs sm:text-sm">
                {activeTemplate?.formattedLabel}
              </span>
              {activeTemplate?.isCurrent && (
                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                  Текущий
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-muted)] mt-0.5">
              <span>{activeTemplate?.monthName}</span>
              <span>•</span>
              <span>{activeTemplate?.totalDays} дней</span>
              {activeTemplate?.isSalaryShifted && (
                <>
                  <span>•</span>
                  <span className="text-amber-600 dark:text-amber-400 font-medium truncate">
                    Выплата {activeTemplate.actualSalaryDay}-го
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <ChevronDown className={`w-4 h-4 text-[var(--color-text-muted)] transition-transform duration-200 ${isOpen ? 'rotate-180 text-[var(--color-accent)]' : ''}`} />
        </div>
      </button>

      {/* Salary shift callout note below trigger if applicable and requested */}
      {showSalaryShiftNote && activeTemplate?.isSalaryShifted && !isOpen && (
        <div className="mt-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 text-[11px] text-amber-700 dark:text-amber-300">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{activeTemplate.salaryShiftReason}</span>
        </div>
      )}

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 left-0 right-0 mt-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl shadow-xl overflow-hidden backdrop-blur-md"
          >
            {/* Header with Quick Filter Tabs */}
            <div className="p-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-card-subtle)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-extrabold text-[var(--color-text-main)] uppercase tracking-wider flex items-center gap-1.5">
                  <CalendarCheck2 className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                  Шаблоны периодов (на год вперёд)
                </span>
                <span className="text-[10px] font-bold text-[var(--color-text-muted)] bg-[var(--color-bg-card-muted)] px-2 py-0.5 rounded-full">
                  Всего: {rollingPeriods.length}
                </span>
              </div>

              {/* Filter Tabs */}
              <div className="grid grid-cols-3 gap-1 bg-[var(--color-bg-card-muted)] p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFilterTab('all')}
                  className={`py-1 text-[11px] font-bold rounded-lg transition-all ${
                    filterTab === 'all'
                      ? 'bg-[var(--color-bg-card)] text-[var(--color-text-main)] shadow-xs'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                  }`}
                >
                  Все ({rollingPeriods.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('future')}
                  className={`py-1 text-[11px] font-bold rounded-lg transition-all ${
                    filterTab === 'future'
                      ? 'bg-[var(--color-bg-card)] text-[var(--color-text-main)] shadow-xs'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                  }`}
                >
                  Будущие ({rollingPeriods.filter(p => p.isFuture || p.isCurrent).length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('past')}
                  className={`py-1 text-[11px] font-bold rounded-lg transition-all ${
                    filterTab === 'past'
                      ? 'bg-[var(--color-bg-card)] text-[var(--color-text-main)] shadow-xs'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                  }`}
                >
                  Прошедшие ({rollingPeriods.filter(p => p.isPast).length})
                </button>
              </div>
            </div>

            {/* Periods List */}
            <div className="max-h-72 overflow-y-auto divide-y divide-[var(--color-border-subtle)] p-1.5">
              {filteredPeriods.map((period) => {
                const isSelected = period.id === activeTemplate?.id;

                return (
                  <button
                    key={period.id}
                    type="button"
                    onClick={() => handleSelect(period)}
                    className={`w-full p-2.5 rounded-xl text-left transition-all flex items-center justify-between gap-3 group cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--color-accent-badge-bg)] text-[var(--color-accent)] font-bold'
                        : 'hover:bg-[var(--color-bg-card-subtle)] text-[var(--color-text-main)]'
                    }`}
                  >
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs sm:text-sm font-bold ${isSelected ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-main)]'}`}>
                          {period.formattedLabel}
                        </span>

                        {period.isCurrent && (
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
                            Текущий
                          </span>
                        )}

                        {period.isSalaryShifted && (
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 shrink-0" title={period.salaryShiftReason}>
                            Перенос ({period.actualSalaryDay}-е)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-muted)] mt-0.5">
                        <span className="font-semibold">{period.monthName}</span>
                        <span>•</span>
                        <span>{period.totalDays} дн.</span>
                        <span>•</span>
                        <span>Аванс: {period.formattedAdvanceLabel}</span>
                      </div>

                      {period.isSalaryShifted && (
                        <span className="text-[10px] text-amber-600/90 dark:text-amber-400/90 mt-0.5 truncate block">
                          {period.salaryShiftReason}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center shrink-0">
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-[var(--color-accent)] text-white flex items-center justify-center shadow-xs">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : (
                        <ArrowRight className="w-4 h-4 text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer summary info */}
            <div className="p-2.5 bg-[var(--color-bg-card-subtle)] border-t border-[var(--color-border-subtle)] flex items-center justify-between text-[10px] text-[var(--color-text-muted)]">
              <span>График 5/2: Зарплата 5-го, Аванс 20-го</span>
              <span className="font-semibold text-[var(--color-text-main)]">
                Шаблоны обновляются автоматически
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
