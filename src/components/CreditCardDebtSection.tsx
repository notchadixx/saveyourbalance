import React, { useState } from 'react';
import { useBudget, formatRubles } from '../context/BudgetContext';
import { CreditCard } from '../types';
import { formatDate } from '../utils/dateUtils';
import { 
  CreditCard as CreditCardIcon, 
  TrendingDown, 
  CheckCircle2, 
  Edit3, 
  Trash2, 
  Plus, 
  Calendar, 
  Check, 
  X,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Percent
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const CreditCardDebtSection: React.FC = () => {
  const { state, updateCreditCard, updateCreditCardDebt, removeCreditCard, addCreditCard } = useBudget();
  const debtCards = (state.creditCards || []).filter(c => c.strategy === 'debt');

  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [newDebtVal, setNewDebtVal] = useState<string>('');
  const [newMonthlyPayVal, setNewMonthlyPayVal] = useState<string>('');

  if (debtCards.length === 0) {
    return null;
  }

  const totalDebt = debtCards.reduce((sum, c) => sum + (c.isPaidOff ? 0 : c.currentDebt), 0);
  const totalMonthlyPayments = debtCards.reduce((sum, c) => sum + (c.isPaidOff ? 0 : (c.monthlyPayment || 0)), 0);

  const handleStartEdit = (card: CreditCard) => {
    setEditingCardId(card.id);
    setNewDebtVal(card.currentDebt.toString());
    setNewMonthlyPayVal((card.monthlyPayment || 0).toString());
  };

  const handleSaveEdit = (cardId: string) => {
    const debtNum = parseFloat(newDebtVal.replace(/\s/g, '').replace(',', '.'));
    const payNum = parseFloat(newMonthlyPayVal.replace(/\s/g, '').replace(',', '.'));

    const updates: Partial<CreditCard> = {};
    if (!isNaN(debtNum)) {
      updates.currentDebt = Math.max(0, debtNum);
    }
    if (!isNaN(payNum) && payNum >= 0) {
      updates.monthlyPayment = payNum;
    }

    updateCreditCard(cardId, updates);
    setEditingCardId(null);
  };

  const handlePayOff = (cardId: string) => {
    updateCreditCardDebt(cardId, 0);
  };

  return (
    <section className="bg-[var(--color-bg-card)] rounded-2xl p-4 shadow-xs border border-indigo-200/60 dark:border-indigo-900/40 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <TrendingDown className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider">
              Долговые кредитные карты ({debtCards.length})
            </h3>
            <p className="text-[10px] text-[var(--color-text-muted)]">
              Платежи автоматически заложены в бюджет для закрытия задолженности
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-[var(--color-text-muted)] block">Всего долг:</span>
          <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
            {formatRubles(totalDebt)}
          </span>
        </div>
      </div>

      {/* Cards List */}
      <div className="space-y-3">
        {debtCards.map(card => {
          const isEditing = editingCardId === card.id;
          const initial = card.initialDebt && card.initialDebt > 0 ? card.initialDebt : Math.max(card.currentDebt, 1);
          const repaidAmount = Math.max(0, initial - card.currentDebt);
          const repaidPercent = Math.min(100, Math.max(0, Math.round((repaidAmount / initial) * 100)));
          const isPaidOff = card.isPaidOff || card.currentDebt <= 0;

          return (
            <div 
              key={card.id}
              className={`p-3.5 rounded-xl border transition-all ${
                isPaidOff 
                  ? 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/20'
                  : 'border-[var(--color-border)] bg-[var(--color-bg-card-subtle)]'
              }`}
            >
              {/* Card Title & Badges */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <CreditCardIcon className={`w-4 h-4 shrink-0 ${isPaidOff ? 'text-emerald-500' : 'text-indigo-600 dark:text-indigo-400'}`} />
                  <span className="text-xs font-bold text-[var(--color-text-main)] truncate">
                    {card.bankName} <span className="text-[var(--color-text-muted)]">{card.cardMask}</span>
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {isPaidOff ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="w-3 h-3" />
                      Погашена
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                      В процессе
                    </span>
                  )}
                </div>
              </div>

              {/* Progress and Numbers */}
              <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                <div>
                  <span className="text-[10px] text-[var(--color-text-muted)] block">Остаток долга:</span>
                  <span className="font-bold text-[var(--color-text-main)] text-sm">
                    {formatRubles(card.currentDebt)}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-[var(--color-text-muted)] block">Платёж в месяц:</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {formatRubles(card.monthlyPayment || 0)}/мес
                  </span>
                </div>
              </div>

              {/* Repayment Progress Bar */}
              <div className="space-y-1 mb-2.5">
                <div className="flex justify-between items-center text-[10px] text-[var(--color-text-muted)]">
                  <span>Прогресс погашения:</span>
                  <span className="font-bold text-[var(--color-text-main)]">{repaidPercent}%</span>
                </div>
                <div className="w-full bg-[var(--color-bg-card-muted)] h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${repaidPercent}%` }}
                  />
                </div>
              </div>

              {/* Edit form or Action buttons */}
              {!isEditing ? (
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--color-border)]/60 text-[11px]">
                  <div className="flex items-center gap-2">
                    {!isPaidOff && (
                      <button
                        type="button"
                        onClick={() => handlePayOff(card.id)}
                        className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                        title="Отметить карту полностью погашенной"
                      >
                        Погашена
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(card)}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Обновить остаток</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeCreditCard(card.id)}
                      className="p-1 text-gray-400 hover:text-red-500 rounded-md transition-colors"
                      title="Удалить карту и плановую статью"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Inline Quick Edit for Debt and Monthly Payment */
                <div className="pt-2 border-t border-[var(--color-border)] space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-[var(--color-text-muted)] mb-0.5">
                        Текущий остаток долга (₽)
                      </label>
                      <input
                        type="number"
                        value={newDebtVal}
                        onChange={(e) => setNewDebtVal(e.target.value)}
                        className="w-full text-xs font-semibold px-2 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text-main)]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[var(--color-text-muted)] mb-0.5">
                        Платёж в бюджет (₽/мес)
                      </label>
                      <input
                        type="number"
                        value={newMonthlyPayVal}
                        onChange={(e) => setNewMonthlyPayVal(e.target.value)}
                        className="w-full text-xs font-semibold px-2 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text-main)]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingCardId(null)}
                      className="text-[11px] px-2.5 py-1 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-border)]/40"
                    >
                      Отмена
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(card.id)}
                      className="text-[11px] font-bold px-3 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      <span>Сохранить</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
