import React, { useState } from 'react';
import { useBudget, formatRubles } from '../context/BudgetContext';
import { 
  Plus, 
  ShoppingCart, 
  Coffee, 
  Car, 
  CheckCircle2, 
  AlertCircle, 
  Trash2,
  Pencil,
  SlidersHorizontal,
  Wallet,
  ShieldCheck,
  CalendarDays,
  Landmark,
  Sparkles,
  Calendar
} from 'lucide-react';
import { motion } from 'motion/react';
import { EditBudgetModal } from './EditBudgetModal';
import { BalanceAuditCard } from './BalanceAuditCard';
import { BankSyncModal } from './BankSyncModal';
import { MonthCalendarNavigator } from './MonthCalendarNavigator';

interface BudgetScreenProps {
  onOpenAddExpense: () => void;
}

export const BudgetScreen: React.FC<BudgetScreenProps> = ({ onOpenAddExpense }) => {
  const { 
    state, 
    selectedDate, 
    setSelectedDate, 
    todayAllowedSpend, 
    baseDailyNorm, 
    daysToSalary, 
    freeDiscretionaryBudget,
    totalPlannedSum,
    salarySchedule,
    periodEndingRemainderInfo,
    deleteExpenseFromDate 
  } = useBudget();

  const [isEditBudgetOpen, setIsEditBudgetOpen] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);

  const selectedDayRecord = (state.days || []).find(d => d.date === selectedDate) || (state.days || [])[0];

  const getCategoryIcon = (categoryType?: string) => {
    switch (categoryType) {
      case 'еда_вне_дома':
        return <Coffee className="w-4 h-4 text-[var(--color-text-main)]" />;
      case 'продукты':
        return <ShoppingCart className="w-4 h-4 text-[var(--color-text-main)]" />;
      case 'авто':
      case 'транспорт':
        return <Car className="w-4 h-4 text-[var(--color-text-main)]" />;
      default:
        return <ShoppingCart className="w-4 h-4 text-[var(--color-text-main)]" />;
    }
  };

  const deviation = selectedDayRecord ? selectedDayRecord.normLimit - selectedDayRecord.spent : 0;
  const isEconomy = deviation >= 0;

  const formatShortDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    const day = parts[2] || '01';
    const monthNames = ['', 'января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    const mIdx = parseInt(parts[1], 10) || 8;
    return `${parseInt(day, 10)} ${monthNames[mIdx] || 'августа'}`;
  };

  return (
    <div className="flex flex-col gap-4 pb-28 pt-2">
      {/* 1. Main Summary Card with Edit Trigger & Period Control */}
      <motion.div 
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[var(--color-bg-card)] rounded-2xl p-5 shadow-xs border border-[var(--color-border)] relative overflow-hidden"
      >
        <div className="flex justify-between items-start mb-1.5 flex-wrap gap-2">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
              ОБЩИЙ БЮДЖЕТ НА ПЕРИОД
            </span>
            <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
              {state.periodTitle || '05.08.2026 — 03.09.2026'}
            </span>
          </div>

          <button
            onClick={() => setIsEditBudgetOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[var(--color-bg-card-subtle)] hover:bg-[var(--color-bg-card-muted)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] border border-[var(--color-border)] transition-all text-xs font-semibold shadow-xs active:scale-95"
            title="Редактировать параметры бюджета"
          >
            <Pencil className="w-3.5 h-3.5 text-[var(--color-accent)]" />
            <span>Изменить</span>
          </button>
        </div>

        <div className="text-3xl sm:text-4xl font-extrabold text-[var(--color-text-main)] tracking-tight mb-3">
          {formatRubles(state.total30DaysBudget, { showCents: false })}
        </div>

        {/* Budget details breakdown */}
        <div className="grid grid-cols-3 gap-2 py-2.5 px-3 mb-3 rounded-xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)] text-xs">
          <div>
            <span className="text-[10px] text-[var(--color-text-muted)] block font-medium">Зарплата</span>
            <span className="font-bold text-[var(--color-text-main)] truncate block">
              {formatRubles(state.currentSalary, { showCents: false })}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-[var(--color-text-muted)] block font-medium">Подушка (10%)</span>
            <span className="font-bold text-[var(--color-text-main)] truncate block">
              {formatRubles(state.safetyCushionDeposit, { showCents: false })}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-[var(--color-text-muted)] block font-medium">Остаток прошл.</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 truncate block">
              {formatRubles(state.previousMonthRemainder, { showCents: false })}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-[var(--color-border)]">
          <div>
            <span className="text-xs text-[var(--color-text-muted)] block font-medium">Чистый остаток на прочее</span>
            <span className="text-lg font-bold text-[var(--color-accent)]">
              {formatRubles(freeDiscretionaryBudget, { showCents: false })}
            </span>
          </div>
          <div>
            <span className="text-xs text-[var(--color-text-muted)] block font-medium">Дней до зарплаты</span>
            <span className="text-lg font-bold text-[var(--color-text-main)]">
              {daysToSalary} дн.
            </span>
          </div>
        </div>
      </motion.div>

      {/* 2. Two Metric Cards Row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 shadow-xs border border-[var(--color-border)]">
          <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">
            ДОПУСТИМО СЕГОДНЯ
          </span>
          <div className="text-2xl font-extrabold text-[var(--color-text-main)]">
            {formatRubles(todayAllowedSpend, { showCents: false })}
          </div>
        </div>

        <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 shadow-xs border border-[var(--color-border)]">
          <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">
            ЛИМИТ ДНЯ (E1)
          </span>
          <div className="text-2xl font-extrabold text-[var(--color-accent)]">
            {formatRubles(baseDailyNorm, { showCents: false })}
          </div>
        </div>
      </div>

      {/* Balance Audit & Bank Reconciliation Card */}
      <BalanceAuditCard onOpenBankModal={() => setIsBankModalOpen(true)} />

      {/* 3. Calendar Navigator with Month & Year Dropdowns + Day Strip/Grid */}
      <MonthCalendarNavigator />

      {/* 4. Selected Day Expense Breakdown */}
      <motion.div 
        key={selectedDate}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[var(--color-bg-card)] rounded-2xl p-4 shadow-xs border border-[var(--color-border)] flex flex-col"
      >
        <div className="flex justify-between items-center pb-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[var(--color-accent-badge-bg)] text-[var(--color-accent)] flex items-center justify-center font-bold text-xs">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[var(--color-text-main)]">
                Расходы за {formatShortDate(selectedDate)}
              </h3>
              <span className="text-[11px] text-[var(--color-text-muted)]">
                {selectedDayRecord?.dayOfWeekFull || 'День месяца'}
              </span>
            </div>
          </div>

          <span className="text-xs font-bold bg-[var(--color-bg-card-muted)] text-[var(--color-text-main)] px-2.5 py-1 rounded-full border border-[var(--color-border-subtle)]">
            Итог: {formatRubles(selectedDayRecord?.spent || 0)}
          </span>
        </div>

        {/* List of items for this day */}
        <div className="divide-y divide-[var(--color-border-subtle)] my-2">
          {(!selectedDayRecord || selectedDayRecord.expenses.length === 0) ? (
            <div className="py-7 text-center text-xs text-[var(--color-text-muted)] flex flex-col items-center justify-center gap-1.5">
              <div className="w-10 h-10 rounded-full bg-[var(--color-bg-card-subtle)] flex items-center justify-center text-[var(--color-text-muted)]">
                <CheckCircle2 className="w-5 h-5 opacity-40" />
              </div>
              <span>В этот день трат не зафиксировано</span>
            </div>
          ) : (
            selectedDayRecord.expenses.map((exp) => (
              <div key={exp.id} className="py-3 flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-bg-card-subtle)] flex items-center justify-center text-[var(--color-text-main)] border border-[var(--color-border-subtle)]">
                    {getCategoryIcon(exp.categoryType)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[var(--color-text-main)]">{exp.title}</div>
                    <div className="text-xs text-[var(--color-text-muted)]">
                      {exp.category} {exp.time ? `• ${exp.time}` : ''}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[var(--color-text-main)]">
                    -{formatRubles(exp.amount)}
                  </span>
                  <button
                    onClick={() => deleteExpenseFromDate(selectedDate, exp.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-all"
                    title="Удалить расход"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add expense button */}
        <button
          onClick={onOpenAddExpense}
          className="w-full py-3 mt-1 border border-dashed border-[var(--color-border-strong)] hover:border-[var(--color-accent)] text-[var(--color-text-main)] rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>ДОБАВИТЬ РАСХОД</span>
        </button>
      </motion.div>

      {/* 5. Deviation Status Banner */}
      <div className={`rounded-2xl p-3.5 flex items-center gap-3 border ${
        isEconomy 
          ? 'bg-[var(--color-accent-badge-bg)] border-[var(--color-accent-badge-border)] text-[var(--color-text-main)]' 
          : 'bg-[var(--color-danger-bg)] border-[var(--color-danger)]/30 text-[var(--color-text-main)]'
      }`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isEconomy ? 'bg-[var(--color-accent)] text-white dark:text-[#041627]' : 'bg-[var(--color-danger)] text-white'
        }`}>
          {isEconomy ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
        </div>
        <div className="text-xs font-medium">
          <span className="font-bold">
            Отклонение от нормы: {formatRubles(deviation, { sign: true })}
          </span>
          <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">
            {isEconomy ? 'Отличный результат! День прошел с экономией.' : 'Внимание: превышение дневного лимита.'}
          </p>
        </div>
      </div>

      {/* Floating Action Button (+) */}
      <button
        onClick={onOpenAddExpense}
        className="fixed right-5 bottom-20 w-14 h-14 rounded-full bg-[#041627] dark:bg-[#10b981] text-white dark:text-[#041627] shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-40"
        title="Быстро добавить расход"
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>

      {/* Edit Budget Modal */}
      <EditBudgetModal
        isOpen={isEditBudgetOpen}
        onClose={() => setIsEditBudgetOpen(false)}
      />

      {/* Bank Sync Modal */}
      <BankSyncModal
        isOpen={isBankModalOpen}
        onClose={() => setIsBankModalOpen(false)}
      />
    </div>
  );
};
