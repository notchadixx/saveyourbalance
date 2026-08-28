import React, { useState, useEffect } from 'react';
import { useBudget, formatRubles } from '../context/BudgetContext';
import { X, Wallet, Calculator, Check, Sparkles, AlertCircle } from 'lucide-react';

interface EditBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EditBudgetModal: React.FC<EditBudgetModalProps> = ({ isOpen, onClose }) => {
  const { state, totalPlannedSum, updateBudgetSettings } = useBudget();

  const [totalBudget, setTotalBudget] = useState(state.total30DaysBudget.toString());
  const [salary, setSalary] = useState(state.currentSalary.toString());
  const [cushionDeposit, setCushionDeposit] = useState(state.safetyCushionDeposit.toString());
  const [rollover, setRollover] = useState(state.previousMonthRemainder.toString());

  // Reset values when modal opens
  useEffect(() => {
    if (isOpen) {
      setTotalBudget(state.total30DaysBudget.toString());
      setSalary(state.currentSalary.toString());
      setCushionDeposit(state.safetyCushionDeposit.toString());
      setRollover(state.previousMonthRemainder.toString());
    }
  }, [isOpen, state]);

  if (!isOpen) return null;

  const numTotalBudget = parseFloat(totalBudget.replace(/\s+/g, '').replace(',', '.')) || 0;
  const numSalary = parseFloat(salary.replace(/\s+/g, '').replace(',', '.')) || 0;
  const numCushion = parseFloat(cushionDeposit.replace(/\s+/g, '').replace(',', '.')) || 0;
  const numRollover = parseFloat(rollover.replace(/\s+/g, '').replace(',', '.')) || 0;

  // Live calculations
  const previewFreeDiscretionary = Math.max(0, numTotalBudget - totalPlannedSum - numCushion);
  const previewDailyNorm = previewFreeDiscretionary > 0 ? previewFreeDiscretionary / 30 : 0;

  const handleAutoSumBudget = () => {
    const sum = numSalary + numRollover;
    setTotalBudget(sum.toFixed(2));
  };

  const handleSet10PercentCushion = () => {
    const tenPercent = numSalary * 0.1;
    setCushionDeposit(tenPercent.toFixed(2));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(numTotalBudget) || numTotalBudget < 0) return;

    updateBudgetSettings(numTotalBudget, numRollover, numCushion, numSalary);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-[var(--color-bg-card)] w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border border-[var(--color-border)] animate-in fade-in slide-in-from-bottom-6 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center pb-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[var(--color-accent-badge-bg)] text-[var(--color-accent)] flex items-center justify-center font-bold">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--color-text-main)]">
                Редактирование бюджета
              </h3>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                Настройки лимитов и базовых сумм на 30 дней
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[var(--color-bg-card-subtle)] text-[var(--color-text-muted)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
          {/* Main 30-Day Budget */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                Общий бюджет на 30 дней (B1)
              </label>
              <button
                type="button"
                onClick={handleAutoSumBudget}
                className="text-[11px] font-semibold text-[var(--color-accent)] hover:underline flex items-center gap-1"
              >
                <Calculator className="w-3 h-3" />
                З/п + Остаток ({formatRubles(numSalary + numRollover)})
              </button>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                required
                value={totalBudget}
                onChange={(e) => setTotalBudget(e.target.value)}
                className="w-full text-xl font-extrabold text-[var(--color-text-main)] bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                placeholder="135 789.69"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-bold text-[var(--color-text-muted)]">
                ₽
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Salary */}
            <div>
              <label className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">
                Зарплата / Доход (₽)
              </label>
              <input
                type="number"
                step="0.01"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                className="w-full text-sm font-bold text-[var(--color-text-main)] bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                placeholder="82 650.00"
              />
            </div>

            {/* Rollover from last month */}
            <div>
              <label className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">
                Остаток прошл. месяца (₽)
              </label>
              <input
                type="number"
                step="0.01"
                value={rollover}
                onChange={(e) => setRollover(e.target.value)}
                className="w-full text-sm font-bold text-[var(--color-text-main)] bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                placeholder="11 803.76"
              />
            </div>
          </div>

          {/* Cushion deposit */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                Взнос в подушку безопасности (B3)
              </label>
              <button
                type="button"
                onClick={handleSet10PercentCushion}
                className="text-[11px] font-semibold text-[var(--color-accent)] hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                10% от дохода ({formatRubles(numSalary * 0.1)})
              </button>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                value={cushionDeposit}
                onChange={(e) => setCushionDeposit(e.target.value)}
                className="w-full text-sm font-bold text-[var(--color-text-main)] bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                placeholder="8 265.00"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--color-text-muted)]">
                ₽
              </span>
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="p-3.5 rounded-2xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border)] flex flex-col gap-2">
            <span className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              Расчет формул Google Таблицы:
            </span>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div className="p-2 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)]">
                <span className="text-[10px] text-[var(--color-text-muted)] block">Плановые статьи (B4:B20)</span>
                <span className="font-bold text-[var(--color-text-main)]">{formatRubles(totalPlannedSum)}</span>
              </div>

              <div className="p-2 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)]">
                <span className="text-[10px] text-[var(--color-text-muted)] block">Свободно на прочее (D1)</span>
                <span className="font-bold text-[var(--color-accent)]">{formatRubles(previewFreeDiscretionary)}</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-[var(--color-accent-badge-bg)] border border-[var(--color-accent-badge-border)] flex items-center justify-between text-xs mt-1">
              <div>
                <span className="font-bold text-[var(--color-text-main)] block">
                  Новый дневной лимит (E1):
                </span>
                <span className="text-[10px] text-[var(--color-text-secondary)]">
                  D1 / 30 дней
                </span>
              </div>
              <span className="text-base font-extrabold text-[var(--color-accent)]">
                {formatRubles(previewDailyNorm)}/день
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-[var(--color-bg-card-subtle)] hover:bg-[var(--color-bg-card-muted)] text-[var(--color-text-secondary)] font-bold text-xs rounded-xl border border-[var(--color-border)] transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="flex-2 py-3 bg-[#006d37] dark:bg-[#10b981] hover:bg-[#005228] dark:hover:bg-[#059669] text-white dark:text-[#041627] rounded-xl font-bold text-xs shadow-md active:scale-98 transition-all flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Сохранить бюджет</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
