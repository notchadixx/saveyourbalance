import React, { useState } from 'react';
import { useBudget, formatRubles } from '../context/BudgetContext';
import { 
  ArrowDownLeft, 
  Check, 
  X, 
  Plus, 
  Banknote, 
  CreditCard, 
  Briefcase, 
  Gift, 
  Handshake, 
  Tag, 
  Sparkles, 
  Coins,
  Landmark,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BankTransaction, IncomeItem, IncomeSourceType } from '../types';
import { AddManualIncomeModal } from './AddManualIncomeModal';

export const BudgetIncomeSection: React.FC = () => {
  const { 
    state,
    incomes,
    pendingBankIncomes,
    pendingBankIncomesCount,
    pendingBankIncomesTotal,
    totalIncludedAdditionalIncomes,
    acceptBankIncomeToBudget,
    rejectBankIncome,
    toggleIncomeBudgetInclusion,
    deleteIncome,
    syncBankAccounts,
    isBankSyncing
  } = useBudget();

  const [activeSubTab, setActiveSubTab] = useState<'pending' | 'confirmed'>(
    pendingBankIncomesCount > 0 ? 'pending' : 'confirmed'
  );
  const [isAddManualOpen, setIsAddManualOpen] = useState(false);
  const [selectedInitialSource, setSelectedInitialSource] = useState<IncomeSourceType>('cash');
  const [recentlyAcceptedId, setRecentlyAcceptedId] = useState<string | null>(null);

  // Auto switch tab if pending count becomes 0
  React.useEffect(() => {
    if (pendingBankIncomesCount === 0 && activeSubTab === 'pending' && (incomes.length > 0)) {
      // Keep tab or allow manual switch
    }
  }, [pendingBankIncomesCount, activeSubTab, incomes.length]);

  const handleOpenAddManual = (source: IncomeSourceType = 'cash') => {
    setSelectedInitialSource(source);
    setIsAddManualOpen(true);
  };

  const handleAcceptIncome = (txId: string) => {
    setRecentlyAcceptedId(txId);
    acceptBankIncomeToBudget(txId);
    setTimeout(() => {
      setRecentlyAcceptedId(null);
    }, 1500);
  };

  const getSourceIcon = (sourceType: IncomeSourceType) => {
    switch (sourceType) {
      case 'cash':
        return <Banknote className="w-4 h-4 text-amber-500" />;
      case 'freelance':
        return <Briefcase className="w-4 h-4 text-emerald-500" />;
      case 'debt_return':
        return <Handshake className="w-4 h-4 text-blue-500" />;
      case 'sale':
        return <Tag className="w-4 h-4 text-purple-500" />;
      case 'gift':
        return <Gift className="w-4 h-4 text-pink-500" />;
      case 'bonus':
        return <Sparkles className="w-4 h-4 text-amber-500" />;
      case 'bank_card':
      case 'transfer':
        return <CreditCard className="w-4 h-4 text-indigo-500" />;
      default:
        return <Coins className="w-4 h-4 text-zinc-500" />;
    }
  };

  const formatShortDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const months = ['', 'янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
        const m = parseInt(parts[1], 10);
        return `${parseInt(parts[2], 10)} ${months[m] || ''}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 sm:p-5 shadow-xs border border-[var(--color-border)] flex flex-col gap-4">
      {/* 1. Module Header */}
      <div className="flex justify-between items-start flex-wrap gap-2 pb-3 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-[var(--color-text-main)]">
                Поступления и доходы
              </h3>
              {pendingBankIncomesCount > 0 && (
                <span className="text-[10px] font-extrabold bg-emerald-500 text-white px-2 py-0.5 rounded-full animate-pulse shadow-2xs">
                  +{pendingBankIncomesCount} новых
                </span>
              )}
            </div>
            <p className="text-[11px] text-[var(--color-text-muted)]">
              Анализ зачислений на карту и ручной ввод наличных поступлений
            </p>
          </div>
        </div>

        {/* Action Button: Manual Income */}
        <button
          onClick={() => handleOpenAddManual('cash')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Внести поступление</span>
        </button>
      </div>

      {/* 2. Key Metrics Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <div className="p-3 rounded-xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)]">
          <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block mb-0.5">
            Учтено в бюджете
          </span>
          <span className="text-base sm:text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
            +{formatRubles(totalIncludedAdditionalIncomes, { showCents: false })}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)]">
          <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block mb-0.5">
            Ожидают решения
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base sm:text-lg font-extrabold text-[var(--color-text-main)]">
              {pendingBankIncomesCount} {pendingBankIncomesCount === 1 ? 'операция' : 'операций'}
            </span>
            {pendingBankIncomesTotal > 0 && (
              <span className="text-xs font-bold text-[var(--color-accent)]">
                ({formatRubles(pendingBankIncomesTotal, { showCents: false })})
              </span>
            )}
          </div>
        </div>

        <div className="hidden sm:block p-3 rounded-xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)]">
          <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block mb-0.5">
            Всего доходов
          </span>
          <span className="text-base sm:text-lg font-bold text-[var(--color-text-secondary)]">
            {incomes.length} записей
          </span>
        </div>
      </div>

      {/* 3. Sub-tabs Selector */}
      <div className="flex rounded-xl bg-[var(--color-bg-card-subtle)] p-1 border border-[var(--color-border-subtle)] gap-1">
        <button
          onClick={() => setActiveSubTab('pending')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'pending'
              ? 'bg-[var(--color-bg-card)] text-[var(--color-text-main)] shadow-xs border border-[var(--color-border)]'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Поступления на карту</span>
          {pendingBankIncomesCount > 0 && (
            <span className="text-[10px] font-extrabold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.2 rounded-full">
              {pendingBankIncomesCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('confirmed')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'confirmed'
              ? 'bg-[var(--color-bg-card)] text-[var(--color-text-main)] shadow-xs border border-[var(--color-border)]'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
          }`}
        >
          <Banknote className="w-3.5 h-3.5" />
          <span>Учтенные доходы</span>
          <span className="text-[10px] font-bold text-[var(--color-text-muted)]">
            ({incomes.length})
          </span>
        </button>
      </div>

      {/* 4. Tab 1: Pending Inflow Bank Transactions */}
      {activeSubTab === 'pending' && (
        <div className="flex flex-col gap-2.5">
          {pendingBankIncomes.length === 0 ? (
            <div className="py-8 px-4 text-center rounded-xl bg-[var(--color-bg-card-subtle)] border border-dashed border-[var(--color-border)] flex flex-col items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--color-text-main)]">
                  Все входящие транзакции обработаны
                </p>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                  Новые поступления с карт Т-Банка, Сбера и СБП появятся здесь при синхронизации.
                </p>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => syncBankAccounts()}
                  disabled={isBankSyncing}
                  className="px-3 py-1.5 bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-card-muted)] text-[var(--color-text-main)] border border-[var(--color-border)] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isBankSyncing ? 'animate-spin' : ''}`} />
                  <span>{isBankSyncing ? 'Синхронизация...' : 'Проверить банк'}</span>
                </button>
                <button
                  onClick={() => handleOpenAddManual('cash')}
                  className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Внести наличные</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border-subtle)]">
              {pendingBankIncomes.map((tx) => {
                return (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    {/* Left details */}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-[var(--color-text-main)]">
                            {tx.title}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                            {tx.bankName} {tx.accountNumberMask}
                          </span>
                          <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-[var(--color-bg-card-muted)] text-[var(--color-text-muted)]">
                            {tx.categoryName || 'Поступление'}
                          </span>
                        </div>
                        <span className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                          {formatShortDate(tx.date)} {tx.time ? `• ${tx.time}` : ''} {tx.merchant ? `• ${tx.merchant}` : ''}
                        </span>
                      </div>
                    </div>

                    {/* Right side: Amount & Accept/Reject Controls */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 pl-13 sm:pl-0">
                      <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        +{formatRubles(tx.amount)}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {/* Reject button */}
                        <button
                          onClick={() => rejectBankIncome(tx.id)}
                          className="px-2.5 py-1.5 rounded-xl bg-[var(--color-bg-card-subtle)] hover:bg-rose-500/15 text-[var(--color-text-muted)] hover:text-rose-600 dark:hover:text-rose-400 border border-[var(--color-border-subtle)] hover:border-rose-500/30 transition-all text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          title="Отклонить (не учитывать в бюджете)"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Отклонить</span>
                        </button>

                        {/* Accept into Budget button */}
                        <button
                          onClick={() => handleAcceptIncome(tx.id)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all text-xs font-bold flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
                          title="Принять и суммировать с бюджетом"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Учесть в бюджет</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. Tab 2: Confirmed & Manual Incomes List */}
      {activeSubTab === 'confirmed' && (
        <div className="flex flex-col gap-2">
          {incomes.length === 0 ? (
            <div className="py-8 px-4 text-center rounded-xl bg-[var(--color-bg-card-subtle)] border border-dashed border-[var(--color-border)] flex flex-col items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-full bg-[var(--color-bg-card-muted)] text-[var(--color-text-muted)] flex items-center justify-center">
                <Banknote className="w-5 h-5 opacity-50" />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--color-text-main)]">
                  Пока нет учтенных дополнительных доходов
                </p>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                  Вы можете добавить наличные, подработки или подтвердить поступления на карту.
                </p>
              </div>
              <button
                onClick={() => handleOpenAddManual('cash')}
                className="mt-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Внести наличные или доход</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border-subtle)]">
              {incomes.map((inc) => {
                return (
                  <div 
                    key={inc.id}
                    className={`py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group transition-opacity ${
                      inc.isIncludedInBudget ? 'opacity-100' : 'opacity-60 bg-[var(--color-bg-card-subtle)]/50 rounded-xl px-2'
                    }`}
                  >
                    {/* Left details */}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)] flex items-center justify-center flex-shrink-0 mt-0.5">
                        {getSourceIcon(inc.sourceType)}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-[var(--color-text-main)]">
                            {inc.title}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[var(--color-bg-card-muted)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]">
                            {inc.sourceName || inc.category}
                          </span>
                          {inc.isManual && (
                            <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              Вручную
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                          {formatShortDate(inc.date)} {inc.time ? `• ${inc.time}` : ''} {inc.notes ? `• ${inc.notes}` : ''}
                        </span>
                      </div>
                    </div>

                    {/* Right side: Toggle Inclusion & Delete */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 pl-13 sm:pl-0">
                      <div className="flex flex-col items-end">
                        <span className={`text-sm sm:text-base font-extrabold whitespace-nowrap ${
                          inc.isIncludedInBudget ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--color-text-muted)] line-through'
                        }`}>
                          +{formatRubles(inc.amount)}
                        </span>
                        <span className="text-[10px] font-medium text-[var(--color-text-muted)]">
                          {inc.isIncludedInBudget ? 'В бюджете' : 'Не учитывается'}
                        </span>
                      </div>

                      {/* Inclusion Switch */}
                      <div className="flex items-center gap-2">
                        <label className="relative inline-flex items-center cursor-pointer" title={inc.isIncludedInBudget ? "Исключить из бюджета" : "Включить в бюджет"}>
                          <input
                            type="checkbox"
                            checked={inc.isIncludedInBudget}
                            onChange={() => toggleIncomeBudgetInclusion(inc.id)}
                            className="sr-only peer"
                          />
                          <div className="w-8 h-4 bg-zinc-300 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all dark:border-zinc-600 peer-checked:bg-emerald-600"></div>
                        </label>

                        {/* Delete button */}
                        <button
                          onClick={() => deleteIncome(inc.id)}
                          className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-all cursor-pointer"
                          title="Удалить запись о поступлении"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick preset buttons to add common manual income types */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[var(--color-border-subtle)] mt-1">
            <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mr-1">
              Быстрый ввод:
            </span>
            <button
              onClick={() => handleOpenAddManual('cash')}
              className="px-2 py-1 rounded-lg bg-[var(--color-bg-card-subtle)] hover:bg-[var(--color-bg-card-muted)] text-[var(--color-text-secondary)] text-[11px] font-semibold border border-[var(--color-border-subtle)] flex items-center gap-1 cursor-pointer"
            >
              <Banknote className="w-3 h-3 text-amber-500" />
              <span>Наличные</span>
            </button>
            <button
              onClick={() => handleOpenAddManual('freelance')}
              className="px-2 py-1 rounded-lg bg-[var(--color-bg-card-subtle)] hover:bg-[var(--color-bg-card-muted)] text-[var(--color-text-secondary)] text-[11px] font-semibold border border-[var(--color-border-subtle)] flex items-center gap-1 cursor-pointer"
            >
              <Briefcase className="w-3 h-3 text-emerald-500" />
              <span>Подработка</span>
            </button>
            <button
              onClick={() => handleOpenAddManual('debt_return')}
              className="px-2 py-1 rounded-lg bg-[var(--color-bg-card-subtle)] hover:bg-[var(--color-bg-card-muted)] text-[var(--color-text-secondary)] text-[11px] font-semibold border border-[var(--color-border-subtle)] flex items-center gap-1 cursor-pointer"
            >
              <Handshake className="w-3 h-3 text-blue-500" />
              <span>Возврат долга</span>
            </button>
            <button
              onClick={() => handleOpenAddManual('gift')}
              className="px-2 py-1 rounded-lg bg-[var(--color-bg-card-subtle)] hover:bg-[var(--color-bg-card-muted)] text-[var(--color-text-secondary)] text-[11px] font-semibold border border-[var(--color-border-subtle)] flex items-center gap-1 cursor-pointer"
            >
              <Gift className="w-3 h-3 text-pink-500" />
              <span>Подарок</span>
            </button>
          </div>
        </div>
      )}

      {/* Add Manual Income Modal */}
      <AddManualIncomeModal
        isOpen={isAddManualOpen}
        onClose={() => setIsAddManualOpen(false)}
        initialSource={selectedInitialSource}
      />
    </div>
  );
};
