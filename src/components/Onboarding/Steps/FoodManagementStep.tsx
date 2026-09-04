import React, { useState, useMemo } from 'react';
import { useBudget, formatRubles } from '../../../context/BudgetContext';
import { 
  ShoppingBasket, 
  Sparkles, 
  Check, 
  Barcode, 
  Plus, 
  Trash2, 
  Layers, 
  TrendingUp, 
  HelpCircle,
  Package,
  CheckSquare,
  Square
} from 'lucide-react';
import { FoodItem, FoodControlMode } from '../../../types';
import { GTINScanner } from '../../Scanner/GTINScanner';
import { 
  POPULAR_FOOD_TEMPLATES, 
  calculateBasketTotal, 
  getFoodCategoryLabel 
} from '../../../utils/foodBasketUtils';

interface Props {
  onNext: () => void;
  onPrev: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export const FoodManagementStep: React.FC<Props> = ({ onNext }) => {
  const { state, setFoodControl, syncFoodPlanWithBudget } = useBudget();

  // Режим управления: 'simple' | 'basket' | 'hybrid'
  const [selectedMode, setSelectedMode] = useState<FoodControlMode>(
    state.foodControl?.mode || 'basket'
  );

  // Лимит для simple или дискреционный лимит для hybrid
  const defaultSimpleLimit = useMemo(() => {
    // Если есть история трат в днях
    const foodExpensesSum = (state.days || []).reduce((acc, d) => {
      const foodInDay = (d.expenses || [])
        .filter(e => e.categoryType === 'продукты' || (e.category || '').toLowerCase().includes('продукт'))
        .reduce((sum, e) => sum + e.amount, 0);
      return acc + foodInDay;
    }, 0);

    if (foodExpensesSum > 5000) {
      return Math.round(foodExpensesSum);
    }
    return 20000;
  }, [state.days]);

  const [monthlyLimitInput, setMonthlyLimitInput] = useState<string>(
    (state.foodControl?.monthlyLimit || defaultSimpleLimit).toString()
  );

  const [discretionaryLimitInput, setDiscretionaryLimitInput] = useState<string>(
    (state.foodControl?.mode === 'hybrid' && state.foodControl?.monthlyLimit ? state.foodControl.monthlyLimit : 3000).toString()
  );

  // Инициализация корзины популярными шаблонами
  const [basketItems, setBasketItems] = useState<FoodItem[]>(() => {
    if (state.foodControl?.basketItems && state.foodControl.basketItems.length > 0) {
      return state.foodControl.basketItems;
    }
    // Предзаполняем популярными базовыми продуктами (топ-8)
    return POPULAR_FOOD_TEMPLATES.slice(0, 8).map((tpl, idx) => ({
      id: `food-init-${idx + 1}`,
      name: tpl.name,
      price: tpl.price,
      quantityPerMonth: tpl.quantityPerMonth,
      unit: tpl.unit,
      category: tpl.category,
      frequency: tpl.frequency,
      lastUpdated: new Date().toISOString(),
    }));
  });

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customQty, setCustomQty] = useState('2');
  const [customUnit, setCustomUnit] = useState('шт');
  const [customCat, setCustomCat] = useState<FoodItem['category']>('молочка');

  // Подсчет стоимости корзины
  const basketTotal = useMemo(() => calculateBasketTotal(basketItems), [basketItems]);

  const handleToggleTemplate = (template: typeof POPULAR_FOOD_TEMPLATES[0]) => {
    const existingIndex = basketItems.findIndex(i => i.name.toLowerCase() === template.name.toLowerCase());
    if (existingIndex >= 0) {
      setBasketItems(prev => prev.filter((_, idx) => idx !== existingIndex));
    } else {
      if (basketItems.length >= 20) {
        alert('Максимум 20 позиций в базовой потребительской корзине');
        return;
      }
      const newItem: FoodItem = {
        id: `food-tpl-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: template.name,
        price: template.price,
        quantityPerMonth: template.quantityPerMonth,
        unit: template.unit,
        category: template.category,
        frequency: template.frequency,
        lastUpdated: new Date().toISOString(),
      };
      setBasketItems(prev => [...prev, newItem]);
    }
  };

  const handleUpdateItemPrice = (id: string, newPriceStr: string) => {
    const priceNum = parseFloat(newPriceStr.replace(',', '.'));
    setBasketItems(prev => prev.map(item => 
      item.id === id ? { ...item, price: isNaN(priceNum) ? 0 : priceNum } : item
    ));
  };

  const handleUpdateItemQty = (id: string, newQtyStr: string) => {
    const qtyNum = parseFloat(newQtyStr.replace(',', '.'));
    setBasketItems(prev => prev.map(item => 
      item.id === id ? { ...item, quantityPerMonth: isNaN(qtyNum) ? 1 : qtyNum } : item
    ));
  };

  const handleRemoveItem = (id: string) => {
    setBasketItems(prev => prev.filter(item => item.id !== id));
  };

  const handleAddCustomProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(customPrice.replace(',', '.'));
    const qtyNum = parseFloat(customQty.replace(',', '.'));

    if (!customName.trim() || isNaN(priceNum) || priceNum <= 0) return;

    if (basketItems.length >= 20) {
      alert('Максимум 20 позиций в потребительской корзине');
      return;
    }

    const newItem: FoodItem = {
      id: `food-custom-${Date.now()}`,
      name: customName.trim(),
      price: priceNum,
      quantityPerMonth: isNaN(qtyNum) || qtyNum <= 0 ? 1 : qtyNum,
      unit: customUnit.trim() || 'шт',
      category: customCat,
      lastUpdated: new Date().toISOString(),
    };

    setBasketItems(prev => [newItem, ...prev]);
    setCustomName('');
    setCustomPrice('');
    setCustomQty('2');
    setIsAddingManual(false);
  };

  const handleAddScannedProduct = (scanned: Omit<FoodItem, 'id' | 'lastUpdated'>) => {
    if (basketItems.length >= 20) {
      alert('Максимум 20 позиций в потребительской корзине');
      return;
    }

    const newItem: FoodItem = {
      ...scanned,
      id: `food-scan-${Date.now()}`,
      lastUpdated: new Date().toISOString(),
    };

    setBasketItems(prev => [newItem, ...prev]);
  };

  // Сохраняем состояние при переходе
  const handleSaveAndProceed = () => {
    let limitValue = 0;
    if (selectedMode === 'simple') {
      limitValue = parseFloat(monthlyLimitInput.replace(',', '.')) || 20000;
    } else if (selectedMode === 'hybrid') {
      limitValue = parseFloat(discretionaryLimitInput.replace(',', '.')) || 3000;
    }

    setFoodControl({
      mode: selectedMode,
      monthlyLimit: limitValue,
      basketItems: selectedMode === 'simple' ? [] : basketItems,
      basketTotal: selectedMode === 'simple' ? 0 : basketTotal,
      lastUpdated: new Date().toISOString(),
    });

    // Синхронизируем плановые статьи
    setTimeout(() => {
      syncFoodPlanWithBudget();
    }, 50);

    onNext();
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="inline-flex p-2.5 rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 mb-1.5">
          <ShoppingBasket className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Управление расходами на продукты</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Выберите комфортный уровень контроля и сформируйте плановую статью бюджета
        </p>
      </div>

      {/* 3 карточки выбора уровня */}
      <div className="space-y-2">
        {/* Уровень 1: Базовый */}
        <div
          onClick={() => setSelectedMode('simple')}
          className={`p-3 rounded-2xl border-2 transition-all cursor-pointer ${
            selectedMode === 'simple'
              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
              : 'border-gray-200 dark:border-slate-800 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                selectedMode === 'simple' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-300'
              }`}>
                {selectedMode === 'simple' && <Check className="w-3 h-3" />}
              </div>
              <span className="text-xs font-bold text-gray-900 dark:text-white">1. Базовый (Простой лимит)</span>
            </div>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 pl-6">
            Один общий месячный лимит на всю еду и супермаркеты.
          </p>
        </div>

        {/* Уровень 2: Потребительская корзина */}
        <div
          onClick={() => setSelectedMode('basket')}
          className={`p-3 rounded-2xl border-2 transition-all cursor-pointer ${
            selectedMode === 'basket'
              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
              : 'border-gray-200 dark:border-slate-800 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                selectedMode === 'basket' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-300'
              }`}>
                {selectedMode === 'basket' && <Check className="w-3 h-3" />}
              </div>
              <span className="text-xs font-bold text-gray-900 dark:text-white">2. Потребительская корзина</span>
            </div>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 pl-6">
            Базовый набор продуктов (до 20 позиций) с ценами и объемами. Автоматический расчет суммы.
          </p>
        </div>

        {/* Уровень 3: Гибридный */}
        <div
          onClick={() => setSelectedMode('hybrid')}
          className={`p-3 rounded-2xl border-2 transition-all cursor-pointer ${
            selectedMode === 'hybrid'
              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
              : 'border-gray-200 dark:border-slate-800 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                selectedMode === 'hybrid' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-300'
              }`}>
                {selectedMode === 'hybrid' && <Check className="w-3 h-3" />}
              </div>
              <span className="text-xs font-bold text-gray-900 dark:text-white">3. Гибридный (Корзина + Дискреционные)</span>
            </div>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 pl-6">
            Базовая корзина + отдельный лимит на сладости, кофе, деликатесы и спонтанные покупки.
          </p>
        </div>
      </div>

      {/* Настройка в зависимости от выбранного режима */}
      {selectedMode === 'simple' ? (
        <div className="bg-gray-50 dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 space-y-2">
          <label className="text-xs font-bold text-gray-900 dark:text-white block">
            Месячный лимит на категорию «Продукты» (₽):
          </label>
          <input
            type="number"
            value={monthlyLimitInput}
            onChange={(e) => setMonthlyLimitInput(e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:outline-hidden"
          />
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Сумма добавится как плановая статья «Продукты» и будет уменьшаться при подтверждении чеков из супермаркетов.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Сводка корзины + кнопки */}
          <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase block">
                Сумма корзины на месяц:
              </span>
              <span className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400">
                {formatRubles(basketTotal)}
              </span>
            </div>
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              {basketItems.length} из 20 позиций
            </span>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95"
            >
              <Barcode className="w-4 h-4" />
              <span>Сканировать GTIN</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddingManual(prev => !prev)}
              className="py-2 px-3 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{isAddingManual ? 'Скрыть' : 'Свой продукт'}</span>
            </button>
          </div>

          {/* Форма добавления вручную */}
          {isAddingManual && (
            <form onSubmit={handleAddCustomProduct} className="p-3 bg-gray-50 dark:bg-slate-900 rounded-2xl border border-emerald-400 space-y-2.5">
              <span className="text-xs font-bold text-gray-900 dark:text-white block">Добавить свой продукт:</span>
              <input
                type="text"
                placeholder="Название (например: Филе индейки)"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg text-xs font-bold"
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  placeholder="Цена (₽)"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  className="px-2 py-1.5 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg text-xs font-bold"
                />
                <input
                  type="number"
                  step="0.5"
                  placeholder="Кол-во"
                  value={customQty}
                  onChange={(e) => setCustomQty(e.target.value)}
                  className="px-2 py-1.5 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg text-xs font-bold"
                />
                <input
                  type="text"
                  placeholder="Ед. (кг/шт)"
                  value={customUnit}
                  onChange={(e) => setCustomUnit(e.target.value)}
                  className="px-2 py-1.5 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg text-xs font-medium"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingManual(false)}
                  className="px-3 py-1 rounded-lg text-xs text-gray-500"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold"
                >
                  Добавить
                </button>
              </div>
            </form>
          )}

          {/* Список выбранных продуктов с быстрой сменой цен */}
          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
            {basketItems.map(item => {
              const cat = getFoodCategoryLabel(item.category);
              const cost = (item.price || 0) * (item.quantityPerMonth || 1);

              return (
                <div 
                  key={item.id}
                  className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span>{cat.emoji}</span>
                    <span className="font-semibold text-gray-900 dark:text-white truncate">{item.name}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="number"
                      value={item.price}
                      onChange={(e) => handleUpdateItemPrice(item.id, e.target.value)}
                      className="w-14 px-1.5 py-0.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded text-[11px] font-bold text-right"
                      title="Цена за единицу"
                    />
                    <span className="text-[10px] text-gray-500">₽ ×</span>
                    <input
                      type="number"
                      step="0.5"
                      value={item.quantityPerMonth}
                      onChange={(e) => handleUpdateItemQty(item.id, e.target.value)}
                      className="w-10 px-1 py-0.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded text-[11px] font-bold text-center"
                      title="Количество в месяц"
                    />
                    <span className="text-[10px] font-bold text-gray-900 dark:text-white w-14 text-right">
                      {Math.round(cost)} ₽
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Дополнительный лимит для Уровня 3 (Гибридный) */}
          {selectedMode === 'hybrid' && (
            <div className="bg-purple-50 dark:bg-purple-950/30 p-3 rounded-2xl border border-purple-200 dark:border-purple-900/50 space-y-1.5">
              <label className="text-xs font-bold text-purple-900 dark:text-purple-300 block">
                Отдельный лимит на дискреционные продукты (сладости, снэки, кофе):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={discretionaryLimitInput}
                  onChange={(e) => setDiscretionaryLimitInput(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 border border-purple-300 dark:border-purple-800 rounded-xl text-xs font-bold text-gray-900 dark:text-white"
                />
                <span className="text-xs font-bold text-purple-800 dark:text-purple-300 shrink-0">₽ / мес</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Кнопка применения внизу онбординга */}
      <button
        type="button"
        onClick={handleSaveAndProceed}
        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 mt-2"
      >
        <Check className="w-4 h-4" />
        <span>Применить настройки продуктов</span>
      </button>

      {/* Сканер GTIN */}
      <GTINScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onAddProduct={handleAddScannedProduct}
      />
    </div>
  );
};
