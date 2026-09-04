import React, { useState } from 'react';
import { useBudget, formatRubles } from '../../context/BudgetContext';
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Repeat, 
  Calendar, 
  Edit2, 
  Check, 
  RefreshCw,
  FolderPlus,
  ShieldAlert
} from 'lucide-react';
import { PlannedItem } from '../../types';
import { RegularExpensesModal } from '../RegularExpensesModal';

interface EditRegularExpensesProps {
  onBack: () => void;
  showToast: (msg: string) => void;
}

export const EditRegularExpenses: React.FC<EditRegularExpensesProps> = ({ onBack, showToast }) => {
  const { 
    state, 
    addPlannedItem, 
    updatePlannedItem, 
    deletePlannedItem, 
    togglePlannedItemAutoRenew 
  } = useBudget();

  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // New item form state
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDay, setNewDay] = useState('5');
  const [newCategory, setNewCategory] = useState<PlannedItem['category']>('обязательные');

  // Edit item form state
  const [editAmount, setEditAmount] = useState('');
  const [editTitle, setEditTitle] = useState('');

  // Фильтруем все регулярные или плановые статьи
  const regularItems = (state.plannedItems || []).filter(
    item => item.type === 'regular' || item.autoRenew || item.category === 'обязательные'
  );

  const totalRegularSum = regularItems.reduce((acc, it) => acc + it.amount, 0);

  // Группировка по категориям
  const groupedItems = React.useMemo<Record<string, PlannedItem[]>>(() => {
    const map: Record<string, PlannedItem[]> = {};
    regularItems.forEach(item => {
      const cat = item.category || 'обязательные';
      if (!map[cat]) map[cat] = [];
      map[cat].push(item);
    });
    return map;
  }, [regularItems]);

  const handleCreateRegular = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newAmount) return;

    addPlannedItem({
      title: newTitle.trim(),
      amount: parseFloat(newAmount) || 0,
      category: newCategory,
      isPaid: false,
      type: 'regular',
      autoRenew: true,
      typicalDay: parseInt(newDay, 10) || 5,
      notes: `Регулярный платеж (${newDay}-е число месяца)`,
    });

    setNewTitle('');
    setNewAmount('');
    setNewDay('5');
    setIsAddingNew(false);
    showToast(`Регулярный расход «${newTitle}» добавлен`);
  };

  const handleStartEdit = (item: PlannedItem) => {
    setEditingItemId(item.id);
    setEditTitle(item.title);
    setEditAmount(String(item.amount));
  };

  const handleSaveEdit = (id: string) => {
    const p = parseFloat(editAmount);
    if (!isNaN(p) && editTitle.trim()) {
      updatePlannedItem(id, {
        title: editTitle.trim(),
        amount: p,
      });
      showToast('Регулярный расход обновлен');
    }
    setEditingItemId(null);
  };

  return (
    <div className="space-y-5">
      {/* Summary Header */}
      <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 border border-[var(--color-border)] shadow-xs flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase block">
            Всего регулярных платежей
          </span>
          <span className="text-xl font-extrabold text-[var(--color-text-main)] block mt-0.5">
            {formatRubles(totalRegularSum)}
          </span>
          <span className="text-[11px] text-[var(--color-text-muted)]">
            {regularItems.length} запланированных статей
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-end gap-1.5">
          <button
            onClick={() => setIsAnalysisModalOpen(true)}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center gap-1.5 hover:bg-blue-500/20 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>Запустить анализ</span>
          </button>

          <button
            onClick={() => setIsAddingNew(true)}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-500/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Добавить</span>
          </button>
        </div>
      </div>

      {/* Add New Regular Form */}
      {isAddingNew && (
        <form onSubmit={handleCreateRegular} className="bg-[var(--color-bg-card)] rounded-2xl p-4 border border-[var(--color-border)] shadow-xs space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
            Новый регулярный расход
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Название (напр. Интернет Ростелеком)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-main)] font-semibold"
              required
            />
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as PlannedItem['category'])}
              className="px-3 py-2.5 rounded-xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-main)] font-semibold"
            >
              <option value="обязательные">🔒 Обязательные (ЖКХ, Связь)</option>
              <option value="покупки">🛍️ Покупки / Подписки</option>
              <option value="авто">🚗 Авто и транспорт</option>
              <option value="игры_хобби">🎮 Игры и хобби</option>
              <option value="прочее">📦 Прочее</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="Сумма (₽)"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-main)] font-semibold"
              required
            />
            <div className="relative">
              <input
                type="number"
                min="1"
                max="31"
                placeholder="День списания (1-31)"
                value={newDay}
                onChange={(e) => setNewDay(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-main)] font-semibold"
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-muted)]">
                число
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAddingNew(false)}
              className="px-3.5 py-1.5 rounded-xl border text-xs font-semibold text-[var(--color-text-muted)]"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
            >
              Добавить статью
            </button>
          </div>
        </form>
      )}

      {/* List of Regular Expenses Grouped */}
      <div className="space-y-4">
        {Object.keys(groupedItems).length === 0 ? (
          <div className="bg-[var(--color-bg-card)] rounded-2xl p-6 border border-[var(--color-border)] text-center text-xs text-[var(--color-text-muted)]">
            Нет активных регулярных расходов. Запустите ИИ-анализ или добавьте вручную.
          </div>
        ) : (
          (Object.entries(groupedItems) as [string, PlannedItem[]][]).map(([category, items]) => (
            <div key={category} className="bg-[var(--color-bg-card)] rounded-2xl p-4 border border-[var(--color-border)] shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                  {category === 'обязательные' ? '🔒 Обязательные платежи' : category}
                </h4>
                <span className="text-xs font-bold text-[var(--color-text-main)]">
                  {formatRubles(items.reduce((sum, i) => sum + i.amount, 0))}
                </span>
              </div>

              <div className="divide-y divide-[var(--color-border-subtle)]">
                {items.map((item) => {
                  const isEditing = editingItemId === item.id;

                  return (
                    <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                      {isEditing ? (
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="flex-1 px-2.5 py-1 rounded-lg bg-[var(--color-bg-card-subtle)] border text-xs font-bold"
                          />
                          <input
                            type="number"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className="w-24 px-2.5 py-1 rounded-lg bg-[var(--color-bg-card-subtle)] border text-xs font-bold"
                          />
                          <button
                            onClick={() => handleSaveEdit(item.id)}
                            className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-600"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="min-w-0 pr-2">
                            <span className="font-bold text-[var(--color-text-main)] block truncate">
                              {item.title}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-[var(--color-text-muted)]">
                                {item.typicalDay ? `Списание ${item.typicalDay}-го числа` : 'Ежемесячно'}
                              </span>
                              {item.autoRenew && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center gap-0.5">
                                  <Repeat className="w-2.5 h-2.5" />
                                  Автопродление
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-extrabold text-[var(--color-text-main)]">
                              {formatRubles(item.amount)}
                            </span>

                            {/* AutoRenew toggle button */}
                            <button
                              onClick={() => {
                                togglePlannedItemAutoRenew(item.id);
                                showToast(`Автопродление ${!item.autoRenew ? 'включено' : 'выключено'}`);
                              }}
                              title={item.autoRenew ? 'Выключить автопродление' : 'Включить автопродление'}
                              className={`p-1.5 rounded-lg border transition-all ${
                                item.autoRenew
                                  ? 'bg-blue-500/10 border-blue-500/20 text-blue-600'
                                  : 'bg-[var(--color-bg-card-subtle)] border-[var(--color-border-subtle)] text-[var(--color-text-muted)]'
                              }`}
                            >
                              <Repeat className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleStartEdit(item)}
                              className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                if (window.confirm(`Удалить регулярный расход «${item.title}»?`)) {
                                  deletePlannedItem(item.id);
                                  showToast('Расход удален');
                                }
                              }}
                              className="p-1.5 text-rose-500 hover:text-rose-700"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Analysis Modal Component */}
      <RegularExpensesModal
        isOpen={isAnalysisModalOpen}
        onClose={() => setIsAnalysisModalOpen(false)}
      />
    </div>
  );
};
