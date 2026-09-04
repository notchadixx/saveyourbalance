import React, { useState, useRef } from 'react';
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
  X,
  Check,
  Clock,
  CalendarDays
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ExpenseCategory, ExpenseItem } from '../types';
import { EditBudgetModal } from './EditBudgetModal';
import { BalanceAuditCard } from './BalanceAuditCard';
import { BankSyncModal } from './BankSyncModal';
import { MonthCalendarNavigator } from './MonthCalendarNavigator';
import { BudgetIncomeSection } from './BudgetIncomeSection';

interface BudgetScreenProps {
  onOpenAddExpense?: () => void;
}

const CATEGORY_OPTIONS: Array<{ type: ExpenseCategory; label: string; emoji: string }> = [
  { type: 'продукты', label: 'Продукты', emoji: '🛒' },
  { type: 'еда_вне_дома', label: 'Кафе / Еда', emoji: '☕' },
  { type: 'авто', label: 'Авто / Бензин', emoji: '⛽' },
  { type: 'транспорт', label: 'Транспорт', emoji: '🚌' },
  { type: 'покупки', label: 'Покупки', emoji: '🛍️' },
  { type: 'развлечения', label: 'Развлечения', emoji: '🎬' },
  { type: 'здоровье', label: 'Здоровье / Аптека', emoji: '💊' },
  { type: 'дом', label: 'Дом / Быт', emoji: '🏡' },
  { type: 'прочее', label: 'Прочее', emoji: '📝' },
];

export const BudgetScreen: React.FC<BudgetScreenProps> = () => {
  const { 
    state, 
    selectedDate, 
    todayAllowedSpend, 
    baseDailyNorm, 
    daysToSalary, 
    freeDiscretionaryBudget,
    totalIncludedAdditionalIncomes,
    receiveSalary,
    addExpenseToDate,
    updateExpense,
    deleteExpenseFromDate 
  } = useBudget();

  const [isEditBudgetOpen, setIsEditBudgetOpen] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);

  // Inline Add Expense State
  const [isAddingInline, setIsAddingInline] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCategory, setNewCategory] = useState<ExpenseCategory>('продукты');
  const [newCatName, setNewCatName] = useState('Супермаркет');
  const [newTime, setNewTime] = useState('');

  // Inline Edit Expense State
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState<ExpenseCategory>('продукты');
  const [editCatName, setEditCatName] = useState('');
  const [editTime, setEditTime] = useState('');

  const dayExpensesContainerRef = useRef<HTMLDivElement>(null);

  const selectedDayRecord = (state.days || []).find(d => d.date === selectedDate) || (state.days || [])[0];
  const dayExpenses = selectedDayRecord?.expenses || [];

  // Sort expenses by time descending
  const sortedExpenses = React.useMemo(() => {
    return [...dayExpenses].sort((a, b) => (b.time || '').localeCompare(a.time || ''));
  }, [dayExpenses]);

  const getCategoryEmoji = (categoryType: string) => {
    const found = CATEGORY_OPTIONS.find(c => c.type === categoryType);
    return found ? found.emoji : '📝';
  };

  // Accurate daily comparison: actual spent vs base daily norm
  const spentForDay = selectedDayRecord?.spent || 0;
  const deviation = baseDailyNorm - spentForDay;
  const isEconomy = deviation >= 0;

  const formatShortDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    const day = parts[2] || '01';
    const monthNames = ['', 'января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    const mIdx = parseInt(parts[1], 10) || 8;
    return `${parseInt(day, 10)} ${monthNames[mIdx] || 'августа'}`;
  };

  const handleStartAddInline = () => {
    setEditingExpenseId(null);
    setNewTitle('');
    setNewAmount('');
    setNewCategory('продукты');
    setNewCatName('Супермаркет');
    const now = new Date();
    setNewTime(now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }));
    setIsAddingInline(true);

    // Scroll smoothly to the expense section
    if (dayExpensesContainerRef.current) {
      dayExpensesContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const handleSaveNewExpense = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const parsedAmount = parseFloat(newAmount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    addExpenseToDate(selectedDate, {
      title: newTitle.trim() || 'Расход',
      amount: parsedAmount,
      category: newCatName || 'Покупки',
      categoryType: newCategory,
      time: newTime || new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      isConfirmed: false,
    });

    setIsAddingInline(false);
    setNewTitle('');
    setNewAmount('');
  };

  const handleStartEdit = (item: ExpenseItem) => {
    setIsAddingInline(false);
    setEditingExpenseId(item.id);
    setEditTitle(item.title);
    setEditAmount(item.amount.toString());
    setEditCategory(item.categoryType);
    setEditCatName(item.category);
    setEditTime(item.time || '18:00');
  };

  const handleSaveEdit = (expenseId: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const parsedAmount = parseFloat(editAmount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    updateExpense(selectedDate, expenseId, {
      title: editTitle.trim() || 'Расход',
      amount: parsedAmount,
      category: editCatName || 'Покупки',
      categoryType: editCategory,
      time: editTime,
    });

    setEditingExpenseId(null);
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
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[var(--color-bg-card-subtle)] hover:bg-[var(--color-bg-card-muted)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] border border-[var(--color-border)] transition-all text-xs font-semibold shadow-xs active:scale-95 cursor-pointer"
            title="Редактировать параметры бюджета"
          >
            <Pencil className="w-3.5 h-3.5 text-[var(--color-accent)]" />
            <span>Изменить</span>
          </button>
        </div>

        <div className="text-3xl sm:text-4xl font-extrabold text-[var(--color-text-main)] tracking-tight mb-3">
          {formatRubles(state.total30DaysBudget, { showCents: false })}
        </div>

        {/* Informative banner when waiting for salary arrival */}
        {!state.isSalaryReceived && (
          <div className="mb-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
              <div className="text-xs text-blue-900 dark:text-blue-200">
                <span className="font-bold">Ожидается поступление зарплаты.</span>
                <span className="block text-[11px] text-blue-700 dark:text-blue-300">
                  До зачисления бюджет равен чистому остатку прошлого месяца ({formatRubles(state.previousMonthRemainder)})
                </span>
              </div>
            </div>
            <button
              onClick={() => receiveSalary()}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer whitespace-nowrap"
            >
              Учесть зарплату ({formatRubles(state.currentSalary)})
            </button>
          </div>
        )}

        {/* Budget details breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-2.5 px-3 mb-3 rounded-xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)] text-xs">
          <div>
            <span className="text-[10px] text-[var(--color-text-muted)] block font-medium">Зарплата</span>
            <span className={`font-bold truncate block ${!state.isSalaryReceived ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--color-text-main)]'}`}>
              {!state.isSalaryReceived ? `Ожид. (${formatRubles(state.currentSalary, { showCents: false })})` : formatRubles(state.actualSalaryAmount || state.currentSalary, { showCents: false })}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-[var(--color-text-muted)] block font-medium">Подушка (10%)</span>
            <span className="font-bold text-[var(--color-text-main)] truncate block">
              {!state.isSalaryReceived ? '0 ₽ (при з/п)' : formatRubles(state.safetyCushionDeposit, { showCents: false })}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-[var(--color-text-muted)] block font-medium">Остаток прошл.</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 truncate block">
              {formatRubles(state.previousMonthRemainder, { showCents: false })}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-[var(--color-text-muted)] block font-medium">Доп. доходы</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 truncate block">
              +{formatRubles(totalIncludedAdditionalIncomes, { showCents: false })}
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

      {/* Income & Bank Inflow Analysis Section */}
      <BudgetIncomeSection />

      {/* 3. Calendar Navigator with Month & Year Dropdowns + Day Strip/Grid */}
      <MonthCalendarNavigator />

      {/* 4. Selected Day Expense Breakdown (Inline Add & In-Place Edit) */}
      <motion.div 
        ref={dayExpensesContainerRef}
        key={selectedDate}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[var(--color-bg-card)] rounded-2xl p-4 shadow-xs border border-[var(--color-border)] flex flex-col gap-3"
      >
        <div className="flex justify-between items-center pb-2.5 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--color-accent-badge-bg)] text-[var(--color-accent)] flex items-center justify-center font-bold text-xs">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[var(--color-text-main)] leading-tight">
                Расходы за {formatShortDate(selectedDate)}
              </h3>
              <span className="text-[11px] text-[var(--color-text-muted)]">
                {selectedDayRecord?.dayOfWeekFull || 'День месяца'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold bg-[var(--color-bg-card-muted)] text-[var(--color-text-main)] px-2.5 py-1 rounded-full border border-[var(--color-border-subtle)]">
              Итог: {formatRubles(spentForDay)}
            </span>
            {!isAddingInline && (
              <button
                type="button"
                onClick={handleStartAddInline}
                className="p-1 text-[var(--color-accent)] hover:bg-[var(--color-accent-badge-bg)] rounded-lg transition-colors cursor-pointer"
                title="Добавить расход за этот день"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* INLINE ADD FORM */}
        <AnimatePresence>
          {isAddingInline && (
            <motion.form 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleSaveNewExpense}
              className="overflow-hidden bg-[var(--color-bg-card-subtle)] border border-[var(--color-accent)]/40 rounded-xl p-3.5 flex flex-col gap-3 shadow-xs"
            >
              <div className="flex justify-between items-center pb-1 border-b border-[var(--color-border)]">
                <span className="text-xs font-bold text-[var(--color-text-main)] flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                  Новый расход за {formatShortDate(selectedDate)}
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingInline(false)}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Title & Amount inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block mb-1">
                    Название расхода
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Например: Пятерочка, Кафе, Бензин..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    autoFocus
                    className="w-full h-8 px-2.5 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-lg text-xs font-semibold text-[var(--color-text-main)] focus:outline-hidden focus:border-[var(--color-accent)]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block mb-1">
                    Сумма, ₽
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="500"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="w-full h-8 px-2.5 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-lg text-xs font-bold text-[var(--color-text-main)] focus:outline-hidden focus:border-[var(--color-accent)]"
                  />
                </div>
              </div>

              {/* Category chips selector */}
              <div>
                <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block mb-1">
                  Категория
                </label>
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  {CATEGORY_OPTIONS.map(cat => (
                    <button
                      type="button"
                      key={cat.type}
                      onClick={() => {
                        setNewCategory(cat.type);
                        setNewCatName(cat.label);
                      }}
                      className={`shrink-0 px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                        newCategory === cat.type
                          ? 'bg-[var(--color-accent)] text-white shadow-xs'
                          : 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)]'
                      }`}
                    >
                      <span>{cat.emoji}</span>
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Time input & action buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-[var(--color-border-subtle)]">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                  <span className="text-[11px] font-medium text-[var(--color-text-muted)]">Время:</span>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="h-7 px-2 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-lg text-xs font-semibold text-[var(--color-text-main)]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingInline(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]/50 rounded-xl transition-colors cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#006d37] dark:bg-[#10b981] dark:text-[#041627] hover:bg-[#005228] text-white text-xs font-bold rounded-xl shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Добавить расход</span>
                  </button>
                </div>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Expenses List with inline edit mode */}
        {sortedExpenses.length === 0 && !isAddingInline ? (
          <div className="py-7 text-center text-xs text-[var(--color-text-muted)] flex flex-col items-center justify-center gap-1.5 bg-[var(--color-bg-card-subtle)] rounded-xl border border-dashed border-[var(--color-border)]">
            <div className="w-10 h-10 rounded-full bg-[var(--color-bg-card)] flex items-center justify-center text-[var(--color-text-muted)]">
              <CheckCircle2 className="w-5 h-5 opacity-40" />
            </div>
            <span>В этот день трат не зафиксировано</span>
            <button
              type="button"
              onClick={handleStartAddInline}
              className="mt-1 text-[var(--color-accent)] font-bold hover:underline cursor-pointer"
            >
              + Добавить первый расход
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border-subtle)]">
            {sortedExpenses.map((exp) => (
              <div key={exp.id} className="py-2.5">
                {editingExpenseId === exp.id ? (
                  /* INLINE EDIT FORM FOR THIS ITEM */
                  <form 
                    onSubmit={(e) => handleSaveEdit(exp.id, e)}
                    className="bg-[var(--color-bg-card-subtle)] border border-[var(--color-accent)]/50 rounded-xl p-3 flex flex-col gap-2.5 shadow-xs"
                  >
                    <div className="flex justify-between items-center pb-1 border-b border-[var(--color-border)]">
                      <span className="text-[11px] font-bold text-[var(--color-text-main)] flex items-center gap-1">
                        <Pencil className="w-3 h-3 text-[var(--color-accent)]" />
                        Редактирование статьи расхода
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingExpenseId(null)}
                        className="text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block mb-0.5">
                          Название
                        </label>
                        <input
                          type="text"
                          required
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full h-8 px-2.5 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-lg text-xs font-semibold text-[var(--color-text-main)]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block mb-0.5">
                          Сумма, ₽
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          className="w-full h-8 px-2.5 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-lg text-xs font-bold text-[var(--color-text-main)]"
                        />
                      </div>
                    </div>

                    {/* Category select chips */}
                    <div>
                      <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block mb-0.5">
                        Категория
                      </label>
                      <div className="flex gap-1 overflow-x-auto no-scrollbar py-0.5">
                        {CATEGORY_OPTIONS.map(cat => (
                          <button
                            type="button"
                            key={cat.type}
                            onClick={() => {
                              setEditCategory(cat.type);
                              setEditCatName(cat.label);
                            }}
                            className={`shrink-0 px-2 py-0.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer ${
                              editCategory === cat.type
                                ? 'bg-[var(--color-accent)] text-white'
                                : 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] border border-[var(--color-border)]'
                            }`}
                          >
                            <span>{cat.emoji}</span>
                            <span>{cat.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t border-[var(--color-border-subtle)]">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-[var(--color-text-muted)]">Время:</span>
                        <input
                          type="time"
                          value={editTime}
                          onChange={(e) => setEditTime(e.target.value)}
                          className="h-6 px-1.5 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded text-[11px] font-medium text-[var(--color-text-main)]"
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingExpenseId(null)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]/50 rounded-lg cursor-pointer"
                        >
                          Отмена
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-1 bg-[#006d37] dark:bg-[#10b981] dark:text-[#041627] hover:bg-[#005228] text-white text-[11px] font-bold rounded-lg flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                          <span>Сохранить</span>
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  /* NORMAL EXPENSE ROW */
                  <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)] flex items-center justify-center text-sm">
                        {getCategoryEmoji(exp.categoryType)}
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm font-semibold text-[var(--color-text-main)] flex items-center gap-1.5">
                          <span>{exp.title}</span>
                          {exp.isConfirmed && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                          )}
                        </div>
                        <div className="text-[10px] sm:text-xs text-[var(--color-text-muted)]">
                          {exp.category} {exp.time ? `• ${exp.time}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-xs sm:text-sm font-bold text-[var(--color-text-main)]">
                        -{formatRubles(exp.amount)}
                      </span>

                      {/* EDIT BUTTON */}
                      <button
                        type="button"
                        onClick={() => handleStartEdit(exp)}
                        className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-bg-card-subtle)] rounded-lg transition-all cursor-pointer"
                        title="Редактировать статью расхода"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      {/* DELETE BUTTON */}
                      <button
                        type="button"
                        onClick={() => deleteExpenseFromDate(selectedDate, exp.id)}
                        className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)] rounded-lg transition-all cursor-pointer"
                        title="Удалить расход"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add expense dashed trigger button */}
        {!isAddingInline && (
          <button
            type="button"
            onClick={handleStartAddInline}
            className="w-full py-2.5 mt-1 border border-dashed border-[var(--color-border-strong)] hover:border-[var(--color-accent)] text-[var(--color-text-main)] hover:text-[var(--color-accent)] rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>ДОБАВИТЬ РАСХОД</span>
          </button>
        )}
      </motion.div>

      {/* 5. Deviation Status Banner (Exact comparison: actual daily spend vs base daily norm) */}
      <div className={`rounded-2xl p-3.5 flex items-center gap-3 border ${
        isEconomy 
          ? 'bg-[var(--color-accent-badge-bg)] border-[var(--color-accent-badge-border)] text-[var(--color-text-main)]' 
          : 'bg-[var(--color-danger-bg)] border-[var(--color-danger)]/30 text-[var(--color-text-main)]'
      }`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          isEconomy ? 'bg-[var(--color-accent)] text-white dark:text-[#041627]' : 'bg-[var(--color-danger)] text-white'
        }`}>
          {isEconomy ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
        </div>
        <div className="text-xs font-medium">
          <span className="font-bold">
            {isEconomy 
              ? `Экономия: +${formatRubles(deviation)}` 
              : `Перерасход на ${formatRubles(Math.abs(deviation))}`}
          </span>
          <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">
            {isEconomy 
              ? `Отличный результат! Фактический расход (${formatRubles(spentForDay)}) меньше базовой дневной нормы (${formatRubles(baseDailyNorm, { showCents: true })}).`
              : `Внимание: фактический расход (${formatRubles(spentForDay)}) превысил базовую дневную норму (${formatRubles(baseDailyNorm, { showCents: true })}) на ${formatRubles(Math.abs(deviation))}.`}
          </p>
        </div>
      </div>

      {/* Floating Action Button (+) triggers inline add form */}
      <button
        type="button"
        onClick={handleStartAddInline}
        className="fixed right-5 bottom-20 w-14 h-14 rounded-full bg-[#041627] dark:bg-[#10b981] text-white dark:text-[#041627] shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-40 cursor-pointer"
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
