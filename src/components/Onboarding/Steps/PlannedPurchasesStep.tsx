import React, { useState, useMemo } from 'react';
import { useBudget, formatRubles } from '../../../context/BudgetContext';
import { useProfile } from '../../../context/ProfileContext';
import { PlannedItem } from '../../../types';
import { 
  calculatePlannedExpensesSum, 
  calculateFreeDiscretionaryBudget, 
  calculateDailyNorm 
} from '../../../utils/normCalculator';
import { 
  ShoppingBag, 
  Plus, 
  Trash2, 
  Sparkles, 
  Calendar, 
  Car, 
  Gamepad2, 
  PartyPopper, 
  Shield, 
  Tag, 
  ArrowRight,
  Check,
  CalendarClock
} from 'lucide-react';

interface Props {
  onNext: () => void;
  onPrev: () => void;
  isFirst: boolean;
  isLast: boolean;
}

const CATEGORY_OPTIONS: { value: PlannedItem['category']; label: string; icon: React.ReactNode }[] = [
  { value: 'покупки', label: 'Покупки', icon: <ShoppingBag className="w-3.5 h-3.5 text-blue-500" /> },
  { value: 'авто', label: 'Авто', icon: <Car className="w-3.5 h-3.5 text-indigo-500" /> },
  { value: 'игры_хобби', label: 'Хобби', icon: <Gamepad2 className="w-3.5 h-3.5 text-purple-500" /> },
  { value: 'мероприятия', label: 'Отдых / События', icon: <PartyPopper className="w-3.5 h-3.5 text-amber-500" /> },
  { value: 'обязательные', label: 'Обязательные', icon: <Shield className="w-3.5 h-3.5 text-emerald-500" /> },
  { value: 'прочее', label: 'Прочее', icon: <Tag className="w-3.5 h-3.5 text-gray-500" /> },
];

const QUICK_SUGGESTIONS = [
  { title: 'Новый смартфон', category: 'покупки' as const, suggestedAmount: 45000 },
  { title: 'Стоматолог / Лечение', category: 'обязательные' as const, suggestedAmount: 15000 },
  { title: 'Билеты в отпуск', category: 'мероприятия' as const, suggestedAmount: 25000 },
  { title: 'ТО авто / Шины', category: 'авто' as const, suggestedAmount: 18000 },
  { title: 'Сезонная одежда', category: 'покупки' as const, suggestedAmount: 12000 },
];

export const PlannedPurchasesStep: React.FC<Props> = ({ onNext }) => {
  const { state, addPlannedItem, deletePlannedItem } = useBudget();
  const { profile } = useProfile();

  // Track item IDs added in this step to distinguish from regular expenses
  const [addedItemIds, setAddedItemIds] = useState<string[]>(() => {
    return (state.plannedItems || [])
      .filter(item => item.id.startsWith('planned-onboarding-'))
      .map(item => item.id);
  });

  // Form fields
  const [isFormOpen, setIsFormOpen] = useState<boolean>(true);
  const [title, setTitle] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<PlannedItem['category']>('покупки');
  const [period, setPeriod] = useState<'current' | 'next'>('current');
  const [notes, setNotes] = useState<string>('');

  // Items added in this step
  const addedPurchases = useMemo(() => {
    return (state.plannedItems || []).filter(item => addedItemIds.includes(item.id));
  }, [state.plannedItems, addedItemIds]);

  // Base parameters for norm calculations
  const totalBudget = profile?.fixedPartAmount || state.total30DaysBudget || 90000;
  const cushionPercent = state.cushionNormPercent ?? 10;
  const safetyCushionDeposit = state.safetyCushionDeposit ?? Math.round(totalBudget * (cushionPercent / 100));
  const totalDays = state.days?.length || 30;

  // Base planned items excluding purchases added in this step
  const baseOtherPlans = useMemo(() => {
    return (state.plannedItems || []).filter(item => !addedItemIds.includes(item.id));
  }, [state.plannedItems, addedItemIds]);

  // Daily limit without one-off purchases
  const baseDailyNorm = useMemo(() => {
    const basePlannedSum = calculatePlannedExpensesSum(baseOtherPlans);
    const baseDiscretionary = calculateFreeDiscretionaryBudget(totalBudget, basePlannedSum, safetyCushionDeposit);
    return calculateDailyNorm(baseDiscretionary, totalDays);
  }, [baseOtherPlans, totalBudget, safetyCushionDeposit, totalDays]);

  // Daily limit with already added purchases + currently typed in form
  const { effectiveDailyNorm, hasCurrentImpact } = useMemo(() => {
    // Current purchases already added
    const currentAddedPurchases = addedPurchases.filter(item => !item.period || item.period === 'current');
    const addedCurrentSum = currentAddedPurchases.reduce((acc, item) => acc + item.amount, 0);

    // Currently typed amount in form if period === 'current'
    const inputAmountNum = parseFloat(amount.replace(/\s+/g, '').replace(',', '.')) || 0;
    const pendingAmount = (isFormOpen && period === 'current' && inputAmountNum > 0) ? inputAmountNum : 0;

    const basePlannedSum = calculatePlannedExpensesSum(baseOtherPlans);
    const effectivePlannedSum = basePlannedSum + addedCurrentSum + pendingAmount;
    const effectiveDiscretionary = calculateFreeDiscretionaryBudget(totalBudget, effectivePlannedSum, safetyCushionDeposit);
    const norm = calculateDailyNorm(effectiveDiscretionary, totalDays);

    return {
      effectiveDailyNorm: norm,
      hasCurrentImpact: (addedCurrentSum + pendingAmount) > 0,
    };
  }, [addedPurchases, amount, isFormOpen, period, baseOtherPlans, totalBudget, safetyCushionDeposit, totalDays]);

  const handleAddPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount.replace(/\s+/g, '').replace(',', '.'));
    if (!title.trim() || isNaN(numAmount) || numAmount <= 0) return;

    const newId = `planned-onboarding-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    
    addPlannedItem({
      id: newId,
      title: title.trim(),
      amount: numAmount,
      category,
      period,
      isPaid: false,
      autoRenew: false,
      type: 'regular',
      notes: notes.trim() || undefined,
    });

    setAddedItemIds(prev => [...prev, newId]);
    setTitle('');
    setAmount('');
    setNotes('');
    setPeriod('current');
    setIsFormOpen(false);
  };

  const handleDelete = (id: string) => {
    deletePlannedItem(id);
    setAddedItemIds(prev => prev.filter(item => item !== id));
  };

  const handleQuickSuggestion = (suggestion: typeof QUICK_SUGGESTIONS[0]) => {
    setTitle(suggestion.title);
    setCategory(suggestion.category);
    if (!amount) {
      setAmount(suggestion.suggestedAmount.toString());
    }
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Шапка с возможностью пропустить */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-snug">
            Планируете крупные покупки в этом периоде?
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Укажите разовые расходы (техника, отпуск, лечение), чтобы заранее рассчитать безопасную дневную норму.
          </p>
        </div>
      </div>

      {/* Кнопка "Пропустить, добавлю позже" */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onNext}
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40"
        >
          <span>Пропустить, добавлю позже</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Быстрые подсказки для ввода */}
      {!isFormOpen && addedPurchases.length === 0 && (
        <div className="bg-gray-50 dark:bg-slate-800/40 rounded-2xl p-3 border border-gray-100 dark:border-slate-800">
          <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Популярные статьи:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_SUGGESTIONS.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleQuickSuggestion(item)}
                className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shadow-2xs"
              >
                + {item.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Список уже добавленных покупок */}
      {addedPurchases.length > 0 && (
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center justify-between">
            <span>Запланировано ({addedPurchases.length})</span>
            <span className="text-gray-700 dark:text-gray-300 font-semibold">
              Итого: {formatRubles(addedPurchases.reduce((sum, item) => sum + item.amount, 0), { showCents: false })}
            </span>
          </div>

          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {addedPurchases.map(item => (
              <div 
                key={item.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 shadow-2xs text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 dark:text-white truncate">
                      {item.title}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400">
                      <span className="capitalize">{item.category}</span>
                      <span>•</span>
                      <span className={item.period === 'next' ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-blue-600 dark:text-blue-400 font-medium'}>
                        {item.period === 'next' ? 'Следующий месяц' : 'Текущий месяц'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-bold text-gray-900 dark:text-white">
                    {formatRubles(item.amount, { showCents: false })}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="p-1 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    title="Удалить"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Форма добавления пункта плана */}
      {isFormOpen ? (
        <form onSubmit={handleAddPurchase} className="bg-gray-50 dark:bg-slate-800/60 rounded-2xl p-3.5 border border-gray-200 dark:border-slate-700 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Параметры покупки</span>
            </span>
            {addedPurchases.length > 0 && (
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="text-[11px] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Свернуть
              </button>
            )}
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">
              Название покупки *
            </label>
            <input
              type="text"
              required
              placeholder="Напр. Новый телефон, Стоматолог, Билеты"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full text-xs font-medium bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">
                Сумма (₽) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="15 000"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full text-xs font-bold bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">
                Категория
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as PlannedItem['category'])}
                className="w-full text-xs font-medium bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {CATEGORY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Выбор периода списания */}
          <div>
            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1.5">
              Период списания
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPeriod('current')}
                className={`py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                  period === 'current'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>В этом месяце</span>
              </button>

              <button
                type="button"
                onClick={() => setPeriod('next')}
                className={`py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                  period === 'next'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800'
                }`}
              >
                <CalendarClock className="w-3.5 h-3.5" />
                <span>В следующем</span>
              </button>
            </div>
          </div>

          {/* Примечание */}
          <div>
            <input
              type="text"
              placeholder="Примечание (необязательно)"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full text-xs font-medium bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Сохранить покупку</span>
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setIsFormOpen(true)}
          className="w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center justify-center gap-1.5 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Добавить ещё покупку</span>
        </button>
      )}

      {/* Честный динамический расчет влияния на дневной лимит */}
      <div className="rounded-2xl p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-indigo-950/40 border border-blue-100 dark:border-slate-700/80">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-gray-700 dark:text-gray-300">
            Лимит на день:
          </span>

          {hasCurrentImpact ? (
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400 dark:text-gray-500 line-through">
                {formatRubles(baseDailyNorm, { showCents: false })}
              </span>
              <span className="text-blue-600 dark:text-blue-400 font-bold">
                → {formatRubles(effectiveDailyNorm, { showCents: false })}
              </span>
              <span className="text-[10px] font-semibold text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-1.5 py-0.5 rounded-md">
                -{formatRubles(baseDailyNorm - effectiveDailyNorm, { showCents: false })}/день
              </span>
            </div>
          ) : (
            <span className="font-bold text-blue-600 dark:text-blue-400">
              {formatRubles(baseDailyNorm, { showCents: false })}
            </span>
          )}
        </div>

        {period === 'next' && isFormOpen && amount && parseFloat(amount) > 0 && (
          <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-1">
            Покупка относится к следующему периоду и не уменьшает лимит текущего месяца.
          </p>
        )}
      </div>
    </div>
  );
};
