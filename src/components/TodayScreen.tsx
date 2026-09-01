import React, { useState } from 'react';
import { useBudget, formatRubles } from '../context/BudgetContext';
import { 
  Zap, 
  BarChart3, 
  Plus, 
  CheckCircle2, 
  Sparkles, 
  Clock, 
  Trash2, 
  ArrowUpRight,
  ShieldCheck,
  TrendingUp,
  X,
  Pencil,
  Check,
  HelpCircle,
  Landmark,
  CreditCard,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ExpenseCategory, ExpenseItem } from '../types';
import { BankSyncModal } from './BankSyncModal';

interface TodayScreenProps {
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

export const TodayScreen: React.FC<TodayScreenProps> = () => {
  const { 
    state, 
    setActiveTab, 
    todayAllowedSpend, 
    todayRemainingAfterSpend,
    todaySpent, 
    baseDailyNorm, 
    daysToSalary, 
    todayRemainingForecast,
    addExpenseToDate,
    updateExpense,
    deleteExpenseFromDate,
    unconfirmedCountToday,
    totalCheckingBankBalance,
    pendingBankTransactionsCount,
    syncBankAccounts,
    isBankSyncing,
    currentPeriodTemplate
  } = useBudget();

  // Tooltip popups state
  const [showDailyLimitTooltip, setShowDailyLimitTooltip] = useState(false);
  const [showForecastTooltip, setShowForecastTooltip] = useState(false);
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

  const todayRecord = state.days.find(d => d.date === state.todayDate);
  const rawExpenses = todayRecord?.expenses || [];
  
  // Sort expenses by time descending (newest first)
  const expenses = React.useMemo(() => {
    return [...rawExpenses].sort((a, b) => (b.time || '').localeCompare(a.time || ''));
  }, [rawExpenses]);

  const allConfirmed = expenses.length > 0 && expenses.every(e => e.isConfirmed);

  // Format dynamic dates
  const formattedTodayDate = React.useMemo(() => {
    try {
      const parts = (state.todayDate || '').split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
      }
      return 'сегодня';
    } catch {
      return 'сегодня';
    }
  }, [state.todayDate]);

  const formattedPeriod = React.useMemo(() => {
    if (currentPeriodTemplate?.formattedLabel) {
      return currentPeriodTemplate.formattedLabel;
    }
    try {
      const s = (state.periodStartDate || '').split('-');
      const e = (state.periodEndDate || '').split('-');
      if (s.length === 3 && e.length === 3) {
        return `${s[2]}.${s[1]}.${s[0]} — ${e[2]}.${e[1]}.${e[0]}`;
      }
      return 'Текущий месяц';
    } catch {
      return 'Текущий месяц';
    }
  }, [currentPeriodTemplate, state.periodStartDate, state.periodEndDate]);

  // Calculate percentage of norm spent
  const percentageSpent = Math.min(100, Math.round((todaySpent / baseDailyNorm) * 100));
  const isOverLimit = todaySpent > baseDailyNorm;

  const getCategoryEmoji = (categoryType: string) => {
    const found = CATEGORY_OPTIONS.find(c => c.type === categoryType);
    return found ? found.emoji : '📝';
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
  };

  const handleSaveNewExpense = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const parsedAmount = parseFloat(newAmount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    addExpenseToDate(state.todayDate, {
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

    updateExpense(state.todayDate, expenseId, {
      title: editTitle.trim() || 'Расход',
      amount: parsedAmount,
      category: editCatName || 'Покупки',
      categoryType: editCategory,
      time: editTime,
    });

    setEditingExpenseId(null);
  };

  return (
    <div className="flex flex-col gap-4 pb-28 pt-2 relative">
      {/* Header Info */}
      <div className="flex justify-between items-end px-1">
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Период</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold text-[var(--color-text-body)]">{formattedPeriod}</span>
            {currentPeriodTemplate?.isSalaryShifted && (
              <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/20" title={currentPeriodTemplate.salaryShiftReason}>
                Выплата {currentPeriodTemplate.actualSalaryDay}-го
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col text-right">
          <span className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Осталось дней</span>
          <span className="text-sm font-bold text-[var(--color-text-body)] bg-[var(--color-bg-card-muted)] px-2 py-0.5 rounded-md border border-[var(--color-border-subtle)]">
            {daysToSalary} дней
          </span>
        </div>
      </div>

      {/* Bank Synchronization Status Bar */}
      <div className="bg-[var(--color-bg-card)] rounded-2xl p-3 shadow-xs border border-blue-500/20 flex items-center justify-between gap-2">
        <div 
          onClick={() => setIsBankModalOpen(true)}
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity min-w-0"
        >
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Landmark className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[var(--color-text-main)] truncate">
                Карты: {formatRubles(totalCheckingBankBalance)}
              </span>
              {pendingBankTransactionsCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold shrink-0">
                  +{pendingBankTransactionsCount} новых
                </span>
              )}
            </div>
            <p className="text-[10px] text-[var(--color-text-muted)] truncate">
              {pendingBankTransactionsCount > 0 
                ? 'Новые чеки из банков ждут подтверждения' 
                : 'Синхронизировано с Т-Банком и Сбером'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => syncBankAccounts()}
            disabled={isBankSyncing}
            className="p-1.5 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-card-subtle)] transition-colors active:scale-95"
            title="Обновить данные из банков"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isBankSyncing ? 'animate-spin text-blue-500' : ''}`} />
          </button>
          <button
            onClick={() => setActiveTab('confirm-expenses')}
            className="py-1 px-2.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-[11px] font-bold transition-colors"
          >
            Сверка →
          </button>
        </div>
      </div>

      {/* Central Hero Card: Daily Limit (Clickable for Tooltip #1) */}
      <motion.section 
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => setShowDailyLimitTooltip(true)}
        className="bg-[var(--color-bg-card)] rounded-2xl p-5 shadow-xs border border-[var(--color-border)] hover:border-[var(--color-accent)] flex flex-col items-center justify-center text-center relative overflow-hidden cursor-pointer transition-all group select-none"
        title="Нажмите для подробного пояснения цифр"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[var(--color-accent)]/15 to-transparent rounded-bl-full pointer-events-none" />
        
        <div className="flex items-center gap-1.5 mb-2 relative z-10">
          <h2 className="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
            Сегодня можно потратить
          </h2>
          <HelpCircle className="w-3.5 h-3.5 text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] transition-colors" />
        </div>

        <div className="flex items-center justify-center gap-2 relative z-10 mb-1">
          <div className="w-9 h-9 rounded-full bg-[var(--color-accent-badge-bg)] flex items-center justify-center text-[var(--color-accent)] group-hover:scale-105 transition-transform">
            <Zap className="w-5 h-5 fill-[var(--color-accent)]" />
          </div>
          <span className="text-4xl font-extrabold text-[var(--color-text-main)] tracking-tight">
            {formatRubles(todayRemainingAfterSpend, { showCents: false })}
          </span>
        </div>

        <p className="text-xs font-medium text-[var(--color-text-muted)] relative z-10">
          (базовая норма: {formatRubles(baseDailyNorm, { showCents: false })})
        </p>

        {todayAllowedSpend > baseDailyNorm && (
          <div className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-accent-badge-text)] bg-[var(--color-accent-badge-bg)] border border-[var(--color-accent-badge-border)] px-2.5 py-1 rounded-full">
            <Sparkles className="w-3 h-3" />
            +{(todayAllowedSpend - baseDailyNorm).toFixed(0)} ₽ накоплено за счет экономии
          </div>
        )}

        <div className="mt-2 text-[10px] text-[var(--color-text-muted)] opacity-75 group-hover:opacity-100 flex items-center gap-1">
          <span>Нажмите на виджет для пояснения расчёта</span>
        </div>
      </motion.section>

      {/* Progress Section */}
      <section className="bg-[var(--color-bg-card)] rounded-2xl p-4 shadow-xs border border-[var(--color-border)] flex flex-col gap-2.5">
        <div className="flex justify-between items-baseline">
          <h3 className="text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider">
            Потрачено сегодня:
          </h3>
          <span className={`text-sm font-bold ${isOverLimit ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-main)]'}`}>
            {formatRubles(todaySpent)}
          </span>
        </div>

        <div className="w-full h-2.5 bg-[var(--color-bg-card-muted)] rounded-full overflow-hidden relative">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentageSpent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`h-full rounded-full absolute left-0 top-0 transition-colors ${
              isOverLimit ? 'bg-[var(--color-danger)]' : 'bg-[var(--color-accent)]'
            }`}
          />
        </div>

        <div className="flex justify-between items-center text-[10px] font-bold text-[var(--color-text-muted)]">
          <span>0 ₽</span>
          <span className="text-[var(--color-text-main)]">{percentageSpent}% от нормы</span>
          <span>{formatRubles(baseDailyNorm, { showCents: false })}</span>
        </div>
      </section>

      {/* Metric Section: Forecast (Clickable for Tooltip #2) */}
      <section 
        onClick={() => setShowForecastTooltip(true)}
        className="bg-[var(--color-bg-card)] rounded-2xl p-4 shadow-xs border border-[var(--color-border)] hover:border-[var(--color-accent)] flex justify-between items-center cursor-pointer transition-all group select-none relative"
        title="Нажмите для пояснения прогноза остатка"
      >
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
              Прогноз остатка:
            </h3>
            <HelpCircle className="w-3.5 h-3.5 text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] transition-colors" />
          </div>
          <p className="text-[11px] text-[var(--color-text-muted)]">
            к концу расчетного месяца ({state.periodEndDate ? `${state.periodEndDate.split('-')[2]}.${state.periodEndDate.split('-')[1]}` : '04.09'})
          </p>
          {/* Requested label: сэкономили в этом месяце */}
          <p className="text-[10px] text-[var(--color-accent)] font-semibold mt-0.5">
            сэкономили в этом месяце
          </p>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-xl font-bold text-[var(--color-accent)] group-hover:scale-105 transition-transform">
            {formatRubles(todayRemainingForecast, { showCents: false })}
          </span>
          <span className="text-[10px] text-[var(--color-text-muted)] font-medium">
            накоплено
          </span>
        </div>
      </section>

      {/* Today's Registered Expenses List with INLINE ADD and INLINE EDIT */}
      <section className="bg-[var(--color-bg-card)] rounded-2xl p-4 shadow-xs border border-[var(--color-border)] flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
            Расходы за {formattedTodayDate} ({expenses.length})
          </h3>
          {!isAddingInline && (
            <button
              onClick={handleStartAddInline}
              className="text-xs font-bold text-[var(--color-accent-badge-text)] hover:opacity-90 bg-[var(--color-accent-badge-bg)] border border-[var(--color-accent-badge-border)] px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all active:scale-95 touch-manipulation"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+Добавить расход</span>
            </button>
          )}
        </div>

        {/* INLINE MINI-WIDGET: ADD NEW EXPENSE */}
        <AnimatePresence>
          {isAddingInline && (
            <motion.form
              initial={{ opacity: 0, height: 0, y: -6 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -6 }}
              onSubmit={handleSaveNewExpense}
              className="bg-[var(--color-bg-card-subtle)] border-2 border-[var(--color-accent)]/50 rounded-2xl p-3.5 flex flex-col gap-3 shadow-xs overflow-hidden"
            >
              <div className="flex justify-between items-center pb-1 border-b border-[var(--color-border)]">
                <span className="text-xs font-bold text-[var(--color-text-main)] flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                  Новый расход за сегодня
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingInline(false)}
                  className="p-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-border)]/50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Title & Amount inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block mb-1">
                    Название покупки
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Например: Кофе и круассан"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    autoFocus
                    className="w-full h-9 px-3 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-xl text-xs text-[var(--color-text-main)] font-medium focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block mb-1">
                    Сумма расхода, ₽
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="w-full h-9 px-3 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-xl text-xs text-[var(--color-text-main)] font-bold focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] transition-colors"
                  />
                </div>
              </div>

              {/* Category picker chips */}
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
                      className={`flex-shrink-0 px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${
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
                    className="h-8 px-2 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-lg text-xs font-semibold text-[var(--color-text-main)]"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setIsAddingInline(false)}
                    className="flex-1 sm:flex-none px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]/50 rounded-xl transition-colors text-center"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="flex-1 sm:flex-none px-4 py-2 bg-[#006d37] dark:bg-[#10b981] dark:text-[#041627] hover:bg-[#005228] dark:hover:bg-[#059669] text-white text-xs font-bold rounded-xl shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 touch-manipulation"
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
        {expenses.length === 0 && !isAddingInline ? (
          <div className="text-center py-5 text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-card-subtle)] rounded-xl border border-dashed border-[var(--color-border)]">
            За сегодня расходов не зафиксировано. Нажмите <strong>+Добавить</strong>, чтобы внести первый чек.
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-[var(--color-border-subtle)]">
            {expenses.map((item) => (
              <div key={item.id} className="py-2.5">
                {editingExpenseId === item.id ? (
                  /* INLINE EDIT FORM FOR THIS ITEM */
                  <form 
                    onSubmit={(e) => handleSaveEdit(item.id, e)}
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
                        className="text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
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
                            className={`flex-shrink-0 px-2 py-0.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 ${
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

                    <div className="flex justify-between items-center pt-1">
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
                          className="px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]/50 rounded-lg"
                        >
                          Отмена
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-1 bg-[#006d37] dark:bg-[#10b981] dark:text-[#041627] hover:bg-[#005228] text-white text-[11px] font-bold rounded-lg flex items-center gap-1 shadow-xs"
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
                      <div className="w-8 h-8 rounded-lg bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)] flex items-center justify-center text-sm">
                        {getCategoryEmoji(item.categoryType)}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[var(--color-text-main)] flex items-center gap-1.5">
                          <span>{item.title}</span>
                          {item.isConfirmed && (
                            <CheckCircle2 className="w-3 h-3 text-[var(--color-accent)]" />
                          )}
                        </div>
                        <div className="text-[10px] text-[var(--color-text-muted)]">
                          {item.category} • {item.time || '18:15'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--color-danger)]">
                        -{formatRubles(item.amount)}
                      </span>

                      {/* EDIT BUTTON */}
                      <button
                        onClick={() => handleStartEdit(item)}
                        className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-bg-card-subtle)] rounded-md transition-all"
                        title="Редактировать статью расхода"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      {/* DELETE BUTTON */}
                      <button
                        onClick={() => deleteExpenseFromDate(state.todayDate, item.id)}
                        className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)] rounded-md transition-all"
                        title="Удалить"
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
      </section>

      {/* Action Buttons: Confirm Expenses Screen transition */}
      <div className="flex flex-col gap-2.5 mt-1">
        <button
          onClick={() => setActiveTab('confirm-expenses')}
          className={`w-full h-13 rounded-xl font-semibold text-sm flex items-center justify-center relative shadow-sm active:scale-98 transition-all ${
            allConfirmed 
              ? 'bg-[#006d37] dark:bg-[#10b981] dark:text-[#041627] text-white hover:bg-[#005a2d]' 
              : 'bg-[#041627] dark:bg-[#1e293b] text-white hover:bg-[#1a2b3c] dark:hover:bg-[#334155]'
          }`}
        >
          {allConfirmed ? (
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#6bfe9c] dark:text-[#041627]" />
              Траты за сегодня подтверждены (экран сверки)
            </span>
          ) : (
            <>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#6bfe9c] dark:text-[#34d399]" />
                Подтвердить траты за сегодня
              </span>
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-[var(--color-danger)] text-white px-2 py-0.5 rounded-full flex items-center justify-center text-[10px] font-bold">
                {unconfirmedCountToday > 0 ? unconfirmedCountToday : expenses.length}
              </span>
            </>
          )}
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className="w-full py-2.5 flex items-center justify-center gap-1.5 text-[var(--color-text-main)] hover:text-[var(--color-accent)] font-semibold text-xs transition-colors"
        >
          <BarChart3 className="w-4 h-4" />
          <span>Смотреть аналитику</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ========================================================= */}
      {/* TOOLTIP 1: "Сегодня можно потратить" (ПОЯСНЕНИЕ ЦИФР)     */}
      {/* ========================================================= */}
      <AnimatePresence>
        {showDailyLimitTooltip && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
            onClick={() => setShowDailyLimitTooltip(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[var(--color-modal-bg)] rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-[var(--color-border)] text-[var(--color-text-main)] flex flex-col gap-3.5"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[var(--color-accent-badge-bg)] text-[var(--color-accent)] flex items-center justify-center">
                    <Zap className="w-4 h-4 fill-[var(--color-accent)]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-[var(--color-text-main)]">
                      Пояснение лимита дня
                    </h3>
                    <span className="text-[11px] text-[var(--color-text-muted)]">Расчёт на 26 августа 2026</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowDailyLimitTooltip(false)}
                  className="p-1 rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-bg-card-subtle)] hover:text-[var(--color-text-main)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-2.5 text-xs">
                {/* 1. Base daily norm */}
                <div className="bg-[var(--color-bg-card-subtle)] p-3 rounded-2xl border border-[var(--color-border)]">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase">Базовая норма дня</span>
                    <span className="text-xs font-bold text-[var(--color-text-main)]">{formatRubles(baseDailyNorm, { showCents: true })}</span>
                  </div>
                  <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                    <strong>{formatRubles(baseDailyNorm, { showCents: true })}</strong> составляет базовая норма дня на весь 30-дневный расчетный период (Итого на прочее / 30 дней).
                  </p>
                </div>

                {/* 2. New dynamic daily norm */}
                <div className="bg-[var(--color-accent-badge-bg)] p-3 rounded-2xl border border-[var(--color-accent-badge-border)]">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] font-bold text-[var(--color-accent-badge-text)] uppercase">Новая норма дня</span>
                    <span className="text-xs font-extrabold text-[var(--color-accent)]">{formatRubles(todayAllowedSpend, { showCents: true })}</span>
                  </div>
                  <p className="text-[11px] text-[var(--color-text-main)] leading-relaxed">
                    <strong>{formatRubles(todayAllowedSpend, { showCents: true })}</strong> — новая норма дня с учётом сэкономленных или перерасходованных денег за прошедшие дни, распределенная на оставшиеся <strong>{daysToSalary} дней</strong> до зарплаты.
                  </p>
                </div>

                {/* 3. Today remaining after spend */}
                <div className="bg-[var(--color-bg-card-subtle)] p-3 rounded-2xl border border-[var(--color-border)]">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase">Остаток к расходу сегодня</span>
                    <span className="text-xs font-bold text-[var(--color-text-main)]">{formatRubles(todayRemainingAfterSpend, { showCents: true })}</span>
                  </div>
                  <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                    Сумма, которую можно свободно потратить сегодня после вычета уже совершенных трат на {formatRubles(todaySpent)}.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowDailyLimitTooltip(false)}
                className="w-full py-2.5 bg-[#041627] dark:bg-[#10b981] dark:text-[#041627] hover:bg-[#1a2b3c] text-white font-bold text-xs rounded-xl shadow-xs transition-colors text-center"
              >
                Понятно (нажмите в любое место)
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* TOOLTIP 2: "Прогноз остатка"                              */}
      {/* ========================================================= */}
      <AnimatePresence>
        {showForecastTooltip && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
            onClick={() => setShowForecastTooltip(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[var(--color-modal-bg)] rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-[var(--color-border)] text-[var(--color-text-main)] flex flex-col gap-3.5"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[var(--color-accent-badge-bg)] text-[var(--color-accent)] flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-[var(--color-text-main)]">
                      Прогноз остатка на конец периода
                    </h3>
                    <span className="text-[11px] text-[var(--color-text-muted)]">К 4 сентября 2026 года</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowForecastTooltip(false)}
                  className="p-1 rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-bg-card-subtle)] hover:text-[var(--color-text-main)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Highlight number */}
              <div className="bg-[var(--color-accent-badge-bg)] p-3.5 rounded-2xl border border-[var(--color-accent-badge-border)] text-center">
                <span className="text-[10px] font-bold text-[var(--color-accent-badge-text)] uppercase block">
                  Текущий прогнозируемый остаток
                </span>
                <span className="text-2xl font-extrabold text-[var(--color-accent)]">
                  {formatRubles(todayRemainingForecast, { showCents: true })}
                </span>
              </div>

              <div className="flex flex-col gap-2 text-xs text-[var(--color-text-secondary)] leading-relaxed">
                <p>
                  Эту сумму вы накопили <strong>суммарно за текущий месяц</strong> за счёт соблюдения и экономии дневных лимитов.
                </p>
                <p>
                  Она прогнозирует ваш <strong>свободный остаток на конец периода (04.09.2026)</strong>.
                </p>
                
                <div className="bg-[var(--color-bg-card-subtle)] p-2.5 rounded-xl border border-[var(--color-border)] flex flex-col gap-1.5 mt-1">
                  <span className="font-bold text-[var(--color-text-main)] text-[11px]">Как управлять этим остатком:</span>
                  <div className="flex items-start gap-1.5 text-[11px]">
                    <span className="text-[var(--color-accent)] font-bold">▲</span>
                    <span><strong>Экономия:</strong> если потратить за день меньше дневной нормы — сумма прогноза возрастёт.</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-[11px]">
                    <span className="text-[var(--color-danger)] font-bold">▼</span>
                    <span><strong>Перерасход:</strong> если потратить больше дневного лимита — прогнозируемый остаток упадёт.</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowForecastTooltip(false)}
                className="w-full py-2.5 bg-[#041627] dark:bg-[#10b981] dark:text-[#041627] hover:bg-[#1a2b3c] text-white font-bold text-xs rounded-xl shadow-xs transition-colors text-center"
              >
                Понятно (нажмите в любое место)
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <BankSyncModal
        isOpen={isBankModalOpen}
        onClose={() => setIsBankModalOpen(false)}
      />
    </div>
  );
};
