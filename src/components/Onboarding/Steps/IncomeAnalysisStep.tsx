import React, { useState, useEffect } from 'react';
import { useProfile } from '../../../context/ProfileContext';
import { analyzeIncomeProfile } from '../../../utils/profileAnalyzer';
import { IncomeItem } from '../../../types';
import { Sparkles, Calendar, Wallet, CheckCircle2, TrendingUp, HelpCircle } from 'lucide-react';

const mockIncomeItems: IncomeItem[] = [
  { id: '1', title: 'Зарплата', amount: 82650, date: '2026-08-05', category: 'Зарплата', sourceType: 'bank_card', isIncludedInBudget: true, isManual: false, createdAt: '2026-08-05T10:00:00.000Z' },
  { id: '2', title: 'Зарплата', amount: 82650, date: '2026-07-05', category: 'Зарплата', sourceType: 'bank_card', isIncludedInBudget: true, isManual: false, createdAt: '2026-07-05T10:00:00.000Z' },
  { id: '3', title: 'Зарплата', amount: 82650, date: '2026-06-05', category: 'Зарплата', sourceType: 'bank_card', isIncludedInBudget: true, isManual: false, createdAt: '2026-06-05T10:00:00.000Z' },
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
  const [analyzing, setAnalyzing] = useState(true);
  const [detectedProfile, setDetectedProfile] = useState<ReturnType<typeof analyzeIncomeProfile> | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const result = analyzeIncomeProfile(mockIncomeItems);
      setDetectedProfile(result);
      autoDetectProfile(mockIncomeItems);
      setAnalyzing(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

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

  const profileType = detectedProfile?.suggestedProfile.profileType || 'stable';
  const profileLabel = PROFILE_LABELS[profileType] || profileType;

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

      <p className="text-xs text-center text-gray-500 dark:text-gray-400">
        На следующем шаге вы можете подтвердить выбор или настроить параметры вручную
      </p>
    </div>
  );
};