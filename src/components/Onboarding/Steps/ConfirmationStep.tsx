import React from 'react';
import { useProfile } from '../../../context/ProfileContext';
import { useBudget, formatRubles } from '../../../context/BudgetContext';
import { CheckCircle, Calendar, Wallet, CreditCard, Sparkles, ShoppingBasket } from 'lucide-react';

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

export const ConfirmationStep: React.FC<Props> = () => {
  const { profile } = useProfile();
  const { state } = useBudget();
  const profileType = profile?.profileType || 'salary_advance';
  const label = PROFILE_LABELS[profileType] || profileType;
  const food = state.foodControl;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="inline-flex p-3 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 mb-2">
          <CheckCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Всё готово к работе!</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Ваш профиль настроен. Приложение сформировало персональный 30-дневный цикл
        </p>
      </div>

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

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Переменная часть:</span>
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {profile?.hasVariablePart ? 'Включена' : 'Только фиксированный доход'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};