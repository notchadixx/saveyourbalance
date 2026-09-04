import React, { useState } from 'react';
import { useBudget, formatRubles } from '../context/BudgetContext';
import { 
  ShoppingBasket, 
  X, 
  Plus, 
  Trash2, 
  Barcode, 
  Sparkles, 
  Check, 
  Layers, 
  HelpCircle,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Sliders
} from 'lucide-react';
import { FoodItem, FoodControlMode } from '../types';
import { GTINScanner } from './Scanner/GTINScanner';
import { calculateBasketTotal, getFoodCategoryLabel } from '../utils/foodBasketUtils';

interface FoodBasketModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FoodBasketModal: React.FC<FoodBasketModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { 
    state, 
    setFoodMode, 
    updateFoodLimit, 
    addBasketItem, 
    updateBasketItem, 
    removeBasketItem 
  } = useBudget();

  const foodControl = state.foodControl || {
    mode: 'basket',
    basketItems: [],
    basketTotal: 0,
    monthlyLimit: 20000,
  };

  const [activeTab, setActiveTab] = useState<'basket' | 'settings'>('basket');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  
  // Добавление продукта вручную
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [manualQty, setManualQty] = useState('2');
  const [manualUnit, setManualUnit] = useState('шт');
  const [manualCategory, setManualCategory] = useState<FoodItem['category']>('молочка');

  // Лимиты для simple / hybrid
  const [limitInput, setLimitInput] = useState((foodControl.monthlyLimit || 20000).toString());

  if (!isOpen) return null;

  const currentItems = foodControl.basketItems || [];
  const currentBasketTotal = calculateBasketTotal(currentItems);

  const handleSaveManualItem = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(manualPrice.replace(',', '.'));
    const qtyNum = parseFloat(manualQty.replace(',', '.'));

    if (!manualName.trim() || isNaN(priceNum) || priceNum <= 0) return;

    addBasketItem({
      name: manualName.trim(),
      price: priceNum,
      quantityPerMonth: isNaN(qtyNum) || qtyNum <= 0 ? 1 : qtyNum,
      unit: manualUnit.trim() || 'шт',
      category: manualCategory,
    });

    setManualName('');
    setManualPrice('');
    setManualQty('2');
    setIsAddingManual(false);
  };

  const handleSaveLimit = () => {
    const num = parseFloat(limitInput.replace(',', '.'));
    if (!isNaN(num) && num > 0) {
      updateFoodLimit(num);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
        <div className="bg-[var(--color-bg-card)] w-full max-w-lg rounded-3xl shadow-2xl border border-[var(--color-border)] overflow-hidden flex flex-col max-h-[90vh]">
          {/* Шапка */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)] bg-gradient-to-r from-emerald-500/10 via-transparent to-transparent">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <ShoppingBasket className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--color-text-main)]">Контроль расходов на продукты</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    {foodControl.mode === 'simple' && 'Уровень 1: Базовый лимит'}
                    {foodControl.mode === 'basket' && 'Уровень 2: Потребительская корзина'}
                    {foodControl.mode === 'hybrid' && 'Уровень 3: Корзина + Дискреционные'}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-[var(--color-bg-card-subtle)] text-[var(--color-text-muted)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Переключатель вкладок: Корзина / Режим управления */}
          <div className="flex border-b border-[var(--color-border)] bg-[var(--color-bg-card-subtle)] px-4 pt-2 gap-2">
            <button
              onClick={() => setActiveTab('basket')}
              className={`pb-2.5 px-3 text-xs font-bold transition-all relative ${
                activeTab === 'basket'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
              }`}
            >
              Состав корзины ({currentItems.length})
              {activeTab === 'basket' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`pb-2.5 px-3 text-xs font-bold transition-all relative ${
                activeTab === 'settings'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
              }`}
            >
              Уровень и лимиты
              {activeTab === 'settings' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
              )}
            </button>
          </div>

          <div className="p-4 overflow-y-auto space-y-4 flex-1">
            {activeTab === 'settings' ? (
              /* Вкладка смены режима управления */
              <div className="space-y-4">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider block">
                    Выберите подходящий уровень контроля:
                  </span>

                  {/* Режим 1: Базовый */}
                  <div 
                    onClick={() => setFoodMode('simple')}
                    className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                      foodControl.mode === 'simple'
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                        : 'border-[var(--color-border)] hover:border-gray-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          foodControl.mode === 'simple' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-300'
                        }`}>
                          {foodControl.mode === 'simple' && <Check className="w-3 h-3" />}
                        </div>
                        <span className="text-xs font-bold text-[var(--color-text-main)]">1. Базовый (простой месячный лимит)</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-[var(--color-text-muted)] mt-1.5 pl-6">
                      Единый лимит на все покупки продуктов питания. Траты в супермаркетах автоматически вычитаются из лимита.
                    </p>
                  </div>

                  {/* Режим 2: Потребительская корзина */}
                  <div 
                    onClick={() => setFoodMode('basket')}
                    className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                      foodControl.mode === 'basket'
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                        : 'border-[var(--color-border)] hover:border-gray-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          foodControl.mode === 'basket' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-300'
                        }`}>
                          {foodControl.mode === 'basket' && <Check className="w-3 h-3" />}
                        </div>
                        <span className="text-xs font-bold text-[var(--color-text-main)]">2. Потребительская корзина (набор базовых продуктов)</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-[var(--color-text-muted)] mt-1.5 pl-6">
                      Список до 20 позиций (молоко, мясо, хлеб, крупы) с точной ценой и объемом. Приложение вычисляет общую стоимость и сравнивает с чеками.
                    </p>
                  </div>

                  {/* Режим 3: Гибридный */}
                  <div 
                    onClick={() => setFoodMode('hybrid')}
                    className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                      foodControl.mode === 'hybrid'
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                        : 'border-[var(--color-border)] hover:border-gray-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          foodControl.mode === 'hybrid' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-300'
                        }`}>
                          {foodControl.mode === 'hybrid' && <Check className="w-3 h-3" />}
                        </div>
                        <span className="text-xs font-bold text-[var(--color-text-main)]">3. Гибридный (Корзина + Дискреционные продукты)</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-[var(--color-text-muted)] mt-1.5 pl-6">
                      Базовые продукты считаются по корзине, а на вкусности, кофе, сладости и спонтанные покупки выделяется отдельный лимит.
                    </p>
                  </div>
                </div>

                {/* Поле настройки лимита (для simple или hybrid) */}
                {(foodControl.mode === 'simple' || foodControl.mode === 'hybrid') && (
                  <div className="p-3.5 bg-[var(--color-bg-card-subtle)] rounded-2xl border border-[var(--color-border)] space-y-2">
                    <label className="text-xs font-bold text-[var(--color-text-main)] block">
                      {foodControl.mode === 'simple' ? 'Месячный лимит на продукты:' : 'Лимит на дискреционные продукты (сладости, снэки):'}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={limitInput}
                        onChange={(e) => setLimitInput(e.target.value)}
                        onBlur={handleSaveLimit}
                        className="flex-1 px-3 py-2 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-xl text-sm font-bold text-[var(--color-text-main)] focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={handleSaveLimit}
                        className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors"
                      >
                        Сохранить
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Вкладка состава корзины */
              <div className="space-y-4">
                {/* Сводка стоимости */}
                <div className="p-4 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent rounded-2xl border border-emerald-500/20 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase block">
                      Общая стоимость корзины на месяц
                    </span>
                    <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                      {formatRubles(currentBasketTotal)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-[var(--color-text-muted)] block">Позиций:</span>
                    <span className="text-sm font-bold text-[var(--color-text-main)]">{currentItems.length} / 20</span>
                  </div>
                </div>

                {/* Кнопки действий: Сканировать GTIN / Добавить товар */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsScannerOpen(true)}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    <Barcode className="w-4 h-4" />
                    <span>Сканировать штрих-код</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAddingManual(prev => !prev)}
                    className="py-2.5 px-3 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-bg-card-subtle)] text-xs font-bold text-[var(--color-text-main)] flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isAddingManual ? 'Скрыть форму' : 'Добавить вручную'}</span>
                  </button>
                </div>

                {/* Форма добавления вручную */}
                {isAddingManual && (
                  <form onSubmit={handleSaveManualItem} className="p-3.5 bg-[var(--color-bg-card-subtle)] rounded-2xl border border-emerald-500/40 space-y-3 animate-in fade-in">
                    <span className="text-xs font-bold text-[var(--color-text-main)] block">Добавление продукта:</span>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block mb-1">Название</label>
                        <input
                          type="text"
                          placeholder="Например: Творог 5% 200г"
                          value={manualName}
                          onChange={(e) => setManualName(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-lg text-xs font-bold text-[var(--color-text-main)] focus:outline-hidden"
                          autoFocus
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block mb-1">Категория</label>
                        <select
                          value={manualCategory}
                          onChange={(e) => setManualCategory(e.target.value as any)}
                          className="w-full px-2 py-1.5 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-lg text-xs font-medium text-[var(--color-text-main)]"
                        >
                          <option value="молочка">🥛 Молочка</option>
                          <option value="хлеб">🍞 Хлеб</option>
                          <option value="мясо">🥩 Мясо</option>
                          <option value="яйца">🥚 Яйца</option>
                          <option value="крупы">🌾 Крупы</option>
                          <option value="овощи_фрукты">🥦 Овощи / фрукты</option>
                          <option value="масло">🧈 Масло</option>
                          <option value="напитки">☕ Напитки</option>
                          <option value="прочее">🛒 Прочее</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block mb-1">Цена за ед. (₽)</label>
                        <input
                          type="number"
                          placeholder="95"
                          value={manualPrice}
                          onChange={(e) => setManualPrice(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-lg text-xs font-bold text-[var(--color-text-main)] focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block mb-1">Кол-во в месяц</label>
                        <input
                          type="number"
                          step="0.5"
                          value={manualQty}
                          onChange={(e) => setManualQty(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-lg text-xs font-bold text-[var(--color-text-main)] focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block mb-1">Ед. изм.</label>
                        <input
                          type="text"
                          value={manualUnit}
                          onChange={(e) => setManualUnit(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-lg text-xs font-medium text-[var(--color-text-main)] focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsAddingManual(false)}
                        className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)]"
                      >
                        Отмена
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                      >
                        Добавить
                      </button>
                    </div>
                  </form>
                )}

                {/* Список продуктов в корзине */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block">
                    Позиции в корзине:
                  </span>

                  {currentItems.length === 0 ? (
                    <div className="p-6 text-center bg-[var(--color-bg-card-subtle)] rounded-2xl border border-[var(--color-border)]">
                      <ShoppingBasket className="w-8 h-8 text-[var(--color-text-muted)] mx-auto mb-2 opacity-50" />
                      <p className="text-xs font-medium text-[var(--color-text-muted)]">
                        В корзине пока нет продуктов. Сканируйте штрих-коды или добавьте товары вручную.
                      </p>
                    </div>
                  ) : (
                    currentItems.map((item) => {
                      const catInfo = getFoodCategoryLabel(item.category);
                      const totalItemCost = (item.price || 0) * (item.quantityPerMonth || 1);

                      return (
                        <div
                          key={item.id}
                          className="p-3 bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] flex items-center justify-between gap-2 shadow-xs hover:border-emerald-500/30 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span className="text-lg">{catInfo.emoji}</span>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs font-bold text-[var(--color-text-main)] truncate">{item.name}</h4>
                              <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-muted)] mt-0.5">
                                <span>{item.price} ₽ / {item.unit || 'шт'}</span>
                                <span>•</span>
                                <span>{item.quantityPerMonth} {item.unit || 'шт'}/мес</span>
                                {item.gtin && (
                                  <>
                                    <span>•</span>
                                    <span className="font-mono">{item.gtin}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-bold text-[var(--color-text-main)]">
                              {formatRubles(totalItemCost)}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeBasketItem(item.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                              title="Удалить из корзины"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Подвал */}
          <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-bg-card-subtle)] flex items-center justify-between">
            <span className="text-xs text-[var(--color-text-muted)]">
              {foodControl.mode === 'basket' && `Итого в план: ${formatRubles(currentBasketTotal)}`}
              {foodControl.mode === 'simple' && `Лимит в план: ${formatRubles(foodControl.monthlyLimit || 20000)}`}
              {foodControl.mode === 'hybrid' && `Корзина (${formatRubles(currentBasketTotal)}) + Прочие (${formatRubles(foodControl.monthlyLimit || 2000)})`}
            </span>

            <button
              type="button"
              onClick={onClose}
              className="py-2 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              Готово
            </button>
          </div>
        </div>
      </div>

      {/* Модальное окно сканера штрих-кода */}
      <GTINScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onAddProduct={(newProd) => {
          addBasketItem(newProd);
        }}
      />
    </>
  );
};
