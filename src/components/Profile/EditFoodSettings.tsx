import React, { useState } from 'react';
import { useBudget, formatRubles } from '../../context/BudgetContext';
import { 
  ShoppingBasket, 
  Layers, 
  Sparkles, 
  Plus, 
  Trash2, 
  Barcode, 
  Check, 
  RefreshCw, 
  Edit3,
  Sliders,
  DollarSign
} from 'lucide-react';
import { FoodControlMode, FoodItem, FoodItemCategory } from '../../types';
import { GTINScanner } from '../Scanner/GTINScanner';
import { calculateBasketTotal, getFoodCategoryLabel } from '../../utils/foodBasketUtils';

interface EditFoodSettingsProps {
  onBack: () => void;
  showToast: (msg: string) => void;
}

export const EditFoodSettings: React.FC<EditFoodSettingsProps> = ({ onBack, showToast }) => {
  const { 
    state, 
    setFoodMode, 
    updateFoodLimit, 
    addBasketItem, 
    updateBasketItem, 
    removeBasketItem,
    syncFoodPlanWithBudget 
  } = useBudget();

  const foodControl = state.foodControl || {
    mode: 'basket',
    basketItems: [],
    basketTotal: 0,
    monthlyLimit: 20000,
    discretionaryLimit: 5000,
  };

  const [currentMode, setCurrentMode] = useState<FoodControlMode>(foodControl.mode || 'basket');
  const [simpleLimit, setSimpleLimit] = useState(String(foodControl.monthlyLimit || 20000));
  const [discretionaryLimit, setDiscretionaryLimit] = useState(String(foodControl.discretionaryLimit || 5000));
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // New item form state
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemQty, setNewItemQty] = useState('2');
  const [newItemUnit, setNewItemUnit] = useState('шт');
  const [newItemCategory, setNewItemCategory] = useState<FoodItemCategory>('молочка');

  // Edit item form state
  const [editPrice, setEditPrice] = useState('');
  const [editQty, setEditQty] = useState('');

  const items = foodControl.basketItems || [];
  const basketTotal = calculateBasketTotal(items);

  const handleModeChange = (mode: FoodControlMode) => {
    setCurrentMode(mode);
    setFoodMode(mode);
    showToast(`Режим изменен на «${mode === 'simple' ? 'Простой лимит' : mode === 'basket' ? 'Потребительская корзина' : 'Гибридный'}»`);
  };

  const handleSaveLimits = () => {
    const numLimit = parseFloat(simpleLimit) || 20000;
    const numDisc = parseFloat(discretionaryLimit) || 5000;
    
    updateFoodLimit(numLimit);
    if (foodControl.mode === 'hybrid') {
      // update discretionary in foodControl
    }
    syncFoodPlanWithBudget();
    showToast('Параметры и лимиты на продукты сохранены');
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemPrice) return;

    addBasketItem({
      name: newItemName.trim(),
      price: parseFloat(newItemPrice) || 0,
      quantityPerMonth: parseFloat(newItemQty) || 1,
      unit: newItemUnit,
      category: newItemCategory,
    });

    setNewItemName('');
    setNewItemPrice('');
    setNewItemQty('2');
    setIsAddingNew(false);
    showToast(`Товар «${newItemName}» добавлен в корзину`);
  };

  const handleStartEdit = (item: FoodItem) => {
    setEditingItemId(item.id);
    setEditPrice(String(item.price));
    setEditQty(String(item.quantityPerMonth));
  };

  const handleSaveEdit = (id: string) => {
    const p = parseFloat(editPrice);
    const q = parseFloat(editQty);
    if (!isNaN(p) && !isNaN(q)) {
      updateBasketItem(id, {
        price: p,
        quantityPerMonth: q,
      });
      showToast('Параметры товара обновлены');
    }
    setEditingItemId(null);
  };

  const handleBarcodeScanned = (product: { name: string; price: number; category?: FoodItemCategory }) => {
    addBasketItem({
      name: product.name,
      price: product.price,
      quantityPerMonth: 2,
      unit: 'шт',
      category: product.category || 'прочее',
    });
    setIsScannerOpen(false);
    showToast(`Отсканировано: ${product.name}`);
  };

  return (
    <div className="space-y-5">
      {/* Mode Selector */}
      <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 border border-[var(--color-border)] shadow-xs space-y-3">
        <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase">
          Режим контроля расходов на еду
        </label>
        
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleModeChange('simple')}
            className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
              currentMode === 'simple'
                ? 'bg-blue-500/10 border-blue-500/40 text-blue-700 dark:text-blue-300 font-bold'
                : 'bg-[var(--color-bg-card-subtle)] border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:border-[var(--color-border)]'
            }`}
          >
            <Sliders className="w-4 h-4 text-blue-500" />
            <span className="text-xs">Простой</span>
          </button>

          <button
            onClick={() => handleModeChange('basket')}
            className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
              currentMode === 'basket'
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold'
                : 'bg-[var(--color-bg-card-subtle)] border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:border-[var(--color-border)]'
            }`}
          >
            <ShoppingBasket className="w-4 h-4 text-emerald-500" />
            <span className="text-xs">Корзина</span>
          </button>

          <button
            onClick={() => handleModeChange('hybrid')}
            className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
              currentMode === 'hybrid'
                ? 'bg-purple-500/10 border-purple-500/40 text-purple-700 dark:text-purple-300 font-bold'
                : 'bg-[var(--color-bg-card-subtle)] border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:border-[var(--color-border)]'
            }`}
          >
            <Layers className="w-4 h-4 text-purple-500" />
            <span className="text-xs">Гибридный</span>
          </button>
        </div>

        <p className="text-[11px] text-[var(--color-text-muted)]">
          {currentMode === 'simple' && 'Фиксированная ежемесячная сумма, разделенная на дни периода.'}
          {currentMode === 'basket' && 'Поэлементная корзина базовых продуктов с отслеживанием цен и инфляции.'}
          {currentMode === 'hybrid' && 'Базовая продуктовая корзина + отдельный лимит на кафе, снэки и спонтанные покупки.'}
        </p>
      </div>

      {/* Simple Mode Limits */}
      {currentMode === 'simple' && (
        <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 border border-[var(--color-border)] shadow-xs space-y-3">
          <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase">
            Месячный лимит на продукты
          </label>
          <div className="relative">
            <input
              type="number"
              value={simpleLimit}
              onChange={(e) => setSimpleLimit(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)] text-sm font-bold text-[var(--color-text-main)] focus:outline-hidden focus:border-[var(--color-accent)]"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--color-text-muted)]">
              ₽/мес
            </span>
          </div>
          <button
            onClick={handleSaveLimits}
            className="w-full py-2.5 rounded-xl bg-[var(--color-accent)] text-white text-xs font-bold transition-all active:scale-98"
          >
            Применить лимит
          </button>
        </div>
      )}

      {/* Hybrid Mode Discretionary Limit */}
      {currentMode === 'hybrid' && (
        <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 border border-[var(--color-border)] shadow-xs space-y-3">
          <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase">
            Дискреционный лимит (кофе, снэки, кафе)
          </label>
          <div className="relative">
            <input
              type="number"
              value={discretionaryLimit}
              onChange={(e) => setDiscretionaryLimit(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)] text-sm font-bold text-[var(--color-text-main)] focus:outline-hidden focus:border-[var(--color-accent)]"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--color-text-muted)]">
              ₽/мес
            </span>
          </div>
        </div>
      )}

      {/* Basket Items Management (for basket & hybrid) */}
      {(currentMode === 'basket' || currentMode === 'hybrid') && (
        <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 border border-[var(--color-border)] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-[var(--color-text-main)] flex items-center gap-2">
                <span>Базовая корзина ({items.length} поз.)</span>
              </h4>
              <p className="text-xs text-[var(--color-text-muted)]">
                Итого в месяц: <b className="text-emerald-600 dark:text-emerald-400">{formatRubles(basketTotal)}</b>
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsScannerOpen(true)}
                title="Сканировать штрихкод"
                className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all text-xs font-bold flex items-center gap-1"
              >
                <Barcode className="w-4 h-4" />
                <span className="hidden sm:inline">Скан</span>
              </button>
              
              <button
                onClick={() => setIsAddingNew(true)}
                className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all text-xs font-bold flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Добавить</span>
              </button>
            </div>
          </div>

          {/* Add item inline form */}
          {isAddingNew && (
            <form onSubmit={handleAddItem} className="p-3.5 rounded-xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)] space-y-3">
              <span className="text-xs font-bold text-[var(--color-text-main)] block">
                Новый базовый продукт
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Название (напр. Молоко 3.2%)"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-main)]"
                  required
                />
                <select
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value as FoodItemCategory)}
                  className="px-3 py-2 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-main)]"
                >
                  <option value="молочка">🥛 Молочные продукты</option>
                  <option value="мясо">🥩 Мясо и птица</option>
                  <option value="рыба">🐟 Рыба и морепродукты</option>
                  <option value="хлеб">🍞 Хлеб и выпечка</option>
                  <option value="крупы">🌾 Крупы и макароны</option>
                  <option value="овощи_фрукты">🍏 Овощи и фрукты</option>
                  <option value="яйца">🥚 Яйца</option>
                  <option value="масло">🧈 Масла и соусы</option>
                  <option value="напитки">☕ Чай, кофе, напитки</option>
                  <option value="сладости">🍫 Сладости и снэки</option>
                  <option value="заморозка">🧊 Заморозка</option>
                  <option value="прочее">📦 Прочее</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  placeholder="Цена (₽)"
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-main)]"
                  required
                />
                <input
                  type="number"
                  placeholder="Кол-во в мес"
                  value={newItemQty}
                  onChange={(e) => setNewItemQty(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-main)]"
                  required
                />
                <input
                  type="text"
                  placeholder="Ед. (шт/кг/л)"
                  value={newItemUnit}
                  onChange={(e) => setNewItemUnit(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-main)]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="px-3 py-1.5 rounded-lg border text-xs font-semibold text-[var(--color-text-muted)]"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                >
                  Сохранить
                </button>
              </div>
            </form>
          )}

          {/* List of items */}
          <div className="divide-y divide-[var(--color-border-subtle)] max-h-96 overflow-y-auto pr-1">
            {items.length === 0 ? (
              <p className="text-xs text-center py-6 text-[var(--color-text-muted)]">
                В корзине пока нет товаров. Добавьте вручную или через сканер.
              </p>
            ) : (
              items.map((item) => {
                const isEditing = editingItemId === item.id;
                const monthlyCost = item.price * item.quantityPerMonth;

                return (
                  <div key={item.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                    {isEditing ? (
                      <div className="flex-1 flex items-center gap-2">
                        <span className="font-bold text-[var(--color-text-main)] shrink-0 max-w-[120px] truncate">
                          {item.name}
                        </span>
                        <input
                          type="number"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="w-16 px-2 py-1 rounded bg-[var(--color-bg-card-subtle)] border text-xs"
                          placeholder="Цена"
                        />
                        <span className="text-[var(--color-text-muted)]">×</span>
                        <input
                          type="number"
                          value={editQty}
                          onChange={(e) => setEditQty(e.target.value)}
                          className="w-12 px-2 py-1 rounded bg-[var(--color-bg-card-subtle)] border text-xs"
                          placeholder="Кол"
                        />
                        <button
                          onClick={() => handleSaveEdit(item.id)}
                          className="p-1 rounded bg-emerald-500/20 text-emerald-600"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="min-w-0 pr-2">
                          <span className="font-bold text-[var(--color-text-main)] block truncate">
                            {item.name}
                          </span>
                          <span className="text-[10px] text-[var(--color-text-muted)]">
                            {item.price} ₽ × {item.quantityPerMonth} {item.unit || 'шт'} = {formatRubles(monthlyCost)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="font-bold text-[var(--color-text-main)]">
                            {formatRubles(monthlyCost)}
                          </span>
                          <button
                            onClick={() => handleStartEdit(item)}
                            className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => removeBasketItem(item.id)}
                            className="p-1.5 text-rose-500 hover:text-rose-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <button
            onClick={() => {
              syncFoodPlanWithBudget();
              showToast('Планы бюджета синхронизированы со стоимостью корзины');
            }}
            className="w-full py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-emerald-500/20 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Синхронизировать корзину с планами бюджета</span>
          </button>
        </div>
      )}

      {/* Scanner modal */}
      {isScannerOpen && (
        <GTINScanner
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onProductScanned={handleBarcodeScanned}
        />
      )}
    </div>
  );
};
