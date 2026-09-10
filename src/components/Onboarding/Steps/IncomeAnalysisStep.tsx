import React, { useState, useEffect } from 'react';
import { useProfile } from '../../../context/ProfileContext';
import { useBudget } from '../../../context/BudgetContext';
import { analyzeIncomeProfile } from '../../../utils/profileAnalyzer';
import { IncomeItem } from '../../../types';
import { 
  Sparkles, 
  Calendar, 
  Wallet, 
  CheckCircle2, 
  TrendingUp, 
  CreditCard,
  Pencil,
  Check,
  Calculator,
  ArrowRight
} from 'lucide-react';

const mockIncomeItems: IncomeItem[] = [
  { id: '1', title: 'Зарплата', amount: 80000, date: '2026-08-05', category: 'Зарплата', sourceType: 'bank_card', isIncludedInBudget: true, isManual: false, createdAt: '2026-08-05T10:00:00.000Z' },
  { id: '2', title: 'Зарплата', amount: 80000, date: '2026-07-05', category: 'Зарплата', sourceType: 'bank_card', isIncludedInBudget: true, isManual: false, createdAt: '2026-07-05T10:00:00.000Z' },
  { id: '3', title: 'Зарплата', amount: 80000, date: '2026-06-05', category: 'Зарплата', sourceType: 'bank_card', isIncludedInBudget: true, isManual: false, createdAt: '2026-06-05T10:00:00.000Z' },
  { id: '4', title: 'Аванс', amount: 40000, date: '2026-08-20', category: 'Аванс', sourceType: 'bank_card', isIncludedInBudget: true, isManual: false, createdAt: '2026-08-20T10:00:00.000Z' },
  { id: '5', title: 'Аванс', amount: 40000, date: '2026-07-20', category: 'Аванс', sourceType: 'bank_card', isIncludedInBudget: true, isManual: false, createdAt: '2026-07-20T10:00:00.000Z' },
  { id: '6', title: 'Премия', amount: 12000, date: '2026-07-31', category: 'Премия', sourceType: 'bank_card', isIncludedInBudget: true, isManual: false, createdAt: '2026-07-31T10:00:00.000Z' },
];

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
}

export const IncomeAnalysisStep: React.FC<Props> = () => {
  const { autoDetectProfile } = useProfile();
  const { 
    state, 
    totalCheckingBankBalance, 
    setOverallCheckingCardBalance,
    isAdvanceDateReached,
    effectiveAdvanceAmount,
    actualAdvanceDay
  } = useBudget();

  const [analyzing, setAnalyzing] = useState(true);
  const [detectedProfile, setDetectedProfile] = useState<ReturnType<typeof analyzeIncomeProfile> | null>(null);

  // Manual card balance editing
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [balanceInput, setBalanceInput] = useState(() => {
    return totalCheckingBankBalance > 0 ? String(totalCheckingBankBalance) : '25000';
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      const result = analyzeIncomeProfile(mockIncomeItems);
      setDetectedProfile(result);
      autoDetectProfile(mockIncomeItems);
      setAnalyzing(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Sync initial balance if totalCheckingBankBalance is 0 and user has default 25000
  useEffect(() => {
    if (totalCheckingBankBalance === 0 && balanceInput) {
      const num = parseFloat(balanceInput.replace(/\s+/g, '').replace(',', '.'));
      if (!isNaN(num) && num > 0) {
        setOverallCheckingCardBalance(num);
      }
    }
  }, []);

  // Update card balance helper: applies exact entered number directly
  const handleBalanceChange = (val: string) => {
    setBalanceInput(val);
    const numeric = parseFloat(val.replace(/\s+/g, '').replace(',', '.'));
    if (!isNaN(numeric)) {
      setOverallCheckingCardBalance(numeric);
    }
  };

  const handleSaveBalance = () => {
    const numeric = parseFloat(balanceInput.replace(/\s+/g, '').replace(',', '.'));
    setOverallCheckingCardBalance(isNaN(numeric) ? 0 : numeric);
    setIsEditingBalance(false);
  };

  if (analyzing) {
    return (
      <div className="text-center py-10">
        <div className="relative w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-blue-100 animate-ping"></div>
          <div className="w-14 h-14 rounded-full bg-blue-600/10 flex items-center justify-center text-blue-600">
            <Sparkles className="w-7 h-7 animate-pulse" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Анализируем ваши поступления</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          ИИ определяет график выплат, оклад, авансы и регулярность...
        </p>
      </div>
    );
  }

  const profileType = detectedProfile?.suggestedProfile.profileType || 'salary_advance';
  const profileLabel = PROFILE_LABELS[profileType] || profileLabelFallback(profileType);

  function profileLabelFallback(type: string) {
    return PROFILE_LABELS[type] || 'Зарплата + аванс';
  }

  const currentBalance = totalCheckingBankBalance;

  // Total period remaining calculation:
  // If advance date is not yet reached -> Card Balance + Predicted Advance
  // If advance date has passed -> Card Balance
  const totalPeriodRemainder = !isAdvanceDateReached 
    ? currentBalance + effectiveAdvanceAmount 
    : currentBalance;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="inline-flex p-2.5 rounded-2xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mb-2">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Финансовый профиль определён</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Мы проанализировали структуру доходов и подобрали оптимальную модель
        </p>
      </div>

      {/* Profile Overview Card */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-blue-950/30 dark:to-indigo-950/20 border border-blue-200/70 dark:border-blue-900/50 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Рекомендуемый профиль
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-600 text-white shadow-xs">
            {profileLabel}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <div className="bg-white/80 dark:bg-slate-900/70 border border-blue-100 dark:border-slate-800 rounded-xl p-2.5">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1">
              <Wallet className="w-3.5 h-3.5 text-blue-500" />
              <span>Основной доход</span>
            </div>
            <div className="text-base font-bold text-gray-900 dark:text-white">
              {detectedProfile?.details.fixedAmount.toLocaleString('ru-RU')} ₽
            </div>
          </div>

          <div className="bg-white/80 dark:bg-slate-900/70 border border-blue-100 dark:border-slate-800 rounded-xl p-2.5">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              <span>День зарплаты</span>
            </div>
            <div className="text-base font-bold text-gray-900 dark:text-white">
              {detectedProfile?.details.mainDate}-е число
            </div>
          </div>

          {detectedProfile?.details.advanceDate && (
            <div className="bg-white/80 dark:bg-slate-900/70 border border-blue-100 dark:border-slate-800 rounded-xl p-2.5">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                <span>День аванса</span>
              </div>
              <div className="text-base font-bold text-gray-900 dark:text-white">
                {detectedProfile.details.advanceDate}-е число
              </div>
            </div>
          )}

          <div className="bg-white/80 dark:bg-slate-900/70 border border-blue-100 dark:border-slate-800 rounded-xl p-2.5">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
              <span>Переменная часть</span>
            </div>
            <div className="text-base font-bold text-gray-900 dark:text-white">
              {(detectedProfile?.details.variableAverage || 0) > 0 
                ? `~${Math.round(detectedProfile?.details.variableAverage || 0).toLocaleString('ru-RU')} ₽` 
                : 'Нет'}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Card Balance & Period Remainder Section */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Баланс карты и расчёт на период
            </h3>
          </div>
          <span className="text-[11px] text-gray-500 dark:text-gray-400">
            {isAdvanceDateReached ? 'Аванс получен' : `Аванс ${actualAdvanceDay}-го числа`}
          </span>
        </div>

        {/* Card Balance Input Block */}
        <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-700/60 flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 block mb-0.5">
              Текущий баланс карты
            </span>
            {isEditingBalance ? (
              <div className="flex items-center gap-2 mt-1">
                <div className="relative flex-1">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={balanceInput}
                    onChange={(e) => handleBalanceChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveBalance();
                    }}
                    autoFocus
                    placeholder="Например, 25 000"
                    className="w-full px-3 py-1.5 text-base font-bold rounded-lg border border-blue-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 pointer-events-none">
                    ₽
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSaveBalance}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>ОК</span>
                </button>
              </div>
            ) : (
              <div className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                {currentBalance.toLocaleString('ru-RU')} ₽
              </div>
            )}
          </div>

          {!isEditingBalance && (
            <button
              type="button"
              onClick={() => {
                setBalanceInput(String(currentBalance));
                setIsEditingBalance(true);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
              title="Изменить баланс карты вручную"
            >
              <Pencil className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Изменить</span>
            </button>
          )}
        </div>

        {/* Total Remaining till Period End Card */}
        <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-semibold text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Общий остаток до конца периода</span>
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              !isAdvanceDateReached 
                ? 'bg-blue-200/70 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200'
                : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
            }`}>
              {!isAdvanceDateReached ? `До аванса (${actualAdvanceDay}-е число)` : 'Аванс получен'}
            </span>
          </div>

          <div className="text-2xl font-black text-blue-700 dark:text-blue-300 tracking-tight my-1">
            {totalPeriodRemainder.toLocaleString('ru-RU')} ₽
          </div>

          <p className="text-[11px] text-blue-900/80 dark:text-blue-300/80 leading-snug">
            {!isAdvanceDateReached ? (
              <span>
                Рассчитан как: баланс карты ({currentBalance.toLocaleString('ru-RU')} ₽) + предполагаемый аванс ({effectiveAdvanceAmount.toLocaleString('ru-RU')} ₽).
              </span>
            ) : (
              <span>
                Приравнен к текущему балансу карты ({currentBalance.toLocaleString('ru-RU')} ₽), так как аванс уже наступил и поступил на счёт.
              </span>
            )}
          </p>
        </div>
      </div>

      <p className="text-xs text-center text-gray-500 dark:text-gray-400">
        На следующем шаге вы можете подтвердить выбор или настроить параметры вручную
      </p>
    </div>
  );
};