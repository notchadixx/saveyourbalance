import React from 'react';
import { useBudget, formatRubles } from '../context/BudgetContext';
import { daysUntil, formatDate } from '../utils/dateUtils';
import { 
  CreditCard as CreditCardIcon, 
  TrendingDown, 
  Sparkles, 
  AlertTriangle, 
  Clock, 
  ShieldCheck, 
  Percent,
  Calendar,
  CheckCircle2
} from 'lucide-react';

export const CreditCardAnalyticsWidget: React.FC = () => {
  const { state } = useBudget();
  const creditCards = state.creditCards || [];

  if (creditCards.length === 0) {
    return null;
  }

  const totalLimit = creditCards.reduce((sum, c) => sum + c.creditLimit, 0);
  const totalDebt = creditCards.reduce((sum, c) => sum + (c.isPaidOff ? 0 : c.currentDebt), 0);
  const totalUtilization = totalLimit > 0 ? Math.round((totalDebt / totalLimit) * 100) : 0;

  const debtCards = creditCards.filter(c => c.strategy === 'debt');
  const optimizerCards = creditCards.filter(c => c.strategy === 'optimizer');

  const totalMonthlyDebtPayments = debtCards.reduce((sum, c) => sum + (c.isPaidOff ? 0 : (c.monthlyPayment || 0)), 0);

  return (
    <div className="bg-[var(--color-bg-card)] rounded-3xl p-5 shadow-xs border border-[var(--color-border)] flex flex-col gap-4">
      {/* Widget Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <CreditCardIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--color-text-main)]">
              Аналитика кредитных карт
            </h3>
            <p className="text-xs text-[var(--color-text-muted)]">
              Карты: {creditCards.length} (долг: {debtCards.length}, грейс: {optimizerCards.length})
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-[var(--color-text-muted)] block font-semibold uppercase">
            Утилизация лимита
          </span>
          <span className={`text-base font-extrabold ${
            totalUtilization > 70 ? 'text-red-500' : totalUtilization > 35 ? 'text-amber-500' : 'text-emerald-500'
          }`}>
            {totalUtilization}%
          </span>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <div className="p-3 rounded-2xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)]">
          <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block">
            Общий долг
          </span>
          <span className="text-sm font-extrabold text-[var(--color-text-main)] mt-0.5 block">
            {formatRubles(totalDebt)}
          </span>
          <span className="text-[10px] text-[var(--color-text-muted)]">
            из {formatRubles(totalLimit)} лимита
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)]">
          <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block">
            Платежи в месяц
          </span>
          <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5 block">
            {formatRubles(totalMonthlyDebtPayments)}
          </span>
          <span className="text-[10px] text-[var(--color-text-muted)]">
            вычитается из бюджета
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)] col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block">
            Свободный лимит
          </span>
          <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
            {formatRubles(Math.max(0, totalLimit - totalDebt))}
          </span>
          <span className="text-[10px] text-[var(--color-text-muted)]">
            доступно на картах
          </span>
        </div>
      </div>

      {/* Overall Utilization Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-xs text-[var(--color-text-muted)]">
          <span>Нагрузка на кредитный лимит:</span>
          <span className="font-bold text-[var(--color-text-main)]">{totalUtilization}% ({formatRubles(totalDebt)} / {formatRubles(totalLimit)})</span>
        </div>
        <div className="w-full bg-[var(--color-bg-card-muted)] h-2 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              totalUtilization > 70 ? 'bg-red-500' : totalUtilization > 35 ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${totalUtilization}%` }}
          />
        </div>
      </div>

      {/* Per Card Breakdown */}
      <div className="space-y-2 pt-1">
        <h4 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
          Карты и прогнозы
        </h4>

        <div className="space-y-2">
          {creditCards.map(card => {
            const cardDebt = card.isPaidOff ? 0 : card.currentDebt;
            const cardUtilization = card.creditLimit > 0 ? Math.round((cardDebt / card.creditLimit) * 100) : 0;
            const daysLeft = daysUntil(card.gracePeriodEndDate);

            // Estimated months to payoff for debt cards
            const monthsToPayoff = card.strategy === 'debt' && (card.monthlyPayment || 0) > 0 && cardDebt > 0
              ? Math.ceil(cardDebt / (card.monthlyPayment || 1))
              : null;

            return (
              <div 
                key={card.id}
                className="p-3 rounded-2xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border)] flex flex-col gap-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[var(--color-text-main)]">
                      {card.bankName} {card.cardMask}
                    </span>
                    <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-md ${
                      card.strategy === 'optimizer'
                        ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                        : 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                    }`}>
                      {card.strategy === 'optimizer' ? 'Оптимизатор' : 'Долговая'}
                    </span>
                  </div>

                  <span className="text-xs font-extrabold text-[var(--color-text-main)]">
                    {formatRubles(cardDebt)}
                  </span>
                </div>

                {/* Progress bar per card */}
                <div className="w-full bg-[var(--color-bg-card-muted)] h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      cardUtilization > 70 ? 'bg-red-500' : cardUtilization > 35 ? 'bg-amber-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${cardUtilization}%` }}
                  />
                </div>

                {/* Footnote information */}
                <div className="flex justify-between items-center text-[10px] text-[var(--color-text-muted)]">
                  <span>Лимит: {formatRubles(card.creditLimit)} ({cardUtilization}%)</span>

                  {card.strategy === 'debt' ? (
                    <span>
                      {card.isPaidOff || cardDebt <= 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" />
                          Погашена
                        </span>
                      ) : (
                        <span>
                          Погашение: ~<strong>{monthsToPayoff} {monthsToPayoff === 1 ? 'месяц' : (monthsToPayoff || 0) < 5 ? 'месяца' : 'месяцев'}</strong> ({formatRubles(card.monthlyPayment || 0)}/мес)
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className={daysLeft <= 5 ? 'text-amber-600 dark:text-amber-400 font-bold' : ''}>
                      Грейс: {formatDate(card.gracePeriodEndDate)} ({daysLeft} дн.)
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
