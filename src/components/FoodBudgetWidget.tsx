import React, { useState } from 'react';
import { useBudget, formatRubles } from '../context/BudgetContext';
import { 
  ShoppingBasket, 
  Barcode, 
  ChevronRight, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { FoodBasketModal } from './FoodBasketModal';
import { GTINScanner } from './Scanner/GTINScanner';
import { calculateBasketTotal } from '../utils/foodBasketUtils';

export const FoodBudgetWidget: React.FC = () => {
  const { state, totalFoodSpentThisPeriod, addBasketItem } = useBudget();
  const [isBasketModalOpen, setIsBasketModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const foodControl = state.foodControl || {
    mode: 'basket',
    monthlyLimit: 20000,
    basketItems: [],
    basketTotal: 0,
  };

  const currentItems = foodControl.basketItems || [];
  const basketTotal = foodControl.basketTotal || calculateBasketTotal(currentItems);
  const mode = foodControl.mode;

  // Расчет прогресса в зависимости от режима
  let totalTarget = 0;
  let spentAmount = totalFoodSpentThisPeriod;

  if (mode === 'simple') {
    totalTarget = foodControl.monthlyLimit || 20000;
  } else if (mode === 'basket') {
    totalTarget = basketTotal > 0 ? basketTotal : 15000;
  } else if (mode === 'hybrid') {
    totalTarget = (basketTotal > 0 ? basketTotal : 15000) + (foodControl.monthlyLimit || 3000);
  }

  const remaining = Math.max(0, totalTarget - spentAmount);
  const percentage = totalTarget > 0 ? Math.min(100, Math.round((spentAmount / totalTarget) * 100)) : 0;
  const isOverspent = spentAmount > totalTarget;

  return (
    <>
      <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 border border-[var(--color-border)] shadow-xs transition-all hover:border-emerald-500/30">
        {/* Шапка виджета */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShoppingBasket className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[var(--color-text-main)] flex items-center gap-1.5">
                <span>Продукты и корзина</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  {mode === 'simple' && 'Лимит'}
                  {mode === 'basket' && 'Корзина'}
                  {mode === 'hybrid' && 'Гибрид'}
                </span>
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors"
              title="Быстро сканировать штрих-код товара"
            >
              <Barcode className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIsBasketModalOpen(true)}
              className="p-1.5 rounded-lg hover:bg-[var(--color-bg-card-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors"
              title="Открыть управление корзиной"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Тело виджета в зависимости от режима */}
        {mode === 'simple' && (
          <div className="space-y-2">
            <div className="flex justify-between items-baseline text-xs">
              <span className="text-[var(--color-text-muted)]">
                Потрачено: <span className="font-bold text-[var(--color-text-main)]">{formatRubles(spentAmount)}</span>
              </span>
              <span className="text-[var(--color-text-muted)]">
                Лимит: <span className="font-bold text-[var(--color-text-main)]">{formatRubles(totalTarget)}</span>
              </span>
            </div>

            {/* Прогресс-бар */}
            <div className="w-full bg-[var(--color-bg-card-subtle)] h-2 rounded-full overflow-hidden border border-[var(--color-border-subtle)]">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isOverspent
                    ? 'bg-rose-500'
                    : percentage > 80
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, percentage)}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-[11px] pt-0.5">
              <span className="text-[var(--color-text-muted)]">{percentage}% использовано</span>
              <span className={`font-semibold ${isOverspent ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {isOverspent ? `Перерасход: +${formatRubles(spentAmount - totalTarget)}` : `Осталось: ${formatRubles(remaining)}`}
              </span>
            </div>
          </div>
        )}

        {mode === 'basket' && (
          <div className="space-y-2.5">
            <div className="flex justify-between items-baseline text-xs">
              <div>
                <span className="text-[11px] text-[var(--color-text-muted)] block">Базовая корзина ({currentItems.length} поз.):</span>
                <span className="font-extrabold text-[var(--color-text-main)] text-sm">{formatRubles(basketTotal)}</span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-[var(--color-text-muted)] block">Факт трат на еду:</span>
                <span className={`font-bold text-sm ${isOverspent ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {formatRubles(spentAmount)}
                </span>
              </div>
            </div>

            {/* Прогресс-бар корзины */}
            <div className="w-full bg-[var(--color-bg-card-subtle)] h-2 rounded-full overflow-hidden border border-[var(--color-border-subtle)]">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isOverspent ? 'bg-rose-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, percentage)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[var(--color-text-muted)]">
                {currentItems.length > 0 ? `Покрыто ${currentItems.length} базовых позиций` : 'Корзина пуста'}
              </span>
              <button
                type="button"
                onClick={() => setIsBasketModalOpen(true)}
                className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-0.5"
              >
                <span>Детали</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {mode === 'hybrid' && (
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)]">
                <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block">🧺 Базовая корзина</span>
                <span className="font-extrabold text-[var(--color-text-main)]">{formatRubles(basketTotal)}</span>
              </div>
              <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase block">🍬 Дискреционные</span>
                <span className="font-extrabold text-purple-700 dark:text-purple-300">{formatRubles(foodControl.monthlyLimit || 3000)}</span>
              </div>
            </div>

            {/* Прогресс-бар общий */}
            <div className="w-full bg-[var(--color-bg-card-subtle)] h-2 rounded-full overflow-hidden border border-[var(--color-border-subtle)]">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isOverspent ? 'bg-rose-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, percentage)}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-[11px]">
              <span className="text-[var(--color-text-muted)]">
                Факт: <b className="text-[var(--color-text-main)]">{formatRubles(spentAmount)}</b> из {formatRubles(totalTarget)}
              </span>
              <button
                type="button"
                onClick={() => setIsBasketModalOpen(true)}
                className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-0.5"
              >
                <span>Корзина</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Модальное окно корзины */}
      <FoodBasketModal
        isOpen={isBasketModalOpen}
        onClose={() => setIsBasketModalOpen(false)}
      />

      {/* Сканер штрих-кода */}
      <GTINScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onAddProduct={(item) => addBasketItem(item)}
      />
    </>
  );
};
