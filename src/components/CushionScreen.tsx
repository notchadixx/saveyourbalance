import React, { useState } from 'react';
import { useBudget, formatRubles } from '../context/BudgetContext';
import { 
  PiggyBank, 
  Percent, 
  Sparkles,
  Landmark,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BankSyncModal } from './BankSyncModal';

interface CushionScreenProps {
  onOpenDepositModal: () => void;
}

export const CushionScreen: React.FC<CushionScreenProps> = () => {
  const { 
    state, 
    cushionProgressPercent, 
    depositToCushion, 
    totalSavingsBankBalance,
    reconcileCushionWithBank,
    isBankSyncing
  } = useBudget();

  const [selectedBankRate, setSelectedBankRate] = useState<'alfa' | 'sber'>('alfa');
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [reconcileFeedback, setReconcileFeedback] = useState<string | null>(null);

  const totalMandatorySum = state.mandatoryExpenses.reduce((sum, item) => sum + item.amount, 0);
  const target3Months = totalMandatorySum * 3;

  // Monthly capitalization calculation
  const annualRate = selectedBankRate === 'alfa' ? 0.135 : 0.10;
  const monthlyEarn = (state.cushionAccumulated * annualRate) / 12;

  const handleQuickDeposit = (amount: number) => {
    depositToCushion(amount);
  };

  const handleReconcileBankSavings = () => {
    const res = reconcileCushionWithBank();
    setReconcileFeedback(res.message);
    setTimeout(() => setReconcileFeedback(null), 4000);
  };

  const savingsAccount = (state.bankAccounts || []).find(a => a.accountType === 'savings');

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
              {formatRubles(state.cushionAccumulated, { showCents: true })}
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              Цель: <strong className="text-[var(--color-text-main)]">{formatRubles(state.cushionTargetAmount, { showCents: true })}</strong> (3 месяца жизни)
            </p>
          </div>

          <div className="text-right">
            <span className="text-2xl font-black text-[var(--color-text-main)]">
              {cushionProgressPercent.toFixed(1)}%
            </span>
            <span className="text-[10px] text-[var(--color-text-muted)] block font-semibold uppercase">Накоплено</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-3 bg-[var(--color-bg-card-muted)] rounded-full overflow-hidden my-3 border border-[var(--color-border-subtle)]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, cushionProgressPercent)}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-light)] rounded-full"
          />
        </div>

        {/* Grid Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-3 border-t border-[var(--color-border)] text-xs">
          <div className="bg-[var(--color-bg-card-subtle)] p-2.5 rounded-xl border border-[var(--color-border-subtle)]">
            <span className="text-[10px] text-[var(--color-text-muted)] block font-bold uppercase">Текущая зарплата</span>
            <span className="text-sm font-bold text-[var(--color-text-main)]">
              {formatRubles(state.currentSalary)}
            </span>
          </div>

          <div className="bg-[var(--color-bg-card-subtle)] p-2.5 rounded-xl border border-[var(--color-border-subtle)]">
            <span className="text-[10px] text-[var(--color-text-muted)] block font-bold uppercase">Взнос в месяц (10%)</span>
            <span className="text-sm font-bold text-[var(--color-accent)]">
              {formatRubles(state.safetyCushionDeposit)}
            </span>
          </div>

          <div className="bg-[var(--color-bg-card-subtle)] p-2.5 rounded-xl border border-[var(--color-border-subtle)] col-span-2 sm:col-span-1">
            <span className="text-[10px] text-[var(--color-text-muted)] block font-bold uppercase">Дата достижения</span>
            <span className="text-sm font-bold text-[var(--color-text-main)]">
              Декабрь 2027
            </span>
          </div>
        </div>
      </motion.div>

      {/* 2. BANK SAVINGS ACCOUNT RECONCILIATION CARD */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[var(--color-bg-card)] rounded-2xl p-4 shadow-xs border-2 border-rose-500/20 flex flex-col gap-3"
      >
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider flex items-center gap-1.5">
                <span>Сверка с накопительным счётом банка</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold lowercase">
                  13.5% годовых
                </span>
              </h3>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                {savingsAccount ? `${savingsAccount.bankName} (${savingsAccount.accountName} ${savingsAccount.accountNumberMask})` : 'Альфа-Банк Накопительный счет'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsBankModalOpen(true)}
            className="text-[11px] font-bold text-[var(--color-accent)] hover:underline"
          >
            Настроить
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)]">
            <span className="text-[10px] text-[var(--color-text-muted)] font-medium block">
              Баланс накопительного счета
            </span>
            <span className="text-base font-extrabold text-[var(--color-text-main)]">
              {formatRubles(totalSavingsBankBalance, { showCents: true })}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)]">
            <span className="text-[10px] text-[var(--color-text-muted)] font-medium block">
              Капитализация процентов
            </span>
            <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
              +{formatRubles(state.cushionSchedule[0]?.capitalization || 4.53, { showCents: true })}
            </span>
          </div>
        </div>

        {/* 1-Click Reconcile Button */}
        <button
          onClick={handleReconcileBankSavings}
          disabled={isBankSyncing}
          className="w-full py-2.5 rounded-xl bg-[#006d37] dark:bg-[#10b981] text-white dark:text-[#041627] text-xs font-bold shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isBankSyncing ? 'animate-spin' : ''}`} />
          <span>Сверить с накопительным счётом банка и зачислить капитализацию</span>
        </button>

        <AnimatePresence>
          {reconcileFeedback && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{reconcileFeedback}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* 3. Quick Deposit Actions */}
      <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 shadow-xs border border-[var(--color-border)] flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider flex items-center gap-1.5">
            <PiggyBank className="w-4 h-4 text-[var(--color-accent)]" />
            Пополнить подушку
          </h3>
          <span className="text-[11px] text-[var(--color-accent)] font-semibold flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            +10% от дохода
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[1000, 5000, 8265].map((amount) => (
            <button
              key={amount}
              onClick={() => handleQuickDeposit(amount)}
              className="py-2.5 px-3 rounded-xl bg-[var(--color-bg-card-subtle)] hover:bg-[var(--color-accent-badge-bg)] hover:border-[var(--color-accent-badge-border)] border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-main)] transition-all flex flex-col items-center justify-center"
            >
              <span>+{formatRubles(amount, { showCents: false })}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Mandatory Monthly Expenses */}
      <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 shadow-xs border border-[var(--color-border)] flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-[var(--color-text-main)]">
              Обязательные расходы в месяц
            </h3>
            <p className="text-xs text-[var(--color-text-muted)]">
              Базовый минимум для расчета подушки
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
          {state.mandatoryExpenses.map((exp) => (
            <div key={exp.id} className="py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />
                <span className="font-semibold text-[var(--color-text-main)]">{exp.title}</span>
              </div>
              <span className="font-bold text-[var(--color-text-main)]">{formatRubles(exp.amount)}</span>
            </div>
          ))}
        </div>

        <div className="bg-[var(--color-bg-card-subtle)] p-3 rounded-xl flex justify-between items-center text-xs border border-[var(--color-border)]">
          <span className="font-medium text-[var(--color-text-secondary)]">Размер подушки (3 месяца):</span>
          <span className="font-extrabold text-[var(--color-accent)]">{formatRubles(target3Months)}</span>
        </div>
      </div>

      {/* 5. Bank Rates & Capitalization */}
      <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 shadow-xs border border-[var(--color-border)] flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-[var(--color-text-main)] flex items-center gap-1.5">
            <Percent className="w-4 h-4 text-[var(--color-accent)]" />
            Банковские ставки и капитализация
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setSelectedBankRate('alfa')}
            className={`p-3 rounded-xl border text-left transition-all ${
              selectedBankRate === 'alfa'
                ? 'border-[var(--color-accent)] bg-[var(--color-accent-badge-bg)] ring-1 ring-[var(--color-accent)]'
                : 'border-[var(--color-border)] bg-[var(--color-bg-card-subtle)]'
            }`}
          >
            <div className="text-xs font-bold text-[var(--color-text-main)]">Альфа-Банк</div>
            <div className="text-lg font-extrabold text-[var(--color-accent)] mt-0.5">13.5%</div>
            <div className="text-[10px] text-[var(--color-text-muted)]">Накопительный счет</div>
          </button>

          <button
            onClick={() => setSelectedBankRate('sber')}
            className={`p-3 rounded-xl border text-left transition-all ${
              selectedBankRate === 'sber'
                ? 'border-[var(--color-accent)] bg-[var(--color-accent-badge-bg)] ring-1 ring-[var(--color-accent)]'
                : 'border-[var(--color-border)] bg-[var(--color-bg-card-subtle)]'
            }`}
          >
            <div className="text-xs font-bold text-[var(--color-text-main)]">Сбербанк</div>
            <div className="text-lg font-extrabold text-[var(--color-text-main)] mt-0.5">10.0%</div>
            <div className="text-[10px] text-[var(--color-text-muted)]">Счет Ежедневный %</div>
          </button>
        </div>

        <div className="bg-[#1a2b3c] dark:bg-[#1e293b] text-white p-3 rounded-xl flex justify-between items-center text-xs border border-transparent dark:border-[var(--color-border)]">
          <div>
            <span className="text-[#8192a7] dark:text-[#94a3b8] block text-[10px] uppercase font-bold">Процентный доход</span>
            <span className="font-bold">Текущая капитализация:</span>
          </div>
          <span className="text-base font-extrabold text-[#6bfe9c] dark:text-[#34d399]">
            +{formatRubles(monthlyEarn, { showCents: true })} / мес
          </span>
        </div>
      </div>

      {/* 6. Forecast Schedule Table */}
      <div className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] overflow-hidden shadow-xs">
        <div className="p-3 bg-[var(--color-bg-card-subtle)] border-b border-[var(--color-border)] flex justify-between items-center">
          <h4 className="text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider">
            План накоплений (2026 – 2030)
          </h4>
          <span className="text-[10px] font-semibold text-[var(--color-accent-badge-text)] bg-[var(--color-accent-badge-bg)] border border-[var(--color-accent-badge-border)] px-2 py-0.5 rounded-full">
            +8 265 ₽ / мес
          </span>
        </div>

        <div className="overflow-x-auto max-h-72">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#041627] dark:bg-[#152e22] text-white sticky top-0 z-10">
              <tr>
                <th className="py-2 px-3 font-semibold">Месяц</th>
                <th className="py-2 px-3 font-semibold text-right">Цель на период</th>
                <th className="py-2 px-3 font-semibold text-right">Доход в подушку</th>
                <th className="py-2 px-3 font-semibold text-right">Баланс</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-subtle)]">
              {state.cushionSchedule.slice(0, 16).map((plan, idx) => (
                <tr key={`${plan.year}-${plan.monthName}`} className={idx === 0 ? 'bg-[var(--color-accent-badge-bg)] font-bold' : idx % 2 === 0 ? 'bg-[var(--color-bg-card)]' : 'bg-[var(--color-bg-card-subtle)]'}>
                  <td className="py-2 px-3 text-[var(--color-text-main)]">
                    {plan.monthName} {plan.year} {idx === 0 && <span className="text-[var(--color-accent)] text-[10px] ml-1">(Текущий)</span>}
                  </td>
                  <td className="py-2 px-3 text-right text-[var(--color-text-secondary)]">
                    {formatRubles(plan.targetAccumulated)}
                  </td>
                  <td className="py-2 px-3 text-right text-[var(--color-accent)]">
                    {plan.monthlyDeposit > 0 ? formatRubles(plan.monthlyDeposit) : '—'}
                  </td>
                  <td className="py-2 px-3 text-right font-semibold text-[var(--color-text-main)]">
                    {plan.balance > 0 ? formatRubles(plan.balance) : '—'}
                  </td>
                </tr>
              ))}
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
