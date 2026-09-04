import React from 'react';
import { useProfile } from '../../../context/ProfileContext';
import { Calendar, Wallet, CreditCard, Sparkles, Info, ShieldCheck } from 'lucide-react';

interface Props {
  onNext: () => void;
  onPrev: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export const ProfileCustomizationStep: React.FC<Props> = () => {
  const { profile, setProfile } = useProfile();
  const profileType = profile?.profileType || 'salary_advance';

  const mainDay = profile?.mainSalaryDate || 5;
  const advanceDay = profile?.advanceDate || 20;
  const bonusDay = profile?.bonusDateDay || 25;
  const fixedAmount = profile?.fixedPartAmount || 82650;

  const updateField = (changes: Partial<NonNullable<typeof profile>>) => {
    if (profile) {
      setProfile({
        ...profile,
        ...changes,
      });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Настройка дат и сумм</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {profileType === 'stable' && 'Укажите дату и сумму вашей фиксированной ежемесячной зарплаты'}
          {profileType === 'salary_advance' && 'Укажите даты зарплаты, аванса и суммарный постоянный доход'}
          {profileType === 'variable' && 'Укажите даты выплат базы, аванса и день начисления бонусов/KPI'}
          {profileType === 'irregular' && 'Укажите базовую дату выплаты зарплаты (прогноз смен рассчитает ИИ)'}
          {profileType === 'freelance' && 'Настройка параметров для своего финансового профиля'}
        </p>
      </div>

      <div className="space-y-3.5">
        {/* === ПРОФИЛЬ 1: Зарплата + аванс === */}
        {profileType === 'salary_advance' && (
          <>
            {/* День зарплаты */}
            <div className="p-3.5 bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-800 dark:text-gray-200">
                  <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Основная зарплата (день месяца)</span>
                </label>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                  {mainDay}-е число
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="31"
                value={mainDay}
                onChange={(e) => updateField({ mainSalaryDate: parseInt(e.target.value) || 5, periodStartDay: parseInt(e.target.value) || 5 })}
                className="w-full h-1.5 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-gray-600 dark:text-gray-400">
                <span>1-е</span>
                <span>10-е</span>
                <span>20-е</span>
                <span>31-е</span>
              </div>
            </div>

            {/* День аванса */}
            <div className="p-3.5 bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-800 dark:text-gray-200">
                  <CreditCard className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>День выплаты аванса (середина месяца)</span>
                </label>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  {advanceDay}-е число
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="31"
                value={advanceDay}
                onChange={(e) => updateField({ advanceDate: parseInt(e.target.value) || 20 })}
                className="w-full h-1.5 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-[10px] text-gray-600 dark:text-gray-400">
                <span>1-е</span>
                <span>10-е</span>
                <span>20-е</span>
                <span>31-е</span>
              </div>
            </div>

            {/* Сумма постоянного дохода (аванс + зарплата) */}
            <div className="p-3.5 bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 rounded-2xl space-y-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-800 dark:text-gray-200">
                <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Сумма постоянного дохода (аванс + зарплата)</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="1000"
                  value={fixedAmount}
                  onChange={(e) => updateField({ fixedPartAmount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-sm font-semibold rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-3 top-2.5 text-xs font-medium text-gray-600 dark:text-gray-400">₽ / мес</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 flex items-start gap-2 text-xs text-blue-900 dark:text-blue-200">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <span>
                <strong>Период бюджета:</strong> «От зарплаты до зарплаты» (с {mainDay}-го по {mainDay > 1 ? mainDay - 1 : 31}-е число). Аванс распределяется для ровной нормы дня без просадок.
              </span>
            </div>
          </>
        )}

        {/* === ПРОФИЛЬ 2: Стабильный оклад === */}
        {profileType === 'stable' && (
          <>
            {/* День выплаты оклада */}
            <div className="p-3.5 bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-800 dark:text-gray-200">
                  <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Дата выплаты оклада (день месяца)</span>
                </label>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                  {mainDay}-е число
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="31"
                value={mainDay}
                onChange={(e) => updateField({ mainSalaryDate: parseInt(e.target.value) || 5, periodStartDay: parseInt(e.target.value) || 5, advanceDate: undefined })}
                className="w-full h-1.5 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-gray-600 dark:text-gray-400">
                <span>1-е</span>
                <span>10-е</span>
                <span>20-е</span>
                <span>31-е</span>
              </div>
            </div>

            {/* Сумма выплаты */}
            <div className="p-3.5 bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 rounded-2xl space-y-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-800 dark:text-gray-200">
                <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Сумма выплаты (оклад)</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="1000"
                  value={fixedAmount}
                  onChange={(e) => updateField({ fixedPartAmount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-sm font-semibold rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-3 top-2.5 text-xs font-medium text-gray-600 dark:text-gray-400">₽ / мес</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 flex items-start gap-2 text-xs text-blue-900 dark:text-blue-200">
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <span>
                <strong>Период бюджета:</strong> «От зарплаты до зарплаты» (с {mainDay}-го числа). Единственная фиксированная выплата в месяц без лишних авансовых калькуляторов.
              </span>
            </div>
          </>
        )}

        {/* === ПРОФИЛЬ 3: Оклад + бонусы / KPI === */}
        {profileType === 'variable' && (
          <>
            {/* Дата аванса */}
            <div className="p-3.5 bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-800 dark:text-gray-200">
                  <CreditCard className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Дата аванса (день месяца)</span>
                </label>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  {advanceDay}-е число
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="31"
                value={advanceDay}
                onChange={(e) => updateField({ advanceDate: parseInt(e.target.value) || 20 })}
                className="w-full h-1.5 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            {/* Дата зарплаты */}
            <div className="p-3.5 bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-800 dark:text-gray-200">
                  <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Дата основной зарплаты (день месяца)</span>
                </label>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                  {mainDay}-е число
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="31"
                value={mainDay}
                onChange={(e) => updateField({ mainSalaryDate: parseInt(e.target.value) || 5 })}
                className="w-full h-1.5 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            {/* Дата премии */}
            <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-semibold text-amber-950 dark:text-amber-200">
                  <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Дата выплаты премии / бонусов (день месяца)</span>
                </label>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
                  {bonusDay}-е число
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="31"
                value={bonusDay}
                onChange={(e) => updateField({ bonusDateDay: parseInt(e.target.value) || 25, periodStartDay: parseInt(e.target.value) || 25 })}
                className="w-full h-1.5 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-600"
              />
              <div className="flex justify-between text-[10px] text-amber-800/70 dark:text-amber-400/70">
                <span>1-е</span>
                <span>10-е</span>
                <span>20-е</span>
                <span>31-е</span>
              </div>
            </div>

            {/* Сумма постоянного дохода (аванс + зарплата) */}
            <div className="p-3.5 bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 rounded-2xl space-y-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-800 dark:text-gray-200">
                <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Сумма постоянного дохода (аванс + зарплата)</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="1000"
                  value={fixedAmount}
                  onChange={(e) => updateField({ fixedPartAmount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-sm font-semibold rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-3 top-2.5 text-xs font-medium text-gray-600 dark:text-gray-400">₽ / мес</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2 text-xs text-amber-900 dark:text-amber-200">
              <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Период начинается со дня премии ({bonusDay}-го числа)</strong> и заканчивается за день до следующей премии. Премии — это переменная часть, поэтому они не закладываются заранее, а увеличивают лимит по факту прихода.
              </span>
            </div>
          </>
        )}

        {/* === ПРОФИЛЬ 4: Плавающий график === */}
        {profileType === 'irregular' && (
          <>
            {/* Только дата зарплаты */}
            <div className="p-3.5 bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-800 dark:text-gray-200">
                  <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Дата выплаты зарплаты (день месяца)</span>
                </label>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                  {mainDay}-е число
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="31"
                value={mainDay}
                onChange={(e) => updateField({ mainSalaryDate: parseInt(e.target.value) || 5, periodStartDay: parseInt(e.target.value) || 5 })}
                className="w-full h-1.5 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-gray-600 dark:text-gray-400">
                <span>1-е</span>
                <span>10-е</span>
                <span>20-е</span>
                <span>31-е</span>
              </div>
            </div>

            {/* Примерная база за месяц */}
            <div className="p-3.5 bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 rounded-2xl space-y-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-800 dark:text-gray-200">
                <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Ориентировочный доход за месяц</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="1000"
                  value={fixedAmount}
                  onChange={(e) => updateField({ fixedPartAmount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-sm font-semibold rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-3 top-2.5 text-xs font-medium text-gray-600 dark:text-gray-400">₽ / мес</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 flex items-start gap-2 text-xs text-blue-900 dark:text-blue-200">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <span>
                <strong>Умный прогноз смен:</strong> Поскольку количество смен плавающее, остальные расчеты и динамическую адаптацию дневных лимитов берет на себя ИИ. Период строится в привязке к дате выплат ({mainDay}-е число).
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
