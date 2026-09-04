import React, { useState } from 'react';
import { useBudget, formatRubles } from '../../context/BudgetContext';
import { useProfile } from '../../context/ProfileContext';
import { Calendar, DollarSign, Shield, Info, AlertTriangle, Check, RefreshCw } from 'lucide-react';

interface EditFinancialProfileProps {
  onBack: () => void;
  showToast: (msg: string) => void;
}

export const EditFinancialProfile: React.FC<EditFinancialProfileProps> = ({ onBack, showToast }) => {
  const { state, updateFinancialProfileState, startNewPeriod } = useBudget();
  const { profile, setProfile } = useProfile();

  const [salaryDay, setSalaryDay] = useState<number>(state.salaryDateDay || profile?.mainSalaryDate || 5);
  const [hasAdvance, setHasAdvance] = useState<boolean>(Boolean(state.advanceDateDay || profile?.advanceDate));
  const [advanceDay, setAdvanceDay] = useState<number>(state.advanceDateDay || profile?.advanceDate || 20);
  const [salaryAmount, setSalaryAmount] = useState<string>(String(state.currentSalary || profile?.fixedPartAmount || 82650));
  const [cushionMode, setCushionMode] = useState<'percent' | 'fixed'>(state.cushionNormMode || 'percent');
  const [cushionPercent, setCushionPercent] = useState<string>(String(state.cushionNormPercent ?? 10));
  const [cushionFixed, setCushionFixed] = useState<string>(String(state.cushionNormFixedAmount ?? 8265));
  const [includeAdvance, setIncludeAdvance] = useState<boolean>(state.includeAdvanceInBudget ?? (profile?.advanceTreatment === 'include'));
  const [shouldRecalculatePeriod, setShouldRecalculatePeriod] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const parsedSalary = parseFloat(salaryAmount) || 0;
  const parsedPercent = parseFloat(cushionPercent) || 10;
  const parsedFixed = parseFloat(cushionFixed) || 0;

  const calculatedMonthlyCushion = cushionMode === 'percent'
    ? Math.round(parsedSalary * (parsedPercent / 100))
    : parsedFixed;

  const handleSave = () => {
    setError(null);

    if (salaryDay < 1 || salaryDay > 31) {
      setError('День зарплаты должен быть от 1 до 31');
      return;
    }

    if (hasAdvance) {
      if (advanceDay < 1 || advanceDay > 31) {
        setError('День аванса должен быть от 1 до 31');
        return;
      }
      if (advanceDay === salaryDay) {
        setError('День аванса не может совпадать с днем зарплаты');
        return;
      }
    }

    if (parsedSalary <= 0) {
      setError('Сумма зарплаты должна быть больше нуля');
      return;
    }

    // Обновляем финансовый профиль в ProfileContext
    if (profile) {
      const updatedProf = {
        ...profile,
        mainSalaryDate: salaryDay,
        advanceDate: hasAdvance ? advanceDay : undefined,
        fixedPartAmount: parsedSalary,
        advanceTreatment: includeAdvance ? ('include' as const) : ('separate' as const),
        periodStartDay: salaryDay,
      };
      setProfile(updatedProf);
    }

    // Обновляем состояние в BudgetContext
    updateFinancialProfileState({
      salaryDateDay: salaryDay,
      advanceDateDay: hasAdvance ? advanceDay : undefined,
      currentSalary: parsedSalary,
      hasAdvance,
      cushionNormMode: cushionMode,
      cushionNormPercent: parsedPercent,
      cushionNormFixedAmount: parsedFixed,
      includeAdvanceInBudget: includeAdvance,
      advanceTreatment: includeAdvance ? 'include' : 'separate',
    });

    if (shouldRecalculatePeriod) {
      startNewPeriod({
        newSalary: parsedSalary,
      });
    }

    showToast('Финансовый профиль успешно обновлен');
    onBack();
  };

  return (
    <div className="space-y-5">
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Salary Date & Amount */}
      <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 border border-[var(--color-border)] shadow-xs space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
          <span>Доход и дата зарплаты</span>
        </h4>

        <div>
          <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
            Сумма зарплаты (постоянная часть)
          </label>
          <div className="relative">
            <input
              type="number"
              value={salaryAmount}
              onChange={(e) => setSalaryAmount(e.target.value)}
              placeholder="82650"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)] text-sm font-bold text-[var(--color-text-main)] focus:outline-hidden focus:border-[var(--color-accent)]"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--color-text-muted)]">
              ₽/мес
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
              День зарплаты
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="31"
                value={salaryDay}
                onChange={(e) => setSalaryDay(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)] text-sm font-bold text-[var(--color-text-main)] focus:outline-hidden focus:border-[var(--color-accent)]"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-muted)]">
                число
              </span>
            </div>
            <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
              Начало каждого расчетного периода
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                Есть аванс
              </label>
              <input
                type="checkbox"
                checked={hasAdvance}
                onChange={(e) => setHasAdvance(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
              />
            </div>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="31"
                disabled={!hasAdvance}
                value={advanceDay}
                onChange={(e) => setAdvanceDay(parseInt(e.target.value, 10) || 20)}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-bold focus:outline-hidden focus:border-[var(--color-accent)] ${
                  hasAdvance
                    ? 'bg-[var(--color-bg-card-subtle)] border-[var(--color-border-subtle)] text-[var(--color-text-main)]'
                    : 'bg-gray-100 dark:bg-gray-800 border-transparent text-gray-400 cursor-not-allowed'
                }`}
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-muted)]">
                число
              </span>
            </div>
            <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
              Промежуточный платеж
            </p>
          </div>
        </div>

        {/* Treatment of advance in budget */}
        {hasAdvance && (
          <div className="p-3 rounded-xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)] space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[var(--color-text-main)] block">
                  Учитывать аванс в общем 30-дневном лимите
                </span>
                <span className="text-[11px] text-[var(--color-text-muted)] block">
                  Если выключено, аванс пополняет бюджет только по факту его прихода
                </span>
              </div>
              <input
                type="checkbox"
                checked={includeAdvance}
                onChange={(e) => setIncludeAdvance(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-0 cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>

      {/* Cushion Norm Configuration */}
      <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 border border-[var(--color-border)] shadow-xs space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-blue-500" />
          <span>Норма подушки безопасности</span>
        </h4>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setCushionMode('percent')}
            className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
              cushionMode === 'percent'
                ? 'bg-blue-500/10 border-blue-500/40 text-blue-700 dark:text-blue-300'
                : 'bg-[var(--color-bg-card-subtle)] border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]'
            }`}
          >
            % от зарплаты
          </button>
          <button
            onClick={() => setCushionMode('fixed')}
            className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
              cushionMode === 'fixed'
                ? 'bg-blue-500/10 border-blue-500/40 text-blue-700 dark:text-blue-300'
                : 'bg-[var(--color-bg-card-subtle)] border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]'
            }`}
          >
            Фиксированная сумма
          </button>
        </div>

        {cushionMode === 'percent' ? (
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
              Процент ежемесячного отчисления
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="100"
                value={cushionPercent}
                onChange={(e) => setCushionPercent(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)] text-sm font-bold text-[var(--color-text-main)] focus:outline-hidden focus:border-[var(--color-accent)]"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--color-text-muted)]">
                %
              </span>
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
              Фиксированная сумма в месяц
            </label>
            <div className="relative">
              <input
                type="number"
                value={cushionFixed}
                onChange={(e) => setCushionFixed(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)] text-sm font-bold text-[var(--color-text-main)] focus:outline-hidden focus:border-[var(--color-accent)]"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--color-text-muted)]">
                ₽
              </span>
            </div>
          </div>
        )}

        <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-200 flex items-start justify-between">
          <span>Расчетный ежемесячный взнос в подушку:</span>
          <span className="font-extrabold">{formatRubles(calculatedMonthlyCushion)}</span>
        </div>
      </div>

      {/* Recalculate Period Option */}
      <div className="p-3.5 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)] shadow-xs flex items-center justify-between">
        <div className="pr-3">
          <span className="text-xs font-bold text-[var(--color-text-main)] block">
            Пересоздать текущий расчетный период
          </span>
          <span className="text-[11px] text-[var(--color-text-muted)] block">
            Сбросит календарь текущего месяца под новые даты и сумму
          </span>
        </div>
        <input
          type="checkbox"
          checked={shouldRecalculatePeriod}
          onChange={(e) => setShouldRecalculatePeriod(e.target.checked)}
          className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
        />
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        className="w-full py-3 rounded-xl bg-[var(--color-accent)] hover:opacity-90 text-white font-bold text-sm shadow-sm transition-all active:scale-98 flex items-center justify-center gap-2"
      >
        <Check className="w-4 h-4" />
        <span>Сохранить финансовый профиль</span>
      </button>
    </div>
  );
};
