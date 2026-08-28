import React, { useState } from 'react';
import { useBudget, formatRubles } from '../context/BudgetContext';
import { 
  Plus, 
  CheckCircle2, 
  Circle, 
  Trash2, 
  Layers, 
  ShoppingBag, 
  Gamepad2, 
  Car, 
  PartyPopper, 
  Home,
  Fuel,
  TrendingUp,
  Edit2,
  Check,
  X
} from 'lucide-react';
import { motion } from 'motion/react';

interface PlanningScreenProps {
  onOpenAddPlanned: () => void;
}

export const PlanningScreen: React.FC<PlanningScreenProps> = ({ onOpenAddPlanned }) => {
  const { 
    state, 
    togglePlannedItemPaid, 
    deletePlannedItem, 
    updatePlannedItemProgress,
    addSpentToPlannedItem,
    freeDiscretionaryBudget,
    baseDailyNorm
  } = useBudget();

  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editSpentVal, setEditSpentVal] = useState<string>('');

  const totalPlanned = state.plannedItems.reduce((sum, item) => sum + item.amount, 0);
  const paidPlanned = state.plannedItems.filter(i => i.isPaid).reduce((sum, i) => sum + i.amount, 0);
  const pendingPlanned = totalPlanned - paidPlanned;
  const paidPercent = totalPlanned > 0 ? Math.round((paidPlanned / totalPlanned) * 100) : 0;

  const filteredItems = state.plannedItems.filter(item => {
    if (filterCategory === 'all') return true;
    return item.category === filterCategory;
  });

  const getCategoryIcon = (category: string, title: string) => {
    if (title.toLowerCase().includes('бенз') || title.toLowerCase().includes('топлив') || title.toLowerCase().includes('азс')) {
      return <Fuel className="w-4 h-4 text-amber-500" />;
    }
    switch (category) {
      case 'игры_хобби':
        return <Gamepad2 className="w-4 h-4 text-purple-500" />;
      case 'авто':
        return <Car className="w-4 h-4 text-blue-500" />;
      case 'мероприятия':
        return <PartyPopper className="w-4 h-4 text-amber-500" />;
      case 'покупки':
        return <ShoppingBag className="w-4 h-4 text-emerald-500" />;
      case 'обязательные':
        return <Home className="w-4 h-4 text-rose-500" />;
      default:
        return <Layers className="w-4 h-4 text-gray-500" />;
    }
  };

  const handleStartEditSpent = (itemId: string, currentSpent: number) => {
    setEditingItemId(itemId);
    setEditSpentVal(currentSpent.toString());
  };

  const handleSaveSpent = (itemId: string) => {
    const val = parseFloat(editSpentVal.replace(/\s+/g, '').replace(',', '.'));
    if (!isNaN(val) && val >= 0) {
      updatePlannedItemProgress(itemId, val);
    }
    setEditingItemId(null);
  };

  return (
    <div className="flex flex-col gap-4 pb-28 pt-2">
      {/* 1. Header Overview Cards */}
      <motion.div 
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[var(--color-bg-card)] rounded-2xl p-5 shadow-xs border border-[var(--color-border)]"
      >
        <span className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">
          Планирование бюджета на 30 дней
        </span>
        <div className="text-3xl font-extrabold text-[var(--color-text-main)] tracking-tight mb-4">
          {formatRubles(state.total30DaysBudget, { showCents: true })}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[var(--color-border)]">
          <div className="bg-[var(--color-bg-card-subtle)] p-2.5 rounded-xl border border-[var(--color-border-subtle)]">
            <span className="text-[10px] font-bold text-[var(--color-text-muted)] block uppercase">С прошлого месяца</span>
            <span className="text-sm font-bold text-[var(--color-text-main)]">
              {formatRubles(state.previousMonthRemainder)}
            </span>
          </div>

          <div className="bg-[var(--color-bg-card-subtle)] p-2.5 rounded-xl border border-[var(--color-border-subtle)]">
            <span className="text-[10px] font-bold text-[var(--color-text-muted)] block uppercase">В подушку</span>
            <span className="text-sm font-bold text-[var(--color-accent)]">
              {formatRubles(state.safetyCushionDeposit)}
            </span>
          </div>

          <div className="bg-[var(--color-accent-badge-bg)] p-2.5 rounded-xl border border-[var(--color-accent-badge-border)]">
            <span className="text-[10px] font-bold text-[var(--color-accent-badge-text)] block uppercase">Итого на прочее</span>
            <span className="text-sm font-extrabold text-[var(--color-accent)]">
              {formatRubles(freeDiscretionaryBudget)}
            </span>
          </div>

          <div className="bg-[#1a2b3c] dark:bg-[#1e293b] p-2.5 rounded-xl text-white border border-transparent dark:border-[var(--color-border)]">
            <span className="text-[10px] font-bold text-[#8192a7] dark:text-[#94a3b8] block uppercase">Итого в день</span>
            <span className="text-sm font-bold text-white">
              {formatRubles(baseDailyNorm)}
            </span>
          </div>
        </div>
      </motion.div>

      {/* 2. Planned Expenses Progress */}
      <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 shadow-xs border border-[var(--color-border)] flex flex-col gap-2.5">
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-[var(--color-text-main)]">
            Оплачено запланированных трат: {paidPercent}%
          </span>
          <span className="text-[var(--color-text-muted)]">
            {formatRubles(paidPlanned)} / {formatRubles(totalPlanned)}
          </span>
        </div>

        <div className="w-full h-2 bg-[var(--color-bg-card-muted)] rounded-full overflow-hidden">
          <div 
            className="h-full bg-[var(--color-accent)] rounded-full transition-all duration-500"
            style={{ width: `${paidPercent}%` }}
          />
        </div>

        <div className="flex justify-between text-[11px] text-[var(--color-text-muted)]">
          <span>Осталось оплатить: <strong className="text-[var(--color-text-main)]">{formatRubles(pendingPlanned)}</strong></span>
          <span>Всего статей: {state.plannedItems.length}</span>
        </div>
      </div>

      {/* 3. Category Filter & Add Item */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-base font-bold text-[var(--color-text-main)]">
            Статьи расходов ({filteredItems.length})
          </h3>
          <button
            onClick={onOpenAddPlanned}
            className="flex items-center gap-1 text-xs font-bold text-white bg-[#041627] dark:bg-[#10b981] dark:text-[#041627] hover:bg-[#1a2b3c] dark:hover:bg-[#059669] px-3 py-1.5 rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Добавить статью</span>
          </button>
        </div>

        {/* Categories chips */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
          {[
            { id: 'all', label: 'Все' },
            { id: 'покупки', label: 'Покупки' },
            { id: 'авто', label: 'Авто & Бензин' },
            { id: 'игры_хобби', label: 'Игры & Хобби' },
            { id: 'обязательные', label: 'Обязательные' },
            { id: 'мероприятия', label: 'Мероприятия' },
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filterCategory === cat.id
                  ? 'bg-[#041627] dark:bg-[#10b981] text-white dark:text-[#041627] shadow-xs'
                  : 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Planned Items List */}
      <div className="flex flex-col gap-2.5">
        {filteredItems.map(item => {
          const isProgress = item.isProgressTracked || item.title.toLowerCase().includes('бенз');
          const spent = item.spentAmount ?? 0;
          const plan = item.amount;
          const diff = plan - spent; // > 0: экономия/остаток, < 0: перерасход
          const isOverBudget = spent > plan;
          const overBudgetAmount = spent - plan;
          const remaining = Math.max(0, diff);
          const percent = plan > 0 ? Math.round((spent / plan) * 100) : 0;

          if (isProgress) {
            return (
              <motion.div
                key={item.id}
                layout
                className={`bg-[var(--color-bg-card)] rounded-2xl p-4 border shadow-xs flex flex-col gap-3 group transition-all ${
                  isOverBudget 
                    ? 'border-rose-500/40 ring-1 ring-rose-500/20' 
                    : 'border-[var(--color-accent)]/40 ring-1 ring-[var(--color-accent)]/20'
                }`}
              >
                {/* Top Row: Title, Badges, Delete */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                      isOverBudget 
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' 
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                    }`}>
                      <Fuel className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-[var(--color-text-main)]">
                          {item.title}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isOverBudget 
                            ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20' 
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
                        }`}>
                          {isOverBudget ? 'Перерасход' : 'Шкала прогресса'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--color-text-muted)]">
                        {item.notes || 'Регулярный расход с лимитом на период'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div className="text-right">
                      <span className="text-sm font-extrabold text-[var(--color-text-main)]">
                        {formatRubles(plan)}
                      </span>
                      <span className="text-[10px] block text-[var(--color-text-muted)] font-medium">
                        план на месяц
                      </span>
                    </div>

                    <button
                      onClick={() => deletePlannedItem(item.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-all ml-1"
                      title="Удалить статью"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress scale / achievement bar */}
                <div className="p-3 rounded-xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)] flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-[var(--color-text-muted)]">Потрачено:</span>
                      {editingItemId === item.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={editSpentVal}
                            onChange={(e) => setEditSpentVal(e.target.value)}
                            className="w-20 px-1.5 py-0.5 text-xs font-bold bg-[var(--color-bg-card)] border border-[var(--color-accent)] rounded"
                            autoFocus
                          />
                          <button 
                            onClick={() => handleSaveSpent(item.id)}
                            className="p-1 text-emerald-600 hover:bg-emerald-500/10 rounded"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => setEditingItemId(null)}
                            className="p-1 text-rose-500 hover:bg-rose-500/10 rounded"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 font-bold text-[var(--color-text-main)]">
                          <span>{formatRubles(spent)}</span>
                          <button
                            onClick={() => handleStartEditSpent(item.id, spent)}
                            className="p-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
                            title="Изменить сумму расхода"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="font-bold text-[var(--color-text-main)]">
                      {isOverBudget ? (
                        <span>
                          Перерасход: <span className="text-rose-600 dark:text-rose-400 font-extrabold">+{formatRubles(overBudgetAmount)}</span>
                        </span>
                      ) : (
                        <span>
                          Остаток лимита: <span className={remaining === 0 ? 'text-amber-500 font-extrabold' : 'text-emerald-600 dark:text-emerald-400 font-extrabold'}>{formatRubles(remaining)}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Visual scale */}
                  <div className="w-full h-3 bg-[var(--color-bg-card-muted)] rounded-full overflow-hidden p-0.5 border border-[var(--color-border-subtle)]">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        isOverBudget 
                          ? 'bg-rose-500' 
                          : percent > 80 
                            ? 'bg-amber-500' 
                            : 'bg-[#006d37] dark:bg-[#10b981]'
                      }`}
                      style={{ width: `${Math.min(100, percent)}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[10.5px] text-[var(--color-text-muted)]">
                    <span>
                      Использовано: <strong className={isOverBudget ? 'text-rose-600 dark:text-rose-400' : ''}>{percent}%</strong>
                    </span>
                    <span className={isOverBudget ? "text-rose-600 dark:text-rose-400 font-bold" : "text-[var(--color-accent)] font-semibold"}>
                      {isOverBudget 
                        ? `Перерасход (${formatRubles(diff)}) учитывается в корректировке`
                        : `Разница (${formatRubles(diff)}) учитывается в корректировке`
                      }
                    </span>
                  </div>
                </div>

                {/* Quick Add Fuel Spending Buttons */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-[11px] text-[var(--color-text-muted)] font-medium">Быстрое добавление заправки:</span>
                  <div className="flex gap-1.5">
                    {[500, 1000, 2000].map(val => (
                      <button
                        key={val}
                        onClick={() => addSpentToPlannedItem(item.id, val)}
                        className="px-2.5 py-1 rounded-lg bg-[var(--color-bg-card-subtle)] hover:bg-[var(--color-bg-card-muted)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] border border-[var(--color-border)] text-xs font-bold transition-all active:scale-95 shadow-xs"
                      >
                        +{val} ₽
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          }

          return (
            <motion.div
              key={item.id}
              layout
              className={`bg-[var(--color-bg-card)] rounded-2xl p-3.5 border transition-all flex items-center justify-between group ${
                item.isPaid 
                  ? 'border-[var(--color-border)] opacity-75' 
                  : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)] shadow-xs'
              }`}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => togglePlannedItemPaid(item.id)}
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                    item.isPaid ? 'text-[var(--color-accent)]' : 'text-[var(--color-border-strong)] hover:text-[var(--color-text-main)]'
                  }`}
                  title={item.isPaid ? 'Отметить как неоплаченное' : 'Отметить как оплаченное'}
                >
                  {item.isPaid ? (
                    <CheckCircle2 className="w-5 h-5 fill-[var(--color-accent-light)] text-[#00210c] dark:text-[#041627]" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </button>

                <div className="w-9 h-9 rounded-xl bg-[var(--color-bg-card-subtle)] flex items-center justify-center border border-[var(--color-border-subtle)]">
                  {getCategoryIcon(item.category, item.title)}
                </div>

                <div>
                  <div className={`text-sm font-bold ${item.isPaid ? 'text-[var(--color-text-muted)] line-through' : 'text-[var(--color-text-main)]'}`}>
                    {item.title}
                  </div>
                  <div className="text-[11px] text-[var(--color-text-muted)]">
                    {item.notes || item.category}
                    {item.plannedAmountAlt && (
                      <span className="text-[var(--color-accent)] font-medium ml-1">
                        (план: {formatRubles(item.plannedAmountAlt)})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-right">
                  <span className={`text-sm font-extrabold ${item.isPaid ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text-main)]'}`}>
                    {formatRubles(item.amount)}
                  </span>
                  <div className="text-[10px] font-semibold text-[var(--color-text-muted)]">
                    {item.isPaid ? 'Оплачено' : 'В планах'}
                  </div>
                </div>

                <button
                  onClick={() => deletePlannedItem(item.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-all ml-1"
                  title="Удалить статью"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
