import React, { useState, useMemo, useEffect } from 'react';
import { useProfile } from '../../../context/ProfileContext';
import { useBudget, formatRubles, calculateMonthlyCushionNorm } from '../../../context/BudgetContext';
import { CheckCircle, Calendar, Wallet, CreditCard, Sparkles, ShoppingBasket, ShoppingBag, ShieldAlert, PiggyBank } from 'lucide-react';
import { CushionConfig } from '../../../types';
import { calculateBudgetNorms } from '../../../utils/normCalculator';
import { generatePeriodTemplateForMonth } from '../../../utils/periodUtils';
import { getTodayDateString } from '../../../mockData';

const PROFILE_LABELS: Record<string, string> = {
  stable: 'Стабильный оклад',
  salary_advance: 'Зарплата + аванс',
  variable: 'Оклад + переменная часть',
  irregular: 'Плавающий график',
  freelance: 'Самозанятый / Фриланс',
};

interface Props {
  onNext: () => void;
  onPrev: () => void;
  isFirst: boolean;
  isLast: boolean;
  cushionConfig?: CushionConfig;
  onCushionConfigChange?: (config: CushionConfig) => void;
}

export const ConfirmationStep: React.FC<Props> = ({ cushionConfig, onCushionConfigChange }) => {
  const { profile } = useProfile();
  const { state } = useBudget();
  const profileType = profile?.profileType || 'salary_advance';
  const label = PROFILE_LABELS[profileType] || profileType;
  const food = state.foodControl;

  // Настройки финансовой подушки
  const [isCushionEnabled, setIsCushionEnabled] = useState<boolean>(cushionConfig?.isCushionEnabled ?? true);
  const [normMode, setNormMode] = useState<'percent' | 'fixed'>(cushionConfig?.cushionNormMode ?? 'percent');
  const [normPercent, setNormPercent] = useState<number>(cushionConfig?.cushionNormPercent ?? 10);
  const [normPercentInput, setNormPercentInput] = useState<string>((cushionConfig?.cushionNormPercent ?? 10).toString());
  const [normFixedAmount, setNormFixedAmount] = useState<number>(cushionConfig?.cushionNormFixedAmount ?? 8000);
  const [normFixedInput, setNormFixedInput] = useState<string>((cushionConfig?.cushionNormFixedAmount ?? 8000).toString());

  // Синхронизация с родительским OnboardingFlow
  const notifyConfigChange = (
    enabled: boolean,
    mode: 'percent' | 'fixed',
    pct: number,
    fixed: number
  ) => {
    onCushionConfigChange?.({
      isCushionEnabled: enabled,
      cushionNormMode: mode,
      cushionNormPercent: pct,
      cushionNormFixedAmount: fixed,
    });
  };

  const handleToggleCushion = (enabled: boolean) => {
    setIsCushionEnabled(enabled);
    notifyConfigChange(enabled, normMode, normPercent, normFixedAmount);
  };

  const handleModeChange = (mode: 'percent' | 'fixed') => {
    setNormMode(mode);
    notifyConfigChange(isCushionEnabled, mode, normPercent, normFixedAmount);
  };

  const handlePercentQuickSelect = (pct: number) => {
    setNormPercent(pct);
    setNormPercentInput(pct.toString());
    notifyConfigChange(isCushionEnabled, 'percent', pct, normFixedAmount);
  };

  const handlePercentInputChange = (valStr: string) => {
    setNormPercentInput(valStr);
    const parsed = parseFloat(valStr.replace(',', '.'));
    if (!isNaN(parsed) && parsed >= 0) {
      setNormPercent(parsed);
      notifyConfigChange(isCushionEnabled, normMode, parsed, normFixedAmount);
    }
  };

  const handleFixedQuickSelect = (amt: number) => {
    setNormFixedAmount(amt);
    setNormFixedInput(amt.toString());
    notifyConfigChange(isCushionEnabled, 'fixed', normPercent, amt);
  };

  const handleFixedInputChange = (valStr: string) => {
    setNormFixedInput(valStr);
    const parsed = parseFloat(valStr.replace(/\s+/g, '').replace(',', '.'));
    if (!isNaN(parsed) && parsed >= 0) {
      setNormFixedAmount(parsed);
      notifyConfigChange(isCushionEnabled, normMode, normPercent, parsed);
    }
  };

  const baseIncome = profile?.fixedPartAmount || state.total30DaysBudget || 80000;

  // Взнос в подушку
  const cushionDeposit = useMemo(() => {
    if (!isCushionEnabled) return 0;
    return calculateMonthlyCushionNorm(baseIncome, normMode, normPercent, normFixedAmount);
  }, [isCushionEnabled, baseIncome, normMode, normPercent, normFixedAmount]);

  // Дней в текущем расчётном цикле
  const today = getTodayDateString();
  const effectiveSalaryDay = profile?.mainSalaryDate || 5;
  const effectiveAdvanceDay = profile?.advanceDate || undefined;
  const template = useMemo(() => {
    return generatePeriodTemplateForMonth(2026, 9, effectiveSalaryDay, effectiveAdvanceDay, today);
  }, [effectiveSalaryDay, effectiveAdvanceDay, today]);

  const totalDays = template?.totalDays || state.days?.length || 30;
  const plannedItems = state.plannedItems || [];

  // Единый расчёт дневного лимита и остатка
  const { dailyNorm, freeDiscretionaryBudget } = useMemo(() => {
    return calculateBudgetNorms({
      totalBudget: baseIncome,
      plannedItems,
      safetyCushionDeposit: cushionDeposit,
      cushionPercent: isCushionEnabled && normMode === 'percent' ? normPercent : 0,
      totalDays,
    });
  }, [baseIncome, plannedItems, cushionDeposit, isCushionEnabled, normMode, normPercent, totalDays]);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="inline-flex p-3 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 mb-2">
          <CheckCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Всё готово к работе!</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Ваш профиль настроен. Проверьте подушку безопасности и дневной лимит перед стартом
        </p>
      </div>

      {/* Блок конфигурации финансовой подушки */}
      <div className="bg-gradient-to-b from-blue-50/70 to-white dark:from-slate-800/80 dark:to-slate-900 border border-blue-200/80 dark:border-slate-700/80 rounded-2xl p-4 space-y-3.5 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl transition-colors ${
              isCushionEnabled 
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' 
                : 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-gray-500'
            }`}>
              <PiggyBank className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900 dark:text-white">
                Откладывать в финансовую подушку
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400">
                {isCushionEnabled 
                  ? 'Взнос вычитается из бюджета для создания резерва' 
                  : 'Отключено: взнос 0 ₽, вся зарплата остаётся на расходы'}
              </div>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={isCushionEnabled}
            onClick={() => handleToggleCushion(!isCushionEnabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isCushionEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                isCushionEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {isCushionEnabled && (
          <div className="pt-2 border-t border-blue-100/80 dark:border-slate-800/80 space-y-3">
            {/* Переключатель режима: % от дохода или фикс. сумма */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-100 dark:bg-slate-800/90 rounded-xl">
              <button
                type="button"
                onClick={() => handleModeChange('percent')}
                className={`py-1.5 px-2 text-xs font-semibold rounded-lg transition-all ${
                  normMode === 'percent'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                % от дохода
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('fixed')}
                className={`py-1.5 px-2 text-xs font-semibold rounded-lg transition-all ${
                  normMode === 'fixed'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Фиксированная сумма
              </button>
            </div>

            {normMode === 'percent' ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {[5, 10, 15, 20].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handlePercentQuickSelect(pct)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        normPercent === pct
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-800/80 px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700">
                  <span className="text-xs text-gray-600 dark:text-gray-300">Свой процент:</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={normPercentInput}
                      onChange={(e) => handlePercentInputChange(e.target.value)}
                      className="w-16 px-2 py-1 text-right text-xs font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 focus:outline-none focus:border-blue-500"
                    />
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">%</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-1.5">
                  {[5000, 8000, 10000, 15000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => handleFixedQuickSelect(amt)}
                      className={`py-1.5 rounded-lg text-[11px] font-bold transition-all border truncate px-1 ${
                        normFixedAmount === amt
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      {(amt / 1000).toFixed(0)}k ₽
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-800/80 px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700">
                  <span className="text-xs text-gray-600 dark:text-gray-300">Своя сумма:</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={normFixedInput}
                      onChange={(e) => handleFixedInputChange(e.target.value)}
                      placeholder="8000"
                      className="w-24 px-2 py-1 text-right text-xs font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 focus:outline-none focus:border-blue-500"
                    />
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">₽</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-xs px-1 text-gray-500 dark:text-gray-400">
              <span>Ежемесячный взнос в подушку:</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">
                {formatRubles(cushionDeposit, { showCents: false })}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Сводка параметров */}
      <div className="bg-gradient-to-b from-gray-50 to-white dark:from-slate-900 dark:to-slate-900/60 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-800">
          <span className="text-xs text-gray-500 dark:text-gray-400">Тип профиля</span>
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2.5 py-1 rounded-lg border border-blue-200/50 dark:border-blue-900/50">
            {label}
          </span>
        </div>

        <div className="space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <Wallet className="w-3.5 h-3.5 text-emerald-500" />
              <span>Базовый доход:</span>
            </span>
            <span className="font-bold text-gray-900 dark:text-white">
              {(profile?.fixedPartAmount || 0).toLocaleString('ru-RU')} ₽
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              <span>Основная зарплата:</span>
            </span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {profile?.mainSalaryDate}-е число
            </span>
          </div>

          {profile?.advanceDate && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <CreditCard className="w-3.5 h-3.5 text-indigo-500" />
                <span>Аванс:</span>
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {profile?.advanceDate}-е число
              </span>
            </div>
          )}

          {/* Строка подушки безопасности в сводке */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-800">
            <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
              <span>Финансовая подушка:</span>
            </span>
            <span className={`font-bold ${isCushionEnabled ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400 dark:text-gray-500'}`}>
              {isCushionEnabled ? (
                `${formatRubles(cushionDeposit, { showCents: false })} (${normMode === 'percent' ? `${normPercent}%` : 'фикс.'})`
              ) : (
                'Отключена (0 ₽)'
              )}
            </span>
          </div>

          {food && (
            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-800">
              <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <ShoppingBasket className="w-3.5 h-3.5 text-emerald-500" />
                <span>Продукты ({food.mode === 'simple' ? 'Лимит' : food.mode === 'basket' ? 'Корзина' : 'Гибрид'}):</span>
              </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {food.mode === 'simple' && formatRubles(food.monthlyLimit || 20000)}
                {food.mode === 'basket' && `${formatRubles(food.basketTotal || 0)} (${food.basketItems?.length || 0} поз.)`}
                {food.mode === 'hybrid' && `${formatRubles((food.basketTotal || 0) + (food.monthlyLimit || 0))}`}
              </span>
            </div>
          )}

          {((state.plannedItems || []).filter(item => item.id.startsWith('planned-onboarding-') || item.autoRenew === false).length > 0) && (
            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-800">
              <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <ShoppingBag className="w-3.5 h-3.5 text-blue-500" />
                <span>Крупные покупки:</span>
              </span>
              <span className="font-bold text-blue-600 dark:text-blue-400">
                {formatRubles(
                  (state.plannedItems || [])
                    .filter(item => item.id.startsWith('planned-onboarding-') || item.autoRenew === false)
                    .reduce((sum, item) => sum + item.amount, 0),
                  { showCents: false }
                )}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Переменная часть:</span>
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {profile?.hasVariablePart ? 'Включена' : 'Только фиксированный доход'}
            </span>
          </div>

          {/* Итоговый пересчитанный дневной лимит */}
          <div className="mt-3 p-3 rounded-xl bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-blue-950 dark:text-blue-200 block">
                Расчётный дневной лимит:
              </span>
              <span className="text-[11px] text-blue-700 dark:text-blue-300 block">
                Свободно {formatRubles(freeDiscretionaryBudget, { showCents: false })} на {totalDays} дн.
              </span>
            </div>
            <div className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400">
              {formatRubles(dailyNorm, { showCents: false })} <span className="text-xs font-semibold">/ день</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};