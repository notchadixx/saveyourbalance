import React, { useState, useMemo, useEffect } from 'react';
import { useBudget, formatRubles, calculateMonthlyCushionNorm } from '../context/BudgetContext';
import { 
  PiggyBank, 
  Sparkles,
  Landmark,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Banknote,
  Calendar,
  Wallet,
  Sliders,
  Percent,
  Coins
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BankSyncModal } from './BankSyncModal';
import { MandatoryExpense } from '../types';

interface CushionScreenProps {
  onOpenDepositModal?: () => void;
}

export const CushionScreen: React.FC<CushionScreenProps> = () => {
  const { 
    state, 
    depositToCushion, 
    updateCashSavings,
    updateCushionMonthlyContribution,
    updateCurrentSalary,
    setCushionDepositStatus,
    updateActualCushionDepositThisMonth,
    updateCushionNorm,
    updateMandatoryExpense,
    addMandatoryExpense,
    deleteMandatoryExpense,
  } = useBudget();

  const [isBankModalOpen, setIsBankModalOpen] = useState(false);

  // Salary inline edit state
  const [isEditingSalary, setIsEditingSalary] = useState(false);
  const [salaryInput, setSalaryInput] = useState((state.currentSalary || 82650).toString());

  // Actual deposit for current month inline edit state
  const [isEditingActualDeposit, setIsEditingActualDeposit] = useState(false);
  const [actualDepositInput, setActualDepositInput] = useState('');

  // Norm configuration toggle & inputs
  const [isConfiguringNorm, setIsConfiguringNorm] = useState(false);
  const currentNormMode = state.cushionNormMode || 'percent';
  const currentNormPercent = state.cushionNormPercent ?? 10;
  const currentNormFixedAmount = state.cushionNormFixedAmount ?? 8265;

  const [normMode, setNormMode] = useState<'percent' | 'fixed'>(currentNormMode);
  const [normPercentInput, setNormPercentInput] = useState(currentNormPercent.toString());
  const [normFixedInput, setNormFixedInput] = useState(currentNormFixedAmount.toString());

  // Sync local norm inputs when state updates
  useEffect(() => {
    setNormMode(state.cushionNormMode || 'percent');
    setNormPercentInput((state.cushionNormPercent ?? 10).toString());
    setNormFixedInput((state.cushionNormFixedAmount ?? 8265).toString());
  }, [state.cushionNormMode, state.cushionNormPercent, state.cushionNormFixedAmount]);

  // Cash on hand inline edit state
  const [isEditingCash, setIsEditingCash] = useState(false);
  const [cashInput, setCashInput] = useState((state.cushionCash || 0).toString());

  // Mandatory expense inline edit state
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');

  // Add new mandatory expense inline state
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [newExpTitle, setNewExpTitle] = useState('');
  const [newExpAmount, setNewExpAmount] = useState('');

  // Table display rows limit state (16 or 48 months)
  const [showAllRows, setShowAllRows] = useState(false);

  const totalMandatorySum = (state.mandatoryExpenses || []).reduce((sum, item) => sum + item.amount, 0);
  const target3Months = totalMandatorySum * 3;
  const targetAmount = state.cushionTargetAmount || target3Months;

  const currentCash = state.cushionCash || 0;
  const totalAccumulatedWithCash = state.cushionAccumulated + currentCash;
  const progressPercentWithCash = targetAmount > 0 
    ? Math.min(100, Math.round((totalAccumulatedWithCash / targetAmount) * 1000) / 10)
    : 0;

  // Calculated current norm
  const currentMonthlyNorm = useMemo(() => {
    return calculateMonthlyCushionNorm(
      state.currentSalary || 82650,
      currentNormMode,
      currentNormPercent,
      currentNormFixedAmount
    );
  }, [state.currentSalary, currentNormMode, currentNormPercent, currentNormFixedAmount]);

  const isDepositMade = state.isCushionDepositDoneThisMonth ?? true;
  const currentMonthDeposit = state.actualCushionDepositThisMonth !== undefined && state.actualCushionDepositThisMonth > 0
    ? state.actualCushionDepositThisMonth
    : currentMonthlyNorm;

  const remainingToSave = Math.max(0, targetAmount - totalAccumulatedWithCash);
  const monthlyPace = currentMonthlyNorm > 0 ? currentMonthlyNorm : 8265;
  const monthsToTarget = monthlyPace > 0 ? Math.ceil(remainingToSave / monthlyPace) : Infinity;

  // Dynamic calculation of target achievement date based on current date & monthly norm
  const dynamicTargetDate = useMemo(() => {
    if (remainingToSave <= 0) return 'Цель достигнута! 🎉';
    if (!isFinite(monthsToTarget) || monthsToTarget <= 0) return 'Не определено';
    
    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth() + monthsToTarget, 1);
    const months = [
      'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    return `${months[targetDate.getMonth()]} ${targetDate.getFullYear()} (через ${monthsToTarget} мес.)`;
  }, [remainingToSave, monthsToTarget]);

  // Handlers
  const handleSaveSalary = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = parseFloat(salaryInput.replace(/\s+/g, '').replace(',', '.'));
    if (!isNaN(val) && val > 0) {
      updateCurrentSalary(val);
    }
    setIsEditingSalary(false);
  };

  const handleSaveActualDeposit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = parseFloat(actualDepositInput.replace(/\s+/g, '').replace(',', '.'));
    if (!isNaN(val) && val >= 0) {
      updateActualCushionDepositThisMonth(val);
      setCushionDepositStatus(true, val);
    }
    setIsEditingActualDeposit(false);
  };

  const handleSaveNormSettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const percentVal = parseFloat(normPercentInput.replace(/\s+/g, '').replace(',', '.')) || 10;
    const fixedVal = parseFloat(normFixedInput.replace(/\s+/g, '').replace(',', '.')) || 8265;
    
    updateCushionNorm(normMode, percentVal, fixedVal);
    setIsConfiguringNorm(false);
  };

  const handleQuickSetPercent = (pct: number) => {
    setNormMode('percent');
    setNormPercentInput(pct.toString());
    updateCushionNorm('percent', pct, parseFloat(normFixedInput) || 8265);
  };

  const handleQuickSetFixed = (amount: number) => {
    setNormMode('fixed');
    setNormFixedInput(amount.toString());
    updateCushionNorm('fixed', parseFloat(normPercentInput) || 10, amount);
  };

  const handleSaveCash = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = parseFloat(cashInput.replace(/\s+/g, '').replace(',', '.'));
    if (!isNaN(val) && val >= 0) {
      updateCashSavings(val);
    }
    setIsEditingCash(false);
  };

  const handleStartEditExpense = (exp: MandatoryExpense) => {
    setEditingExpenseId(exp.id);
    setExpenseTitle(exp.title);
    setExpenseAmount(exp.amount.toString());
  };

  const handleSaveExpense = (id: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = parseFloat(expenseAmount.replace(/\s+/g, '').replace(',', '.'));
    if (expenseTitle.trim() && !isNaN(val) && val > 0) {
      updateMandatoryExpense(id, {
        title: expenseTitle.trim(),
        amount: val,
      });
    }
    setEditingExpenseId(null);
  };

  const handleCreateNewExpense = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = parseFloat(newExpAmount.replace(/\s+/g, '').replace(',', '.'));
    if (newExpTitle.trim() && !isNaN(val) && val > 0) {
      addMandatoryExpense({
        title: newExpTitle.trim(),
        amount: val,
        category: 'обязательные',
      });
      setNewExpTitle('');
      setNewExpAmount('');
      setIsAddingExpense(false);
    }
  };

  const displayedSchedule = showAllRows ? state.cushionSchedule : state.cushionSchedule.slice(0, 16);

  return (
    <div className="flex flex-col gap-4 pb-28 pt-2">
      {/* 1. Main Hero Cushion Card */}
      <motion.div 
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[var(--color-bg-card)] rounded-2xl p-5 shadow-xs border border-[var(--color-border)] relative overflow-hidden"
      >
        <div className="flex justify-between items-start mb-3">
          <div>
            <span className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">
              Финансовая подушка безопасности
            </span>
            <div className="text-3xl font-extrabold text-[var(--color-accent)] tracking-tight">
              {formatRubles(totalAccumulatedWithCash, { showCents: true })}
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              Цель: <strong className="text-[var(--color-text-main)]">{formatRubles(targetAmount, { showCents: true })}</strong> (3 месяца жизни)
            </p>
          </div>

          <div className="text-right">
            <span className="text-2xl font-black text-[var(--color-text-main)]">
              {progressPercentWithCash.toFixed(1)}%
            </span>
            <span className="text-[10px] text-[var(--color-text-muted)] block font-semibold uppercase">Накоплено</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-3 bg-[var(--color-bg-card-muted)] rounded-full overflow-hidden my-3 border border-[var(--color-border-subtle)]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, progressPercentWithCash)}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-light)] rounded-full"
          />
        </div>

        {/* Grid Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3 border-t border-[var(--color-border)] text-xs">
          <div className="bg-[var(--color-bg-card-subtle)] p-2.5 rounded-xl border border-[var(--color-border-subtle)] flex flex-col justify-between">
            <span className="text-[10px] text-[var(--color-text-muted)] block font-bold uppercase">Накопления в банке</span>
            <span className="text-sm font-bold text-[var(--color-text-main)]">
              {formatRubles(state.cushionAccumulated, { showCents: false })}
            </span>
          </div>

          <div className="bg-[var(--color-bg-card-subtle)] p-2.5 rounded-xl border border-[var(--color-border-subtle)] flex flex-col justify-between">
            <span className="text-[10px] text-[var(--color-text-muted)] block font-bold uppercase">
              Норма взноса ({currentNormMode === 'percent' ? `${currentNormPercent}%` : 'фикс'})
            </span>
            <span className="text-sm font-bold text-[var(--color-accent)]">
              {formatRubles(currentMonthlyNorm)}
            </span>
          </div>

          <div className="bg-[var(--color-bg-card-subtle)] p-2.5 rounded-xl border border-[var(--color-border-subtle)] flex flex-col justify-between">
            <span className="text-[10px] text-[var(--color-text-muted)] block font-bold uppercase flex items-center gap-1">
              <Calendar className="w-3 h-3 text-[var(--color-accent)]" />
              Дата достижения цели
            </span>
            <span className="text-xs font-extrabold text-[var(--color-text-main)]">
              {dynamicTargetDate}
            </span>
          </div>
        </div>
      </motion.div>

      {/* 2. Bank Cushion Deposit Action (Moved to 2nd place) */}
      <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 shadow-xs border border-[var(--color-border)] flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider flex items-center gap-1.5">
            <PiggyBank className="w-4 h-4 text-[var(--color-accent)]" />
            Пополнить подушку в банке
          </h3>
          <span className="text-[11px] text-[var(--color-accent)] font-semibold flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Норма: {formatRubles(currentMonthlyNorm)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)] flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex items-center justify-center font-bold shrink-0">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-[var(--color-text-main)]">
                Накопительный счет финансовой подушки
              </div>
              <div className="text-[11px] text-[var(--color-text-muted)]">
                Т-Банк (13.5% годовых) •4821 / СберБанк
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsBankModalOpen(true)}
            className="py-2.5 px-6 rounded-xl bg-[var(--color-accent)] hover:opacity-90 text-white dark:text-[#041627] text-xs font-extrabold shadow-sm flex items-center gap-2 transition-transform active:scale-95 cursor-pointer shrink-0"
          >
            <PiggyBank className="w-4 h-4" />
            <span>Пополнить</span>
          </button>
        </div>
      </div>

      {/* 3. CASH ON HAND ACCOUNTING CARD (Moved to 3rd place after Bank Deposit) */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[var(--color-bg-card)] rounded-2xl p-4 shadow-xs border border-[var(--color-border)] flex flex-col gap-3"
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider flex items-center gap-1.5">
                <span>Учет наличных денег</span>
                <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold lowercase">
                  Cash on hand
                </span>
              </h3>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                Наличные сбережения и резервы дома / в сейфе
              </p>
            </div>
          </div>

          {!isEditingCash && (
            <button
              onClick={() => {
                setCashInput((state.cushionCash || 0).toString());
                setIsEditingCash(true);
              }}
              className="text-xs font-bold text-[var(--color-accent)] hover:underline flex items-center gap-1 cursor-pointer shrink-0 bg-[var(--color-bg-card)] px-2.5 py-1 rounded-lg border border-[var(--color-border)]"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Изменить</span>
            </button>
          )}
        </div>

        <div className="p-3 rounded-xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)] flex items-center justify-between">
          <div className="w-full">
            <span className="text-[10px] text-[var(--color-text-muted)] font-medium block">
              Сумма наличных средств в наличии
            </span>
            {isEditingCash ? (
              <form onSubmit={handleSaveCash} className="flex items-center gap-2 mt-1.5 flex-wrap">
                <input
                  type="number"
                  step="100"
                  value={cashInput}
                  onChange={(e) => setCashInput(e.target.value)}
                  className="w-40 px-3 py-1.5 text-sm font-bold bg-[var(--color-bg-card)] border border-[var(--color-accent)] rounded-lg text-[var(--color-text-main)]"
                  autoFocus
                />
                <button type="submit" className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer">
                  <Check className="w-3.5 h-3.5" />
                  <span>Сохранить</span>
                </button>
                <button type="button" onClick={() => setIsEditingCash(false)} className="px-2.5 py-1.5 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-border)]/50 rounded-lg cursor-pointer">
                  Отмена
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-between mt-1">
                <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {formatRubles(state.cushionCash || 0, { showCents: false })}
                </span>
                <span className="text-xs text-[var(--color-text-muted)] font-medium">
                  Счетчик наличных сбережений
                </span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* 4. PARAMETERS & CONTRIBUTION CONTROL CARD */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[var(--color-bg-card)] rounded-2xl p-4 sm:p-5 shadow-xs border border-[var(--color-border)] flex flex-col gap-3.5"
      >
        {/* Card Header with active norm badge and config toggle */}
        <div className="flex justify-between items-start sm:items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex items-center justify-center font-bold shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider flex items-center gap-1.5 flex-wrap">
                <span>Параметры расчета цели подушки</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-accent-badge-bg)] text-[var(--color-accent)] font-semibold lowercase">
                  {currentNormMode === 'percent' 
                    ? `${currentNormPercent}% от дохода ${currentNormPercent === 10 ? '(рекомендация)' : ''}` 
                    : `${formatRubles(currentNormFixedAmount)} / мес (фикс)`}
                </span>
              </h3>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                Формула Google Sheets: Цель(текущий) = Цель(предыдущий) + норма взноса
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsConfiguringNorm(!isConfiguringNorm)}
            className="text-xs font-bold text-[var(--color-accent)] hover:underline flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card-subtle)] hover:bg-[var(--color-bg-card-muted)] transition-colors cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{isConfiguringNorm ? 'Скрыть настройки нормы' : 'Настроить норму взноса'}</span>
          </button>
        </div>

        {/* Expandable / Inline Norm Customizer */}
        <AnimatePresence>
          {isConfiguringNorm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden border border-[var(--color-accent)]/30 rounded-xl bg-[var(--color-bg-card-subtle)] p-3.5 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--color-text-main)] flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-[var(--color-accent)]" />
                  Установка нормы ежемесячного взноса
                </span>
                <span className="text-[11px] text-[var(--color-text-muted)]">
                  Рекомендация: <strong>10% от дохода</strong>
                </span>
              </div>

              {/* Mode Switcher */}
              <div className="grid grid-cols-2 gap-2 bg-[var(--color-bg-card)] p-1 rounded-xl border border-[var(--color-border-subtle)]">
                <button
                  type="button"
                  onClick={() => setNormMode('percent')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    normMode === 'percent'
                      ? 'bg-[var(--color-accent)] text-white shadow-xs'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)]'
                  }`}
                >
                  <Percent className="w-3.5 h-3.5" />
                  <span>Процент от дохода (%)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNormMode('fixed')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    normMode === 'fixed'
                      ? 'bg-[var(--color-accent)] text-white shadow-xs'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)]'
                  }`}
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>Фиксированная сумма (₽)</span>
                </button>
              </div>

              {/* Content depending on selected mode */}
              {normMode === 'percent' ? (
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] text-[var(--color-text-muted)] font-medium">Быстрый выбор:</span>
                    {[
                      { val: 5, label: '5%' },
                      { val: 10, label: '10% ★ Рекомендовано' },
                      { val: 15, label: '15%' },
                      { val: 20, label: '20%' },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => handleQuickSetPercent(opt.val)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                          parseFloat(normPercentInput) === opt.val
                            ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                            : 'bg-[var(--color-bg-card)] text-[var(--color-text-main)] border-[var(--color-border)] hover:border-[var(--color-accent)]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handleSaveNormSettings} className="flex items-center gap-2 mt-1 flex-wrap">
                    <div className="flex items-center gap-1.5 bg-[var(--color-bg-card)] px-3 py-1.5 border border-[var(--color-border)] rounded-lg">
                      <span className="text-xs text-[var(--color-text-muted)] font-medium">Свой процент:</span>
                      <input
                        type="number"
                        step="0.5"
                        min="1"
                        max="100"
                        value={normPercentInput}
                        onChange={(e) => setNormPercentInput(e.target.value)}
                        className="w-16 text-xs font-extrabold text-[var(--color-text-main)] bg-transparent outline-hidden"
                      />
                      <span className="text-xs font-bold text-[var(--color-text-muted)]">%</span>
                    </div>
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-[var(--color-accent)] text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer hover:opacity-90 transition-opacity"
                    >
                      Применить
                    </button>
                    <span className="text-[11px] text-[var(--color-text-muted)]">
                      = {formatRubles(Math.round((state.currentSalary || 82650) * ((parseFloat(normPercentInput) || 10) / 100)))} в месяц при текущей з/п
                    </span>
                  </form>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] text-[var(--color-text-muted)] font-medium">Быстрый выбор:</span>
                    {[3000, 5000, 8265, 10000, 15000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handleQuickSetFixed(amt)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                          parseFloat(normFixedInput) === amt
                            ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                            : 'bg-[var(--color-bg-card)] text-[var(--color-text-main)] border-[var(--color-border)] hover:border-[var(--color-accent)]'
                        }`}
                      >
                        {formatRubles(amt, { showCents: false })}
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handleSaveNormSettings} className="flex items-center gap-2 mt-1 flex-wrap">
                    <div className="flex items-center gap-1.5 bg-[var(--color-bg-card)] px-3 py-1.5 border border-[var(--color-border)] rounded-lg">
                      <span className="text-xs text-[var(--color-text-muted)] font-medium">Своя сумма:</span>
                      <input
                        type="number"
                        step="100"
                        min="0"
                        value={normFixedInput}
                        onChange={(e) => setNormFixedInput(e.target.value)}
                        className="w-24 text-xs font-extrabold text-[var(--color-text-main)] bg-transparent outline-hidden"
                      />
                      <span className="text-xs font-bold text-[var(--color-text-muted)]">₽</span>
                    </div>
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-[var(--color-accent)] text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer hover:opacity-90 transition-opacity"
                    >
                      Применить
                    </button>
                    <span className="text-[11px] text-[var(--color-text-muted)]">
                      фиксированный ежемесячный взнос в подушку
                    </span>
                  </form>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 2 Primary Widgets: Salary + Contribution Status (Fully Responsive) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch">
          {/* 1. Salary Widget */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)] flex flex-col justify-between gap-2.5 min-w-0 overflow-hidden">
            <div className="flex items-center justify-between gap-1.5 min-w-0">
              <span className="text-[10.5px] sm:text-[11px] text-[var(--color-text-muted)] font-bold uppercase tracking-tight whitespace-nowrap truncate">
                Текущая заработная плата
              </span>
              {!isEditingSalary && (
                <button
                  onClick={() => {
                    setSalaryInput((state.currentSalary || 82650).toString());
                    setIsEditingSalary(true);
                  }}
                  className="text-[11px] font-bold text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 px-2 py-0.5 rounded-lg border border-[var(--color-border)] flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap transition-colors"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Изменить</span>
                </button>
              )}
            </div>

            {isEditingSalary ? (
              <form onSubmit={handleSaveSalary} className="flex items-center gap-1.5 w-full min-w-0">
                <input
                  type="number"
                  step="500"
                  value={salaryInput}
                  onChange={(e) => setSalaryInput(e.target.value)}
                  className="flex-1 min-w-0 px-2.5 py-1 text-sm font-bold bg-[var(--color-bg-card)] border border-[var(--color-accent)] rounded-lg text-[var(--color-text-main)] outline-hidden"
                  autoFocus
                />
                <button 
                  type="submit" 
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1 shadow-xs transition-colors shrink-0"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Сохранить</span>
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsEditingSalary(false)} 
                  className="p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-border)]/50 rounded-lg cursor-pointer transition-colors shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              <div className="flex items-baseline justify-between flex-wrap gap-1.5 min-w-0">
                <span className="text-xl sm:text-2xl font-black text-[var(--color-text-main)] whitespace-nowrap truncate">
                  {formatRubles(state.currentSalary || 82650)}
                </span>
                <span className="text-[10.5px] sm:text-xs font-semibold text-[var(--color-accent)] bg-[var(--color-accent-badge-bg)] px-2 py-0.5 rounded-md whitespace-nowrap shrink-0">
                  Норма: {formatRubles(currentMonthlyNorm)} / мес
                </span>
              </div>
            )}
          </div>

          {/* 2. Current Month Contribution Status Widget */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)] flex flex-col justify-between gap-2.5 min-w-0 overflow-hidden">
            <div className="flex items-center justify-between gap-1.5 min-w-0">
              <span className="text-[10.5px] sm:text-[11px] text-[var(--color-text-muted)] font-bold uppercase tracking-tight whitespace-nowrap truncate">
                Взнос за текущий месяц (Август)
              </span>
            </div>

            {isEditingActualDeposit ? (
              <form onSubmit={handleSaveActualDeposit} className="flex items-center gap-1.5 w-full min-w-0">
                <input
                  type="number"
                  step="100"
                  value={actualDepositInput}
                  onChange={(e) => setActualDepositInput(e.target.value)}
                  placeholder="Сумма, ₽"
                  className="flex-1 min-w-0 px-2.5 py-1 text-sm font-bold bg-[var(--color-bg-card)] border border-[var(--color-accent)] rounded-lg text-[var(--color-text-main)] outline-hidden"
                  autoFocus
                />
                <button 
                  type="submit" 
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1 shadow-xs transition-colors shrink-0"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Внести</span>
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsEditingActualDeposit(false)} 
                  className="p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-border)]/50 rounded-lg cursor-pointer transition-colors shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              <div className="flex flex-col gap-2 min-w-0">
                <div className="flex items-center justify-between flex-wrap gap-1.5 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0 truncate">
                    {isDepositMade ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[11px] sm:text-xs font-bold flex items-center gap-1 whitespace-nowrap truncate">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Внесено: {formatRubles(currentMonthDeposit)}</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11px] sm:text-xs font-bold flex items-center gap-1 whitespace-nowrap truncate">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>Ожидает: {formatRubles(currentMonthlyNorm)}</span>
                      </span>
                    )}
                  </div>

                  {isDepositMade && currentMonthDeposit !== currentMonthlyNorm && (
                    <span className="text-[10px] sm:text-[11px] font-semibold text-[var(--color-text-muted)] whitespace-nowrap">
                      (норма: {formatRubles(currentMonthlyNorm)})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 pt-1 border-t border-[var(--color-border-subtle)] flex-wrap">
                  <button
                    onClick={() => {
                      setActualDepositInput(currentMonthDeposit.toString());
                      setIsEditingActualDeposit(true);
                    }}
                    className="text-[11px] font-bold text-[var(--color-accent)] hover:bg-[var(--color-bg-card-muted)] flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] transition-colors cursor-pointer whitespace-nowrap"
                    title="Клиент может внести любую сумму по желанию"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Своя сумма</span>
                  </button>
                  <button
                    onClick={() => setCushionDepositStatus(!isDepositMade, currentMonthDeposit)}
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                      isDepositMade 
                        ? 'text-[var(--color-danger)] bg-[var(--color-danger-bg)] border-[var(--color-danger)]/30 hover:border-[var(--color-danger)]'
                        : 'text-white bg-[var(--color-accent)] border-[var(--color-accent)] hover:opacity-90'
                    }`}
                  >
                    {isDepositMade ? 'Сбросить' : 'Отметить внесенным'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Helpful Explanation Footer */}
        <div className="p-3 rounded-xl bg-[var(--color-bg-card-muted)] text-[11px] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)] leading-relaxed flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-[var(--color-accent)] shrink-0 mt-0.5" />
          <div>
            <strong>Принцип расчета:</strong> Норма в 10% является классической финансовой рекомендацией. Вы можете установить любой процент или фиксированную сумму, а также вносить любую произвольную сумму за месяц. Все цели будущих периодов автоматически пересчитываются от фактически внесенной суммы.
          </div>
        </div>
      </motion.div>

      {/* 5. Mandatory Monthly Expenses with INLINE EDITING on the widget */}
      <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 shadow-xs border border-[var(--color-border)] flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-[var(--color-text-main)]">
              Обязательные расходы в месяц
            </h3>
            <p className="text-xs text-[var(--color-text-muted)]">
              Базовый минимум для расчета подушки безопасности
            </p>
          </div>
          <div className="text-right">
            <span className="text-sm font-extrabold text-[var(--color-danger)]">
              {formatRubles(totalMandatorySum)}
            </span>
            <span className="text-[10px] text-[var(--color-text-muted)] block">в месяц</span>
          </div>
        </div>

        <div className="divide-y divide-[var(--color-border-subtle)]">
          {(state.mandatoryExpenses || []).map((exp) => {
            if (editingExpenseId === exp.id) {
              return (
                <form 
                  key={exp.id} 
                  onSubmit={(e) => handleSaveExpense(exp.id, e)}
                  className="py-2.5 flex items-center justify-between gap-2 flex-wrap bg-[var(--color-bg-card-subtle)] p-2 rounded-xl"
                >
                  <input
                    type="text"
                    required
                    value={expenseTitle}
                    onChange={(e) => setExpenseTitle(e.target.value)}
                    className="flex-1 min-w-[120px] px-2 py-1 text-xs font-bold bg-[var(--color-bg-card)] border border-[var(--color-accent)] rounded-lg text-[var(--color-text-main)]"
                    placeholder="Название"
                  />
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className="w-24 px-2 py-1 text-xs font-bold bg-[var(--color-bg-card)] border border-[var(--color-accent)] rounded-lg text-[var(--color-text-main)]"
                    placeholder="Сумма"
                  />
                  <div className="flex items-center gap-1">
                    <button type="submit" className="p-1.5 text-emerald-600 hover:bg-emerald-500/10 rounded-lg">
                      <Check className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => setEditingExpenseId(null)} className="p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-border)]/50 rounded-lg">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              );
            }

            return (
              <div key={exp.id} className="py-2.5 flex items-center justify-between text-xs group">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />
                  <span className="font-semibold text-[var(--color-text-main)]">{exp.title}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-bold text-[var(--color-text-main)]">{formatRubles(exp.amount)}</span>
                  
                  <button
                    onClick={() => handleStartEditExpense(exp)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-all"
                    title="Редактировать статью"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => deleteMandatoryExpense(exp.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-all"
                    title="Удалить статью"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add new mandatory expense directly inline */}
        {isAddingExpense ? (
          <form onSubmit={handleCreateNewExpense} className="p-2.5 rounded-xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-accent)] flex items-center gap-2 flex-wrap mt-1">
            <input
              type="text"
              required
              placeholder="Название статьи (например: Интернет)"
              value={newExpTitle}
              onChange={(e) => setNewExpTitle(e.target.value)}
              className="flex-1 min-w-[140px] px-2.5 py-1.5 text-xs font-medium bg-[var(--color-bg-card)] border border-[var(--color-input-border)] rounded-lg text-[var(--color-text-main)]"
              autoFocus
            />
            <input
              type="number"
              step="0.01"
              required
              placeholder="Сумма, ₽"
              value={newExpAmount}
              onChange={(e) => setNewExpAmount(e.target.value)}
              className="w-24 px-2.5 py-1.5 text-xs font-bold bg-[var(--color-bg-card)] border border-[var(--color-input-border)] rounded-lg text-[var(--color-text-main)]"
            />
            <div className="flex items-center gap-1">
              <button
                type="submit"
                className="px-3 py-1.5 bg-[#006d37] dark:bg-[#10b981] text-white dark:text-[#041627] text-xs font-bold rounded-lg shadow-xs"
              >
                Добавить
              </button>
              <button
                type="button"
                onClick={() => setIsAddingExpense(false)}
                className="px-2 py-1.5 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-border)]/50 rounded-lg"
              >
                Отмена
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setIsAddingExpense(true)}
            className="w-full py-2 border border-dashed border-[var(--color-border-strong)] hover:border-[var(--color-accent)] text-[var(--color-text-main)] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Добавить обязательный расход</span>
          </button>
        )}

        <div className="bg-[var(--color-bg-card-subtle)] p-3 rounded-xl flex justify-between items-center text-xs border border-[var(--color-border)]">
          <span className="font-medium text-[var(--color-text-secondary)]">Размер подушки (3 месяца):</span>
          <span className="font-extrabold text-[var(--color-accent)]">{formatRubles(target3Months)}</span>
        </div>
      </div>

      {/* 6. FULL 8-COLUMN GOOGLE SHEETS ACCUMULATION TABLE */}
      <div className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] overflow-hidden shadow-xs">
        <div className="p-3.5 bg-[var(--color-bg-card-subtle)] border-b border-[var(--color-border)] flex justify-between items-center flex-wrap gap-2">
          <div>
            <h4 className="text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider flex items-center gap-1.5">
              <span>Таблица накоплений и целей (с Августа 2026)</span>
            </h4>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
              Заполнен только август 2026 (внесен взнос). Для будущих месяцев заполнена только «Цель на период».
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-[var(--color-accent-badge-text)] bg-[var(--color-accent-badge-bg)] border border-[var(--color-accent-badge-border)] px-2.5 py-1 rounded-full">
              {currentNormMode === 'percent' ? `+${currentNormPercent}% от з/п` : '+фикс'} ({formatRubles(currentMonthlyNorm)}) / мес
            </span>
            <button
              onClick={() => setShowAllRows(!showAllRows)}
              className="text-xs font-bold text-[var(--color-accent)] hover:underline px-2 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] cursor-pointer"
            >
              {showAllRows ? 'Свернуть (16 мес)' : 'Все 48 мес'}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs border-collapse min-w-[760px]">
            <thead className="bg-[#041627] dark:bg-[#152e22] text-white sticky top-0 z-10 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3 font-bold">Месяц</th>
                <th className="py-2.5 px-3 font-bold text-right">Цель на период</th>
                <th className="py-2.5 px-3 font-bold text-right">Доход в подушку</th>
                <th className="py-2.5 px-3 font-bold text-center">% ставка</th>
                <th className="py-2.5 px-3 font-bold text-right">Капитализация</th>
                <th className="py-2.5 px-3 font-bold text-right">Расход</th>
                <th className="py-2.5 px-3 font-bold text-right">Баланс</th>
                <th className="py-2.5 px-3 font-bold text-right">Отклонение</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-subtle)] font-medium">
              {displayedSchedule.map((plan, idx) => {
                const isCurrentMonth = idx === 0;

                return (
                  <tr 
                    key={`${plan.year}-${plan.monthName}`} 
                    className={isCurrentMonth 
                      ? 'bg-emerald-500/10 font-bold border-l-4 border-l-[var(--color-accent)]' 
                      : idx % 2 === 0 
                        ? 'bg-[var(--color-bg-card)]' 
                        : 'bg-[var(--color-bg-card-subtle)]'
                    }
                  >
                    {/* 1. Месяц */}
                    <td className="py-2.5 px-3 text-[var(--color-text-main)] whitespace-nowrap">
                      <span>{plan.monthName} {plan.year}</span>
                      {isCurrentMonth && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.2 rounded-full bg-[var(--color-accent)] text-white dark:text-[#041627] text-[10px] font-extrabold">
                          1-й взнос ✓
                        </span>
                      )}
                    </td>

                    {/* 2. Цель на период (Заполнен для всех строк по формуле) */}
                    <td className="py-2.5 px-3 text-right font-extrabold text-[var(--color-text-main)] whitespace-nowrap">
                      {formatRubles(plan.targetAccumulated, { showCents: true })}
                    </td>

                    {/* 3. Доход в подушку (Только за текущий месяц, иначе —) */}
                    <td className="py-2.5 px-3 text-right font-bold text-[var(--color-accent)] whitespace-nowrap">
                      {isCurrentMonth && plan.monthlyDeposit > 0 
                        ? formatRubles(plan.monthlyDeposit, { showCents: true }) 
                        : <span className="text-[var(--color-text-muted)] font-normal">—</span>
                      }
                    </td>

                    {/* 4. % ставка (Только за текущий месяц, иначе —) */}
                    <td className="py-2.5 px-3 text-center text-[var(--color-text-secondary)] whitespace-nowrap">
                      {isCurrentMonth ? (
                        <span className="px-1.5 py-0.5 rounded bg-[var(--color-bg-card-muted)] text-[10px] font-semibold">
                          {plan.rateInfo || '13.5%'}
                        </span>
                      ) : (
                        <span className="text-[var(--color-text-muted)] font-normal">—</span>
                      )}
                    </td>

                    {/* 5. Капитализация (Только за текущий месяц, иначе —) */}
                    <td className="py-2.5 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      {isCurrentMonth && plan.capitalization > 0 
                        ? `+${formatRubles(plan.capitalization, { showCents: true })}` 
                        : <span className="text-[var(--color-text-muted)] font-normal">—</span>
                      }
                    </td>

                    {/* 6. Расход (Только за текущий месяц, иначе —) */}
                    <td className="py-2.5 px-3 text-right font-semibold text-rose-500 whitespace-nowrap">
                      {isCurrentMonth && plan.expense > 0 
                        ? `-${formatRubles(plan.expense, { showCents: true })}` 
                        : <span className="text-[var(--color-text-muted)] font-normal">—</span>
                      }
                    </td>

                    {/* 7. Баланс (Только за текущий месяц, иначе —) */}
                    <td className="py-2.5 px-3 text-right font-black text-[var(--color-text-main)] whitespace-nowrap">
                      {isCurrentMonth && plan.balance > 0 
                        ? formatRubles(plan.balance, { showCents: true }) 
                        : <span className="text-[var(--color-text-muted)] font-normal">—</span>
                      }
                    </td>

                    {/* 8. Отклонение (Только за текущий месяц, иначе —) */}
                    <td className="py-2.5 px-3 text-right font-bold whitespace-nowrap">
                      {isCurrentMonth ? (
                        plan.deviation >= 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                            +{formatRubles(plan.deviation, { showCents: true })}
                          </span>
                        ) : (
                          <span className="text-rose-500 font-extrabold">
                            {formatRubles(plan.deviation, { showCents: true })}
                          </span>
                        )
                      ) : (
                        <span className="text-[var(--color-text-muted)] font-normal">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <BankSyncModal
        isOpen={isBankModalOpen}
        onClose={() => setIsBankModalOpen(false)}
      />
    </div>
  );
};
