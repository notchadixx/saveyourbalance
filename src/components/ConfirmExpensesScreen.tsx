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
  CreditCard,
  RefreshCw,
  Send,
  MessageSquare,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ExpenseItem, BankTransaction } from '../types';
import { BalanceAuditCard } from './BalanceAuditCard';
import { BankSyncModal } from './BankSyncModal';

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
    approveAllPendingBankTransactions,
    rejectAllPendingBankTransactions,
    syncBankAccounts,
    isBankSyncing,
    parseAndImportBankSnippet
  } = useBudget();

  const [justConfirmedAll, setJustConfirmedAll] = useState(false);
  const [showFormulaBreakdown, setShowFormulaBreakdown] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [quickSmsText, setQuickSmsText] = useState('');
  const [smsFeedback, setSmsFeedback] = useState<string | null>(null);

  const todayRecord = state.days.find(d => d.date === state.todayDate);
  const expenses: ExpenseItem[] = todayRecord?.expenses || [];
  const confirmedCount = expenses.filter(e => e.isConfirmed).length;
  const allConfirmed = expenses.length > 0 && confirmedCount === expenses.length;

  const pendingBankTxs = (state.pendingBankTransactions || []).filter(t => t.status === 'pending');

  const handleConfirmAll = () => {
    confirmAllExpensesForDate(state.todayDate);
    setJustConfirmedAll(true);
    setTimeout(() => {
      setJustConfirmedAll(false);
    }, 2500);
  };

  const handleQuickSmsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSmsText.trim()) return;

    const res = parseAndImportBankSnippet(quickSmsText);
    setSmsFeedback(res.message);
    if (res.success) {
      setQuickSmsText('');
    }
    setTimeout(() => setSmsFeedback(null), 3500);
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

  return (
    <div className="flex flex-col gap-4 pb-28 pt-2">
      {/* 1. Header with back button and Bank Sync CTA */}
      <div className="flex items-center justify-between px-1">
        <button
          onClick={() => setActiveTab('today')}
          className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-text-main)] hover:text-[var(--color-accent)] bg-[var(--color-bg-card)] border border-[var(--color-border)] px-3 py-1.5 rounded-xl shadow-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Назад</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBankModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1.5 rounded-xl transition-all hover:bg-blue-500/20 active:scale-95"
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>Банки ({state.bankAccounts?.length || 0})</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[var(--color-bg-card)] rounded-2xl p-5 shadow-xs border border-[var(--color-border)] flex flex-col gap-3 relative overflow-hidden"
      >
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-xl bg-[var(--color-accent-badge-bg)] text-[var(--color-accent)] flex items-center justify-center font-bold">
                <Receipt className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-extrabold text-[var(--color-text-main)]">Подтверждение трат</h2>
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">
              Сверьте фактические расходы за день и подтвердите чеки из банков
            </p>
          </div>

          <div className="text-right">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
              allConfirmed && pendingBankTxs.length === 0
                ? 'bg-[var(--color-accent-badge-bg)] text-[var(--color-accent-badge-text)] border border-[var(--color-accent-badge-border)]' 
                : 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]'
            }`}>
              {allConfirmed && pendingBankTxs.length === 0
                ? 'Все подтверждено ✓' 
                : `К проверке: ${unconfirmedCountToday + pendingBankTxs.length}`}
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
            className="w-full py-2.5 rounded-xl bg-[#006d37] dark:bg-[#10b981] text-white dark:text-[#041627] font-bold text-xs shadow-xs active:scale-98 transition-all flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Подтвердить все учтенные расходы ({expenses.length})</span>
          </button>
        )}
      </motion.div>

      {/* 3. SECTION: INCOMING BANK TRANSACTIONS (Операции из банковских приложений) */}
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
              className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
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
              className="text-[11px] font-bold text-[var(--color-accent)] hover:underline shrink-0"
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
                className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Принять все ({pendingBankTxs.length})</span>
              </button>
            </div>

            {pendingBankTxs.map((tx) => (
              <motion.div
                key={tx.id}
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-3.5 rounded-2xl bg-[var(--color-bg-card)] border-2 border-blue-500/30 hover:border-blue-500/60 shadow-xs flex items-center justify-between gap-3"
              >
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
                  <span className="text-sm font-extrabold text-[var(--color-danger)]">
                    -{formatRubles(tx.amount)}
                  </span>

                  {/* Actions: Approve / Reject */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => approveBankTransaction(tx.id)}
                      className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs active:scale-95 transition-all"
                      title="Принять и внести в расходы"
                    >
                      <Check className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => rejectBankTransaction(tx.id)}
                      className="p-2 rounded-xl bg-[var(--color-bg-card-subtle)] hover:bg-rose-500/20 text-[var(--color-text-muted)] hover:text-rose-500 border border-[var(--color-border)] active:scale-95 transition-all"
                      title="Отклонить (перевод/не расход)"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* 4. SECTION: TODAY'S EXPENSES LIST */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider">
            Расходы за 26 августа ({expenses.length})
          </h3>
          <button
            onClick={onOpenAddExpense}
            className="flex items-center gap-1 text-xs font-semibold text-[var(--color-accent)] hover:opacity-80"
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
                    className="opacity-0 group-hover:opacity-100 p-1 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-all ml-1"
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

      {/* 5. FAST SMS & PUSH PARSER WIDGET */}
      <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 shadow-xs border border-[var(--color-border)] flex flex-col gap-2.5">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[var(--color-accent)]" />
          <h3 className="text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider">
            Быстрое распознавание SMS / Push банка
          </h3>
        </div>

        <form onSubmit={handleQuickSmsSubmit} className="flex gap-2">
          <input
            type="text"
            value={quickSmsText}
            onChange={(e) => setQuickSmsText(e.target.value)}
            placeholder="Вставьте текст: СберБанк Покупка 450р Магнит или Т-Банк 1200р"
            className="flex-1 text-xs font-medium px-3 py-2 rounded-xl bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-main)] focus:ring-1 focus:ring-[var(--color-accent)] focus:outline-none"
          />
          <button
            type="submit"
            className="py-2 px-3 bg-[#041627] dark:bg-[#10b981] text-white dark:text-[#041627] rounded-xl text-xs font-bold flex items-center gap-1 active:scale-95 transition-all shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Внести</span>
          </button>
        </form>

        {smsFeedback && (
          <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            {smsFeedback}
          </div>
        )}
      </div>

      {/* 6. BALANCE AUDIT & CORRECTION CARD */}
      <BalanceAuditCard onOpenBankModal={() => setIsBankModalOpen(true)} />

      {/* 7. Live Formula Engine Breakdown */}
      <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 shadow-xs border border-[var(--color-border)] flex flex-col gap-3">
        <button
          onClick={() => setShowFormulaBreakdown(!showFormulaBreakdown)}
          className="flex items-center justify-between text-left w-full"
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
    </div>
  );
};
