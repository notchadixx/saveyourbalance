import React, { useState } from 'react';
import { useBudget, formatRubles } from '../context/BudgetContext';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Circle, 
  Trash2, 
  Plus, 
  Clock, 
  Receipt, 
  FileSpreadsheet, 
  Landmark, 
  Sparkles, 
  Check, 
  X, 
  RefreshCw, 
  AlertCircle, 
  HelpCircle, 
  ArrowRight,
  ChevronDown, 
  ChevronUp,
  BookmarkCheck,
  ShoppingBag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ExpenseItem, BankTransaction, PlannedItem } from '../types';
import { BalanceAuditCard } from './BalanceAuditCard';
import { BankSyncModal } from './BankSyncModal';
import { MarketplaceSyncModal } from './MarketplaceSyncModal';

interface ConfirmExpensesScreenProps {
  onOpenAddExpense: () => void;
}

export const ConfirmExpensesScreen: React.FC<ConfirmExpensesScreenProps> = ({ onOpenAddExpense }) => {
  const { 
    state, 
    setActiveTab, 
    todaySpent, 
    cleanRemainderToday, 
    todayAllowedSpend, 
    todayRemainingAfterSpend,
    daysToSalary,
    toggleExpenseConfirmed, 
    confirmAllExpensesForDate, 
    deleteExpenseFromDate,
    unconfirmedCountToday,
    pendingBankTransactionsCount,
    approveBankTransaction,
    rejectBankTransaction,
    confirmPlannedBankTransaction,
    approveAllPendingBankTransactions,
    syncBankAccounts,
    isBankSyncing
  } = useBudget();

  const [justConfirmedAll, setJustConfirmedAll] = useState(false);
  const [showFormulaBreakdown, setShowFormulaBreakdown] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [isMarketplaceModalOpen, setIsMarketplaceModalOpen] = useState(false);
  const [selectedPlanForTx, setSelectedPlanForTx] = useState<{ [txId: string]: string }>({});
  const [manualPlanTxId, setManualPlanTxId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const todayRecord = state.days.find(d => d.date === state.todayDate);
  const rawExpenses: ExpenseItem[] = todayRecord?.expenses || [];
  
  // Sort expenses by time descending (newest first)
  const expenses = React.useMemo(() => {
    return [...rawExpenses].sort((a, b) => (b.time || '').localeCompare(a.time || ''));
  }, [rawExpenses]);

  const confirmedCount = expenses.filter(e => e.isConfirmed).length;
  const allConfirmed = expenses.length > 0 && confirmedCount === expenses.length;

  const pendingBankTxs = (state.pendingBankTransactions || []).filter(
    t => t.status === 'pending' && t.type !== 'income'
  );

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

  const handleConfirmAll = () => {
    confirmAllExpensesForDate(state.todayDate);
    setJustConfirmedAll(true);
    setTimeout(() => {
      setJustConfirmedAll(false);
    }, 2500);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => prev === msg ? null : prev);
    }, 4000);
  };

  const handleConfirmToPlan = (txId: string, planId: string) => {
    const res = confirmPlannedBankTransaction(txId, planId);
    showToast(res.message || 'Операция успешно учтена в планах');
  };

  const getCategoryEmoji = (categoryType: string) => {
    switch (categoryType) {
      case 'продукты': return '🛒';
      case 'еда_вне_дома': return '☕';
      case 'авто': return '⛽';
      case 'транспорт': return '🚌';
      case 'покупки': return '🛍️';
      case 'развлечения': return '🎬';
      case 'здоровье': return '💊';
      case 'дом': return '🏡';
      default: return '📝';
    }
  };

  // Helper to find matching planned item for a bank transaction
  const findMatchingPlannedItem = (tx: BankTransaction): PlannedItem | undefined => {
    const txTitle = (tx.title || '').toLowerCase();
    const txMerchant = (tx.merchant || '').toLowerCase();
    const txCategory = (tx.categoryType || '').toLowerCase();

    return state.plannedItems.find(p => {
      // Исключаем архивные статьи прошлого периода
      if (p.period === 'previous') return false;
      if (p.isPaid && !p.isProgressTracked) return false;

      const pTitle = p.title.toLowerCase();
      const pCategory = (p.category || '').toLowerCase();

      // 1. Авто / Топливо / Бензин
      const isFuelTx = txTitle.includes('азс') || txTitle.includes('лукойл') || txTitle.includes('газпром') || txTitle.includes('тебойл') || txTitle.includes('топлив') || txTitle.includes('бенз') || txCategory === 'авто';
      const isFuelPlan = pTitle.includes('бенз') || pTitle.includes('топлив') || pTitle.includes('азс') || pCategory === 'авто';
      if (isFuelTx && isFuelPlan) return true;

      // 2. Маркетплейсы: Wildberries / OZON
      const isWbTx = txTitle.includes('wildberries') || txTitle.includes('wb') || txMerchant.includes('wildberries') || txTitle.includes('вайлдберриз');
      const isWbPlan = pTitle.includes('wildberries') || pTitle.includes('wb') || pTitle.includes('вайлдберриз');
      if (isWbTx && isWbPlan) return true;

      const isOzonTx = txTitle.includes('ozon') || txTitle.includes('озон') || txMerchant.includes('ozon');
      const isOzonPlan = pTitle.includes('ozon') || pTitle.includes('озон');
      if (isOzonTx && isOzonPlan) return true;

      // 3. Совпадение по категории (если категория совпадает с той, что внесена в план)
      if (pCategory && txCategory && pCategory === txCategory) {
        return true;
      }

      // 4. Прямое совпадение по названию
      const isExactOrCloseTitle = txTitle.includes(pTitle) || pTitle.includes(txTitle);
      if (isExactOrCloseTitle && pTitle.length > 2) return true;

      return false;
    });
  };

  return (
    <div className="flex flex-col gap-4 pb-28 pt-2">
      {/* 1. Header with back button and Bank & Marketplace Sync CTA */}
      <div className="flex items-center justify-between px-1">
        <button
          onClick={() => setActiveTab('today')}
          className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-text-main)] hover:text-[var(--color-accent)] bg-[var(--color-bg-card)] border border-[var(--color-border)] px-3 py-1.5 rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Назад</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMarketplaceModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1.5 rounded-xl transition-all hover:bg-purple-500/20 active:scale-95 cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>WB / OZON</span>
          </button>

          <button
            onClick={() => setIsBankModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1.5 rounded-xl transition-all hover:bg-blue-500/20 active:scale-95 cursor-pointer"
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>Банки ({state.bankAccounts?.length || 0})</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary Card with fixed "К проверке" badge */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[var(--color-bg-card)] rounded-2xl p-4 sm:p-5 shadow-xs border border-[var(--color-border)] flex flex-col gap-3 relative overflow-hidden"
      >
        {/* Toast notification if operation confirmed */}
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-2.5 sm:p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2 shadow-2xs"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="flex-1 leading-snug">{toastMessage}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="text-emerald-700 dark:text-emerald-300 hover:opacity-75 p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}

        <div className="flex justify-between items-start gap-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-xl bg-[var(--color-accent-badge-bg)] text-[var(--color-accent)] flex items-center justify-center font-bold shrink-0">
                <Receipt className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-[var(--color-text-main)] truncate">Подтверждение трат</h2>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] line-clamp-2">
              Сверьте фактические расходы за {formattedTodayDate} и подтвердите чеки из банков
            </p>
          </div>

          <div className="shrink-0 flex items-center justify-end self-start">
            <span className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1 rounded-full text-[9.5px] sm:text-[11px] font-bold whitespace-nowrap leading-none tracking-tight shadow-2xs ${
              allConfirmed && pendingBankTxs.length === 0
                ? 'bg-[var(--color-accent-badge-bg)] text-[var(--color-accent-badge-text)] border border-[var(--color-accent-badge-border)]' 
                : 'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border border-[var(--color-danger)]/20'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${allConfirmed && pendingBankTxs.length === 0 ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
              <span>{allConfirmed && pendingBankTxs.length === 0 ? 'Все подтверждено ✓' : `К проверке: ${unconfirmedCountToday + pendingBankTxs.length}`}</span>
            </span>
          </div>
        </div>

        {/* Quick summary grid */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[var(--color-border)] text-center">
          <div className="bg-[var(--color-bg-card-subtle)] p-2 rounded-xl border border-[var(--color-border-subtle)]">
            <span className="text-[10px] font-bold text-[var(--color-text-muted)] block uppercase">Сумма трат</span>
            <span className="text-sm font-extrabold text-[var(--color-danger)]">
              {formatRubles(todaySpent)}
            </span>
          </div>

          <div className="bg-[var(--color-bg-card-subtle)] p-2 rounded-xl border border-[var(--color-border-subtle)]">
            <span className="text-[10px] font-bold text-[var(--color-text-muted)] block uppercase">Подтверждено</span>
            <span className="text-sm font-bold text-[var(--color-text-main)]">
              {confirmedCount} из {expenses.length}
            </span>
          </div>

          <div className="bg-[var(--color-accent-badge-bg)] p-2 rounded-xl border border-[var(--color-accent-badge-border)]">
            <span className="text-[10px] font-bold text-[var(--color-accent-badge-text)] block uppercase">Лимит дня</span>
            <span className="text-sm font-extrabold text-[var(--color-accent)]">
              {formatRubles(todayAllowedSpend, { showCents: false })}
            </span>
          </div>
        </div>

        {/* Confirm all button */}
        {expenses.length > 0 && !allConfirmed && (
          <button
            onClick={handleConfirmAll}
            className="w-full py-2.5 rounded-xl bg-[#006d37] dark:bg-[#10b981] text-white dark:text-[#041627] font-bold text-xs shadow-xs active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Подтвердить все учтенные расходы ({expenses.length})</span>
          </button>
        )}
      </motion.div>

      {/* 3. SECTION: INCOMING BANK TRANSACTIONS WITH SMART MATCHING */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center px-1">
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-blue-500" />
            <h3 className="text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider">
              Новые операции из банков ({pendingBankTxs.length})
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => syncBankAccounts()}
              disabled={isBankSyncing}
              className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isBankSyncing ? 'animate-spin' : ''}`} />
              <span>Синхронизировать</span>
            </button>
          </div>
        </div>

        {pendingBankTxs.length === 0 ? (
          <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 text-center text-xs text-[var(--color-text-muted)] border border-[var(--color-border)] flex items-center justify-between">
            <div className="flex items-center gap-2 text-left">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Все банковские операции обработаны. Новых транзакций нет.</span>
            </div>
            <button
              onClick={() => syncBankAccounts()}
              className="text-[11px] font-bold text-[var(--color-accent)] hover:underline shrink-0 cursor-pointer"
            >
              Проверить
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {/* 1-click Approve All Bank transactions */}
            <div className="flex justify-between items-center px-1">
              <span className="text-[11px] text-[var(--color-text-muted)]">
                Поступили автоматически через банковскую синхронизацию:
              </span>
              <button
                onClick={() => approveAllPendingBankTransactions()}
                className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Принять все ({pendingBankTxs.length})</span>
              </button>
            </div>

            {pendingBankTxs.map((tx) => {
              const matchingPlanned = findMatchingPlannedItem(tx);

              return (
                <motion.div
                  key={tx.id}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-4 rounded-2xl bg-[var(--color-bg-card)] border-2 border-blue-500/30 hover:border-blue-500/60 shadow-xs flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center text-base shrink-0">
                        {getCategoryEmoji(tx.categoryType)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-[var(--color-text-main)] truncate">
                            {tx.title}
                          </span>
                        </div>

                        <div className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.2 rounded-md">
                            {tx.bankName} {tx.accountNumberMask}
                          </span>
                          <span>•</span>
                          <span>{tx.categoryName}</span>
                          <span>•</span>
                          <span>{tx.time}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-base font-extrabold text-[var(--color-danger)]">
                        -{formatRubles(tx.amount)}
                      </span>

                      <button
                        onClick={() => rejectBankTransaction(tx.id)}
                        className="p-2 rounded-xl bg-[var(--color-bg-card-subtle)] hover:bg-rose-500/20 text-[var(--color-text-muted)] hover:text-rose-500 border border-[var(--color-border)] active:scale-95 transition-all cursor-pointer"
                        title="Отклонить операцию (перевод/не расход)"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Planned match notification if detected */}
                  {matchingPlanned ? (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col gap-2.5">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-amber-900 dark:text-amber-200 block">
                            Обнаружено совпадение с планом! Учесть в плановую статью?
                          </span>
                          <span className="text-[11px] text-amber-800/90 dark:text-amber-300/90 block mt-0.5">
                            Категория операции совпала со статьёй: <strong>«{matchingPlanned.title}»</strong> (План: {formatRubles(matchingPlanned.amount)}
                            {matchingPlanned.spentAmount ? `, факт: ${formatRubles(matchingPlanned.spentAmount)}` : ''}).
                            Сумма будет учтена в шкале плана, а дневной лимит трат не уменьшится.
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleConfirmToPlan(tx.id, matchingPlanned.id)}
                          className="flex-1 py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <BookmarkCheck className="w-3.5 h-3.5" />
                          <span>Да, учесть в план «{matchingPlanned.title}»</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            approveBankTransaction(tx.id);
                            showToast(`Расход ${formatRubles(tx.amount)} списан из бюджета на сегодня`);
                          }}
                          className="py-2 px-3 rounded-xl bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-card-subtle)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-main)] active:scale-95 transition-all cursor-pointer text-center"
                        >
                          Нет, списать из «Сегодня»
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-amber-500/20 text-[10px] text-amber-800/70 dark:text-amber-400/70">
                        <span>Правило: совпадение по сумме — закрывает план, иначе обновляет шкалу</span>
                        <button
                          type="button"
                          onClick={() => setManualPlanTxId(manualPlanTxId === tx.id ? null : tx.id)}
                          className="font-bold underline hover:text-amber-900 dark:hover:text-amber-200 cursor-pointer"
                        >
                          {manualPlanTxId === tx.id ? 'Скрыть выбор плана' : 'Выбрать другой план...'}
                        </button>
                      </div>

                      {manualPlanTxId === tx.id && (
                        <div className="pt-2 flex flex-col sm:flex-row gap-2">
                          <select
                            value={selectedPlanForTx[tx.id] || matchingPlanned.id}
                            onChange={(e) => setSelectedPlanForTx({ ...selectedPlanForTx, [tx.id]: e.target.value })}
                            className="h-8 px-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg text-xs font-semibold text-[var(--color-text-main)] flex-1"
                          >
                            {state.plannedItems.filter(p => p.period !== 'previous').map(p => (
                              <option key={p.id} value={p.id}>
                                {p.title} (План: {formatRubles(p.amount)}{p.spentAmount ? `, факт: ${formatRubles(p.spentAmount)}` : ''})
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              const targetId = selectedPlanForTx[tx.id] || matchingPlanned.id;
                              handleConfirmToPlan(tx.id, targetId);
                            }}
                            className="h-8 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            Учесть в выбранный план
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 pt-1 border-t border-[var(--color-border-subtle)]">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setManualPlanTxId(manualPlanTxId === tx.id ? null : tx.id)}
                          className="text-[11px] font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] flex items-center gap-1 cursor-pointer"
                        >
                          <BookmarkCheck className="w-3.5 h-3.5" />
                          <span>{manualPlanTxId === tx.id ? 'Отменить выбор плана' : 'Учесть в плановую статью...'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            approveBankTransaction(tx.id);
                            showToast(`Расход ${formatRubles(tx.amount)} списан из бюджета на сегодня`);
                          }}
                          className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Подтвердить расход за сегодня</span>
                        </button>
                      </div>

                      {manualPlanTxId === tx.id && (
                        <div className="p-2.5 rounded-xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)] flex flex-col sm:flex-row gap-2">
                          <select
                            value={selectedPlanForTx[tx.id] || state.plannedItems.filter(p => p.period !== 'previous')[0]?.id || ''}
                            onChange={(e) => setSelectedPlanForTx({ ...selectedPlanForTx, [tx.id]: e.target.value })}
                            className="h-8 px-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg text-xs font-semibold text-[var(--color-text-main)] flex-1"
                          >
                            {state.plannedItems.filter(p => p.period !== 'previous').map(p => (
                              <option key={p.id} value={p.id}>
                                {p.title} (План: {formatRubles(p.amount)}{p.spentAmount ? `, факт: ${formatRubles(p.spentAmount)}` : ''})
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              const activePlans = state.plannedItems.filter(p => p.period !== 'previous');
                              const targetId = selectedPlanForTx[tx.id] || activePlans[0]?.id;
                              if (targetId) handleConfirmToPlan(tx.id, targetId);
                            }}
                            className="h-8 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            Перенести в план
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. SECTION: TODAY'S EXPENSES LIST */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider">
            Расходы за {formattedTodayDate} ({expenses.length})
          </h3>
          <button
            onClick={onOpenAddExpense}
            className="flex items-center gap-1 text-xs font-semibold text-[var(--color-accent)] hover:opacity-80 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Добавить чек вручную</span>
          </button>
        </div>

        {expenses.length === 0 ? (
          <div className="bg-[var(--color-bg-card)] rounded-2xl p-6 text-center text-xs text-[var(--color-text-muted)] border border-[var(--color-border)]">
            За сегодня расходов не зафиксировано
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {expenses.map((item) => (
              <motion.div
                key={item.id}
                layout
                onClick={() => toggleExpenseConfirmed(state.todayDate, item.id)}
                className={`bg-[var(--color-bg-card)] rounded-2xl p-3.5 border transition-all cursor-pointer flex items-center justify-between group select-none ${
                  item.isConfirmed
                    ? 'border-[var(--color-accent)]/50 bg-[var(--color-accent-badge-bg)]/20 shadow-xs'
                    : 'border-[var(--color-border-strong)] hover:border-[var(--color-accent)] bg-[var(--color-bg-card)] ring-1 ring-amber-500/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform active:scale-90 ${
                      item.isConfirmed ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'
                    }`}
                  >
                    {item.isConfirmed ? (
                      <CheckCircle2 className="w-5 h-5 fill-[var(--color-accent-light)] text-[#00210c] dark:text-[#041627]" />
                    ) : (
                      <Circle className="w-5 h-5 text-amber-500" />
                    )}
                  </div>

                  <div className="w-9 h-9 rounded-xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)] flex items-center justify-center text-base">
                    {getCategoryEmoji(item.categoryType)}
                  </div>

                  <div>
                    <div className={`text-sm font-bold ${item.isConfirmed ? 'text-[var(--color-text-main)]' : 'text-[var(--color-text-body)]'}`}>
                      {item.title}
                    </div>
                    <div className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-1.5">
                      <span>{item.category}</span>
                      {item.bankSource && (
                        <>
                          <span>•</span>
                          <span className="text-blue-500 font-semibold">{item.bankSource}</span>
                        </>
                      )}
                      <span>•</span>
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-3 h-3 text-[var(--color-text-muted)]" />
                        {item.time || '18:15'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="text-sm font-extrabold text-[var(--color-danger)]">
                      -{formatRubles(item.amount)}
                    </span>
                    <span className={`block text-[10px] font-semibold ${
                      item.isConfirmed ? 'text-[var(--color-accent)]' : 'text-amber-500'
                    }`}>
                      {item.isConfirmed ? 'Подтвержден ✓' : 'Требует проверки'}
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteExpenseFromDate(state.todayDate, item.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-all ml-1 cursor-pointer"
                    title="Удалить"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* 5. BALANCE AUDIT & CORRECTION CARD */}
      <BalanceAuditCard onOpenBankModal={() => setIsBankModalOpen(true)} />

      {/* 6. Live Formula Engine Breakdown */}
      <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 shadow-xs border border-[var(--color-border)] flex flex-col gap-3">
        <button
          onClick={() => setShowFormulaBreakdown(!showFormulaBreakdown)}
          className="flex items-center justify-between text-left w-full cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-[var(--color-accent)]" />
            <h3 className="text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider">
              Пересчет формул Google Таблицы
            </h3>
          </div>
          <span className="text-xs font-semibold text-blue-500 hover:text-blue-400 flex items-center gap-1">
            {showFormulaBreakdown ? 'Скрыть формулы' : 'Показать формулы'}
            {showFormulaBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </span>
        </button>

        <AnimatePresence>
          {showFormulaBreakdown && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-col gap-2 pt-2 border-t border-[var(--color-border)] text-xs"
            >
              <div className="p-2.5 rounded-xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)] font-mono text-[11px] text-[var(--color-text-secondary)]">
                <span className="font-bold text-[var(--color-text-main)] block font-sans text-xs mb-1">
                  1. Чистый остаток на сегодня (Ячейка D5):
                </span>
                <code>= D1 - SUM(H_start : H_today)</code>
                <span className="block text-[var(--color-accent)] font-sans font-bold mt-1">
                  {formatRubles(cleanRemainderToday)}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)] font-mono text-[11px] text-[var(--color-text-secondary)]">
                <span className="font-bold text-[var(--color-text-main)] block font-sans text-xs mb-1">
                  2. Допустимо сегодня (Ячейка E3):
                </span>
                <code>= D5 / D3 (где D3 = {daysToSalary} дней до З/П)</code>
                <span className="block text-[var(--color-accent)] font-sans font-bold mt-1">
                  {formatRubles(todayAllowedSpend)}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bank Modal */}
      <BankSyncModal
        isOpen={isBankModalOpen}
        onClose={() => setIsBankModalOpen(false)}
      />

      {/* Marketplace Modal */}
      <MarketplaceSyncModal
        isOpen={isMarketplaceModalOpen}
        onClose={() => setIsMarketplaceModalOpen(false)}
      />
    </div>
  );
};
