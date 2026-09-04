import React, { useState } from 'react';
import { useBudget, formatRubles } from '../context/BudgetContext';
import { CreditCard } from '../types';
import { daysUntil, formatDate } from '../utils/dateUtils';
import { 
  Sparkles, 
  AlertTriangle, 
  Calendar, 
  CheckCircle2, 
  CreditCard as CreditCardIcon, 
  RefreshCw, 
  ChevronRight,
  TrendingUp,
  X,
  Check,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const CreditCardOptimizerWidget: React.FC = () => {
  const { state, refreshCreditCardGracePeriod, updateCreditCardDebt } = useBudget();
  const optimizerCards = (state.creditCards || []).filter(c => c.strategy === 'optimizer');

  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [newDebtVal, setNewDebtVal] = useState<string>('');
  const [newGraceDateVal, setNewGraceDateVal] = useState<string>('');

  if (optimizerCards.length === 0) {
    return null;
  }

  const handleOpenEdit = (card: CreditCard) => {
    setEditingCardId(card.id);
    setNewDebtVal(card.currentDebt.toString());
    setNewGraceDateVal(card.gracePeriodEndDate || '');
  };

  const handleSaveEdit = (cardId: string) => {
    const debtNum = parseFloat(newDebtVal.replace(/\s/g, '').replace(',', '.'));
    if (!isNaN(debtNum)) {
      updateCreditCardDebt(cardId, debtNum);
    }
    if (newGraceDateVal) {
      refreshCreditCardGracePeriod(cardId, newGraceDateVal);
    }
    setEditingCardId(null);
  };

  return (
    <section className="bg-[var(--color-bg-card)] rounded-2xl p-4 shadow-xs border border-amber-200/60 dark:border-amber-900/40 flex flex-col gap-3 relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider">
              Грейс-контроль карт ({optimizerCards.length})
            </h3>
            <p className="text-[10px] text-[var(--color-text-muted)]">
              Деньги работают на вкладе до окончания грейс-периода
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {optimizerCards.map(card => {
          const daysLeft = daysUntil(card.gracePeriodEndDate);
          const isCritical = daysLeft <= 5;
          const isExpired = daysLeft <= 0;
          const utilizationPct = card.creditLimit > 0 
            ? Math.min(100, Math.round((card.currentDebt / card.creditLimit) * 100))
            : 0;

          const isEditing = editingCardId === card.id;

          return (
            <div 
              key={card.id}
              className={`p-3.5 rounded-xl border transition-all ${
                isExpired
                  ? 'border-red-300 dark:border-red-900 bg-red-50/40 dark:bg-red-950/20'
                  : isCritical
                  ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50/40 dark:bg-amber-950/20'
                  : 'border-[var(--color-border)] bg-[var(--color-bg-card-subtle)]'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <CreditCardIcon className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="text-xs font-bold text-[var(--color-text-main)] truncate">
                    {card.bankName} <span className="text-[var(--color-text-muted)]">{card.cardMask}</span>
                  </span>
                </div>

                {/* Grace Warning / Info Badge */}
                <div className="shrink-0">
                  {isExpired ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300 animate-pulse">
                      <AlertTriangle className="w-3 h-3" />
                      Грейс истёк!
                    </span>
                  ) : isCritical ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200">
                      <Clock className="w-3 h-3 text-amber-600" />
                      Осталось {daysLeft} {daysLeft === 1 ? 'день' : daysLeft < 5 ? 'дня' : 'дней'}!
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[var(--color-text-muted)]">
                      <Calendar className="w-3 h-3" />
                      Грейс до {formatDate(card.gracePeriodEndDate)} ({daysLeft} дн.)
                    </span>
                  )}
                </div>
              </div>

              {/* Debt and Limit info */}
              <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                <div>
                  <span className="text-[10px] text-[var(--color-text-muted)] block">Долг по карте:</span>
                  <span className="font-bold text-[var(--color-text-main)]">
                    {formatRubles(card.currentDebt)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[var(--color-text-muted)] block">Лимит карты:</span>
                  <span className="font-medium text-[var(--color-text-secondary)]">
                    {formatRubles(card.creditLimit)}
                  </span>
                </div>
              </div>

              {/* Utilization progress */}
              <div className="w-full bg-[var(--color-bg-card-muted)] h-1.5 rounded-full overflow-hidden mb-2.5">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    utilizationPct > 80 ? 'bg-red-500' : utilizationPct > 50 ? 'bg-amber-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${utilizationPct}%` }}
                />
              </div>

              {/* Action buttons */}
              {!isEditing ? (
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--color-border)]/60">
                  <span className="text-[10px] text-[var(--color-text-muted)]">
                    Занято: {utilizationPct}% лимита
                  </span>

                  <div className="flex items-center gap-2">
                    {card.currentDebt > 0 && (
                      <button
                        type="button"
                        onClick={() => updateCreditCardDebt(card.id, 0)}
                        className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                        title="Отметить долг полностью погашенным"
                      >
                        Погашено в 0
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(card)}
                      className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      <span>Обновить грейс/долг</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Inline Quick Edit */
                <div className="pt-2 border-t border-[var(--color-border)] space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-[var(--color-text-muted)] mb-0.5">Новый долг (₽)</label>
                      <input
                        type="number"
                        value={newDebtVal}
                        onChange={(e) => setNewDebtVal(e.target.value)}
                        className="w-full text-xs font-semibold px-2 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text-main)]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[var(--color-text-muted)] mb-0.5">Дата грейса</label>
                      <input
                        type="date"
                        value={newGraceDateVal}
                        onChange={(e) => setNewGraceDateVal(e.target.value)}
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
