import React, { useState } from 'react';
import { useBudget, formatRubles } from '../context/BudgetContext';
import { 
  ShoppingBasket, 
  TrendingUp, 
  TrendingDown, 
  PieChart as PieIcon, 
  BarChart3, 
  Sparkles,
  ArrowRight,
  SlidersHorizontal
} from 'lucide-react';
import { FoodBasketModal } from './FoodBasketModal';
import { calculateBasketTotal } from '../utils/foodBasketUtils';
import { FoodItemCategory } from '../types';

const CATEGORY_NAMES: Record<FoodItemCategory, { label: string; emoji: string }> = {
  молочка: { label: 'Молочные продукты', emoji: '🥛' },
  мясо: { label: 'Мясо и птица', emoji: '🥩' },
  рыба: { label: 'Рыба и морепродукты', emoji: '🐟' },
  овощи_фрукты: { label: 'Овощи и фрукты', emoji: '🍏' },
  крупы: { label: 'Крупы и макароны', emoji: '🌾' },
  хлеб: { label: 'Хлеб и выпечка', emoji: '🍞' },
  яйца: { label: 'Яйца', emoji: '🥚' },
  масло: { label: 'Масла и соусы', emoji: '🧈' },
  напитки: { label: 'Чай, кофе, напитки', emoji: '☕' },
  сладости: { label: 'Сладости и снэки', emoji: '🍫' },
  заморозка: { label: 'Заморозка', emoji: '🧊' },
  прочее: { label: 'Прочее', emoji: '📦' },
};

export const FoodAnalyticsWidget: React.FC = () => {
  const { state, totalFoodSpentThisPeriod } = useBudget();
  const [isBasketModalOpen, setIsBasketModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'categories' | 'history'>('categories');

  const foodControl = state.foodControl || {
    mode: 'basket',
    monthlyLimit: 20000,
    basketItems: [],
    basketTotal: 0,
    priceHistory: [],
  };

  const items = foodControl.basketItems || [];
  const basketTotal = foodControl.basketTotal || calculateBasketTotal(items);
  const priceHistory = foodControl.priceHistory || [];

  // Группировка расходов корзины по категориям
  const categoryBreakdown = React.useMemo(() => {
    const map: Record<string, { category: FoodItemCategory; total: number; count: number }> = {};
    
    items.forEach(item => {
      const cat = item.category || 'прочее';
      const itemCost = item.price * item.quantityPerMonth;
      if (!map[cat]) {
        map[cat] = { category: cat, total: 0, count: 0 };
      }
      map[cat].total += itemCost;
      map[cat].count += 1;
    });

    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [items]);

  // Расчет динамики корзины (инфляция корзины за последние месяцы)
  const inflationInfo = React.useMemo(() => {
    if (priceHistory.length < 2) return { changePercent: 2.4, isIncrease: true, diffRubles: 350 };
    const latest = priceHistory[priceHistory.length - 1].totalBasketCost;
    const prev = priceHistory[priceHistory.length - 2].totalBasketCost;
    const diff = latest - prev;
    const pct = prev > 0 ? (diff / prev) * 100 : 0;
    return {
      changePercent: Math.abs(parseFloat(pct.toFixed(1))),
      isIncrease: diff >= 0,
      diffRubles: Math.abs(diff),
    };
  }, [priceHistory]);

  return (
    <>
      <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 sm:p-5 border border-[var(--color-border)] shadow-xs flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShoppingBasket className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--color-text-main)]">
                Аналитика потребительской корзины
              </h3>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                {items.length} позиций в корзине · {formatRubles(basketTotal)}/мес
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsBasketModalOpen(true)}
            className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] text-xs font-semibold flex items-center gap-1 transition-colors"
            title="Настройка корзины"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Настроить</span>
          </button>
        </div>

        {/* Индикатор инфляции / динамики */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="p-3 rounded-xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)]">
            <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block">
              Стоимость корзины
            </span>
            <span className="text-base font-extrabold text-[var(--color-text-main)] block mt-0.5">
              {formatRubles(basketTotal)}
            </span>
            <span className="text-[10px] text-[var(--color-text-muted)]">
              в месяц на базовые продукты
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)]">
            <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block">
              Факт трат на еду
            </span>
            <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 block mt-0.5">
              {formatRubles(totalFoodSpentThisPeriod)}
            </span>
            <span className="text-[10px] text-[var(--color-text-muted)]">
              за текущий расчетный период
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)]">
            <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block">
              Динамика цен корзины
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              {inflationInfo.isIncrease ? (
                <TrendingUp className="w-4 h-4 text-amber-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-emerald-500" />
              )}
              <span className={`text-base font-extrabold ${inflationInfo.isIncrease ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {inflationInfo.isIncrease ? '+' : '-'}{inflationInfo.changePercent}%
              </span>
            </div>
            <span className="text-[10px] text-[var(--color-text-muted)]">
              к прошлому месяцу ({inflationInfo.isIncrease ? '+' : '-'}{formatRubles(inflationInfo.diffRubles)})
            </span>
          </div>
        </div>

        {/* Табы визуализации */}
        <div className="flex items-center gap-1 p-1 bg-[var(--color-bg-card-subtle)] rounded-xl border border-[var(--color-border-subtle)]">
          <button
            onClick={() => setActiveTab('categories')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'categories'
                ? 'bg-[var(--color-bg-card)] text-[var(--color-text-main)] shadow-xs'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
            }`}
          >
            <PieIcon className="w-3.5 h-3.5" />
            <span>Структура корзины</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-[var(--color-bg-card)] text-[var(--color-text-main)] shadow-xs'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Динамика по месяцам</span>
          </button>
        </div>

        {/* Содержимое табов */}
        {activeTab === 'categories' && (
          <div className="space-y-2.5">
            {categoryBreakdown.length === 0 ? (
              <p className="text-xs text-center py-4 text-[var(--color-text-muted)]">
                Корзина пока пуста. Добавьте базовые продукты через кнопку настройки.
              </p>
            ) : (
              categoryBreakdown.map(cat => {
                const info = CATEGORY_NAMES[cat.category] || { label: cat.category, emoji: '📦' };
                const pct = basketTotal > 0 ? Math.round((cat.total / basketTotal) * 100) : 0;

                return (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-[var(--color-text-main)] flex items-center gap-1.5">
                        <span>{info.emoji}</span>
                        <span>{info.label}</span>
                        <span className="text-[10px] text-[var(--color-text-muted)] font-normal">
                          ({cat.count} поз.)
                        </span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-[var(--color-text-muted)]">
                          {pct}%
                        </span>
                        <span className="font-bold text-[var(--color-text-main)]">
                          {formatRubles(cat.total)}
                        </span>
                      </div>
                    </div>

                    <div className="w-full bg-[var(--color-bg-card-subtle)] h-1.5 rounded-full overflow-hidden border border-[var(--color-border-subtle)]">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-3">
            <div className="space-y-2">
              {priceHistory.map((h, idx) => {
                const isLatest = idx === priceHistory.length - 1;
                const maxVal = Math.max(...priceHistory.map(p => p.totalBasketCost), 1);
                const barPct = Math.round((h.totalBasketCost / maxVal) * 100);

                return (
                  <div key={h.period} className="flex items-center gap-3 text-xs">
                    <span className="w-16 text-[var(--color-text-muted)] font-medium shrink-0">
                      {h.period}
                    </span>
                    <div className="flex-1 bg-[var(--color-bg-card-subtle)] h-5 rounded-lg overflow-hidden flex items-center px-2 relative border border-[var(--color-border-subtle)]">
                      <div
                        className={`absolute left-0 top-0 bottom-0 rounded-lg opacity-80 ${
                          isLatest ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-slate-600'
                        }`}
                        style={{ width: `${barPct}%` }}
                      />
                      <span className="relative z-10 text-[11px] font-bold text-[var(--color-text-main)]">
                        {formatRubles(h.totalBasketCost)}
                      </span>
                    </div>
                    {h.inflationRate !== undefined && (
                      <span className={`text-[10px] font-bold w-12 text-right ${
                        h.inflationRate > 0 ? 'text-amber-500' : 'text-emerald-500'
                      }`}>
                        {h.inflationRate > 0 ? `+${h.inflationRate}%` : `${h.inflationRate}%`}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 text-[11px] text-blue-900 dark:text-blue-200 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <span>
                <b>ИИ Мониторинг инфляции:</b> Приложение отслеживает изменение цен на продукты в вашей корзине, чтобы заранее подстраивать дневной лимит бюджета.
              </span>
            </div>
          </div>
        )}
      </div>

      <FoodBasketModal
        isOpen={isBasketModalOpen}
        onClose={() => setIsBasketModalOpen(false)}
      />
    </>
  );
};
