import React, { useState, useMemo } from 'react';
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
  Edit2,
  Check,
  X,
  Calendar,
  ArrowRightLeft,
  RotateCcw,
  Sparkles,
  Repeat,
  Info,
  ShoppingBasket
} from 'lucide-react';
import { motion } from 'motion/react';
import { PlannedItem } from '../types';
import { CreditCardDebtSection } from './CreditCardDebtSection';
import { RegularExpensesModal } from './RegularExpensesModal';
import { FoodBasketModal } from './FoodBasketModal';
import { MarketplaceSyncModal } from './MarketplaceSyncModal';

interface PlanningScreenProps {
  onOpenAddPlanned: () => void;
}

export const PlanningScreen: React.FC<PlanningScreenProps> = ({ onOpenAddPlanned }) => {
  const { 
    state, 
    togglePlannedItemPaid, 
    deletePlannedItem, 
    updatePlannedItem,
    updatePlannedItemProgress,
    addSpentToPlannedItem,
    movePlannedToWishlist,
    transferPlannedItemPeriod,
    togglePlannedItemAutoRenew,
    freeDiscretionaryBudget,
    baseDailyNorm
  } = useBudget();

  const [activePeriodTab, setActivePeriodTab] = useState<'current' | 'next' | 'future' | 'previous' | 'all'>('current');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editSpentVal, setEditSpentVal] = useState<string>('');
  const [isRegularExpensesModalOpen, setIsRegularExpensesModalOpen] = useState<boolean>(false);
  const [isFoodBasketModalOpen, setIsFoodBasketModalOpen] = useState<boolean>(false);
  const [isMarketplaceModalOpen, setIsMarketplaceModalOpen] = useState<boolean>(false);

  // Full item editing state (inline on card)
  const [fullEditId, setFullEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editAmount, setEditAmount] = useState<string>('');
  const [editCategory, setEditCategory] = useState<string>('покупки');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editSpentAmount, setEditSpentAmount] = useState<string>('0');
  const [editIsProgressTracked, setEditIsProgressTracked] = useState<boolean>(false);
  const [editTypicalDay, setEditTypicalDay] = useState<string>('');
  const [editAutoRenew, setEditAutoRenew] = useState<boolean>(true);

  // Transfer period dropdown state
  const [transferMenuId, setTransferMenuId] = useState<string | null>(null);

  // Filter items by period tab
  const periodItems = state.plannedItems.filter(item => {
    const itemPeriod = item.period || 'current';
    if (activePeriodTab === 'current') return itemPeriod === 'current';
    if (activePeriodTab === 'next') return itemPeriod === 'next';
    if (activePeriodTab === 'future') return itemPeriod !== 'current' && itemPeriod !== 'next' && itemPeriod !== 'previous';
    if (activePeriodTab === 'previous') return itemPeriod === 'previous';
    if (activePeriodTab === 'all') return itemPeriod !== 'previous';
    return true;
  });

  // Dynamic month names for tabs
  const { curShortMonth, nextShortMonth, prevShortMonth } = useMemo(() => {
    const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
    const parts = (state.periodStartDate || '2026-09-04').split('-');
    const m = (parseInt(parts[1], 10) || 9) - 1; // 0-based
    const curShort = months[m];
    const nextShort = months[(m + 1) % 12];
    const prevShort = months[(m - 1 + 12) % 12];
    return { curShortMonth: curShort, nextShortMonth: nextShort, prevShortMonth: prevShort };
  }, [state.periodStartDate]);

  // Current month active calculations
  const currentMonthItems = state.plannedItems.filter(i => !i.period || i.period === 'current');
  const totalPlannedCurrent = currentMonthItems.reduce((sum, item) => sum + item.amount, 0);

  const paidPlannedCurrent = currentMonthItems.reduce((sum, item) => {
    if (item.isPaid) return sum + item.amount;
    if (item.isProgressTracked || item.title.toLowerCase().includes('бенз')) {
      return sum + Math.min(item.amount, item.spentAmount || 0);
    }
    return sum;
  }, 0);

  const pendingPlannedCurrent = currentMonthItems.reduce((sum, item) => {
    if (item.isPaid) return sum;
    if (item.isProgressTracked || item.title.toLowerCase().includes('бенз')) {
      const spent = item.spentAmount || 0;
      return sum + Math.max(0, item.amount - spent);
    }
    return sum + item.amount;
  }, 0);

  const paidPercent = totalPlannedCurrent > 0 ? Math.round((paidPlannedCurrent / totalPlannedCurrent) * 100) : 0;

  // Filter by category
  const filteredItems = periodItems.filter(item => {
    if (filterCategory === 'all') return true;
    return item.category === filterCategory;
  });

  const handleStartFullEdit = (item: PlannedItem) => {
    setFullEditId(item.id);
    setEditTitle(item.title);
    setEditAmount(item.amount.toString());
    setEditSpentAmount((item.spentAmount ?? 0).toString());
    setEditCategory(item.category);
    setEditNotes(item.notes || '');
    setEditIsProgressTracked(Boolean(item.isProgressTracked || item.title.toLowerCase().includes('бенз')));
    setEditTypicalDay(item.typicalDay ? item.typicalDay.toString() : '');
    setEditAutoRenew(item.autoRenew !== false);
    setTransferMenuId(null);
  };

  const handleSaveFullEdit = (itemId: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const parsedAmount = parseFloat(editAmount.replace(/\s+/g, '').replace(',', '.'));
    const parsedSpent = parseFloat(editSpentAmount.replace(/\s+/g, '').replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    const parsedDay = editTypicalDay ? parseInt(editTypicalDay, 10) : undefined;

    updatePlannedItem(itemId, {
      title: editTitle.trim() || 'Статья расхода',
      amount: parsedAmount,
      spentAmount: !isNaN(parsedSpent) && parsedSpent >= 0 ? parsedSpent : 0,
      category: editCategory as any,
      notes: editNotes.trim(),
      isProgressTracked: editIsProgressTracked,
      typicalDay: parsedDay && parsedDay >= 1 && parsedDay <= 31 ? parsedDay : undefined,
      autoRenew: editAutoRenew,
    });

    setFullEditId(null);
  };

  const handleTransferToPeriod = (itemId: string, targetPeriodKey: string, label: string) => {
    transferPlannedItemPeriod(itemId, targetPeriodKey);
    updatePlannedItem(itemId, {
      notes: targetPeriodKey === 'current' ? 'Текущий месяц' : `Перенесено: ${label}`,
    });
    setTransferMenuId(null);
  };

  const canMoveToWishlist = (item: PlannedItem) => {
    const t = item.title.toLowerCase();
    if (item.category === 'обязательные') return false;
    if (item.isProgressTracked) return false;
    if (
      t.includes('бенз') ||
      t.includes('ростелеком') ||
      t.includes('ddx') ||
      t.includes('корректировк') ||
      t.includes('ozon') ||
      t.includes('озон') ||
      t.includes('интернет') ||
      t.includes('жкх')
    ) {
      return false;
    }
    return true;
  };

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
          Планирование бюджета на 30 дней ({state.periodTitle})
        </span>
        <div className="text-3xl font-extrabold text-[var(--color-text-main)] tracking-tight mb-4">
          {formatRubles(state.total30DaysBudget, { showCents: true })}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 pt-3 border-t border-[var(--color-border)]">
          <div className="bg-[var(--color-bg-card-subtle)] p-2.5 rounded-xl border border-[var(--color-border-subtle)] flex flex-col justify-center min-w-0 overflow-hidden">
            <span className="text-[9.5px] sm:text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-tight whitespace-nowrap truncate block">
              С прошлого месяца
            </span>
            <span className="text-xs sm:text-sm font-extrabold text-[var(--color-text-main)] whitespace-nowrap truncate block mt-0.5">
              {formatRubles(state.previousMonthRemainder)}
            </span>
          </div>

          <div className="bg-[var(--color-bg-card-subtle)] p-2.5 rounded-xl border border-[var(--color-border-subtle)] flex flex-col justify-center min-w-0 overflow-hidden">
            <span className="text-[9.5px] sm:text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-tight whitespace-nowrap truncate block">
              В подушку
            </span>
            <span className="text-xs sm:text-sm font-extrabold text-[var(--color-accent)] whitespace-nowrap truncate block mt-0.5">
              {formatRubles(state.safetyCushionDeposit)}
            </span>
          </div>

          <div className="bg-[var(--color-accent-badge-bg)] p-2.5 rounded-xl border border-[var(--color-accent-badge-border)] flex flex-col justify-center min-w-0 overflow-hidden">
            <span className="text-[9.5px] sm:text-[10px] font-bold text-[var(--color-accent-badge-text)] uppercase tracking-tight whitespace-nowrap truncate block">
              Итого на прочее
            </span>
            <span className="text-xs sm:text-sm font-black text-[var(--color-accent)] whitespace-nowrap truncate block mt-0.5">
              {formatRubles(freeDiscretionaryBudget)}
            </span>
          </div>

          <div className="bg-[#1a2b3c] dark:bg-[#1e293b] p-2.5 rounded-xl text-white border border-transparent dark:border-[var(--color-border)] flex flex-col justify-center min-w-0 overflow-hidden">
            <span className="text-[9.5px] sm:text-[10px] font-bold text-[#8192a7] dark:text-[#94a3b8] uppercase tracking-tight whitespace-nowrap truncate block">
              Итого в день
            </span>
            <span className="text-xs sm:text-sm font-extrabold text-white whitespace-nowrap truncate block mt-0.5">
              {formatRubles(baseDailyNorm)}
            </span>
          </div>
        </div>
      </motion.div>

      {/* 2. Planned Expenses Progress */}
      <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 shadow-xs border border-[var(--color-border)] flex flex-col gap-2.5">
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-[var(--color-text-main)]">
            Оплачено запланированных трат текущего месяца: {paidPercent}%
          </span>
          <span className="text-[var(--color-text-muted)]">
            {formatRubles(paidPlannedCurrent)} / {formatRubles(totalPlannedCurrent)}
          </span>
        </div>

        <div className="w-full h-2 bg-[var(--color-bg-card-muted)] rounded-full overflow-hidden">
          <div 
            className="h-full bg-[var(--color-accent)] rounded-full transition-all duration-500"
            style={{ width: `${paidPercent}%` }}
          />
        </div>

        <div className="flex justify-between text-[11px] text-[var(--color-text-muted)] flex-wrap gap-1">
          <span>Осталось оплатить: <strong className="text-[var(--color-text-main)] font-extrabold">{formatRubles(pendingPlannedCurrent)}</strong></span>
          <span>Статей в текущем месяце: {currentMonthItems.length}</span>
        </div>
      </div>

      {/* Credit Cards Debt Repayment Section (renders only if debt cards exist) */}
      <CreditCardDebtSection />

      {/* 3. Period Selection Tabs */}
      <div className="bg-[var(--color-bg-card)] rounded-2xl p-2.5 shadow-xs border border-[var(--color-border)] flex flex-col gap-2">
        <div className="flex justify-between items-center px-1">
          <span className="text-xs font-bold text-[var(--color-text-main)] flex items-center gap-1.5 uppercase tracking-wider">
            <Calendar className="w-3.5 h-3.5 text-[var(--color-accent)]" />
            Период планирования:
          </span>
          <span className="text-[11px] text-[var(--color-text-muted)]">
            {filteredItems.length} {filteredItems.length === 1 ? 'статья' : 'статей'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
          <button
            onClick={() => setActivePeriodTab('current')}
            className={`py-2 px-1.5 sm:px-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all text-center whitespace-nowrap truncate cursor-pointer ${
              activePeriodTab === 'current'
                ? 'bg-[#041627] dark:bg-[#10b981] text-white dark:text-[#041627] shadow-xs'
                : 'bg-[var(--color-bg-card-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] border border-[var(--color-border-subtle)]'
            }`}
          >
            Текущий ({curShortMonth}) ({currentMonthItems.length})
          </button>
          <button
            onClick={() => setActivePeriodTab('next')}
            className={`py-2 px-1.5 sm:px-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all text-center whitespace-nowrap truncate cursor-pointer ${
              activePeriodTab === 'next'
                ? 'bg-[#041627] dark:bg-[#10b981] text-white dark:text-[#041627] shadow-xs'
                : 'bg-[var(--color-bg-card-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] border border-[var(--color-border-subtle)]'
            }`}
          >
            След. месяц ({nextShortMonth})
          </button>
          <button
            onClick={() => setActivePeriodTab('future')}
            className={`py-2 px-1.5 sm:px-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all text-center whitespace-nowrap truncate cursor-pointer ${
              activePeriodTab === 'future'
                ? 'bg-[#041627] dark:bg-[#10b981] text-white dark:text-[#041627] shadow-xs'
                : 'bg-[var(--color-bg-card-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] border border-[var(--color-border-subtle)]'
            }`}
          >
            Отложенные
          </button>
          <button
            onClick={() => setActivePeriodTab('previous')}
            className={`py-2 px-1.5 sm:px-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all text-center whitespace-nowrap truncate cursor-pointer ${
              activePeriodTab === 'previous'
                ? 'bg-[#041627] dark:bg-[#10b981] text-white dark:text-[#041627] shadow-xs'
                : 'bg-[var(--color-bg-card-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] border border-[var(--color-border-subtle)]'
            }`}
          >
            Архив ({prevShortMonth})
          </button>
          <button
            onClick={() => setActivePeriodTab('all')}
            className={`py-2 px-1.5 sm:px-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all text-center whitespace-nowrap truncate cursor-pointer col-span-2 sm:col-span-1 ${
              activePeriodTab === 'all'
                ? 'bg-[#041627] dark:bg-[#10b981] text-white dark:text-[#041627] shadow-xs'
                : 'bg-[var(--color-bg-card-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] border border-[var(--color-border-subtle)]'
            }`}
          >
            Все активные
          </button>
        </div>
      </div>

      {/* 4. Category Filter & Add Item */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center px-1 flex-wrap gap-2">
          <h3 className="text-base font-bold text-[var(--color-text-main)]">
            {activePeriodTab === 'current' && 'Статьи текущего месяца'}
            {activePeriodTab === 'next' && 'Перенесенные на следующий месяц'}
            {activePeriodTab === 'future' && 'Отложенные статьи'}
            {activePeriodTab === 'previous' && 'Архив планов предыдущего месяца'}
            {activePeriodTab === 'all' && 'Все активные статьи'} ({filteredItems.length})
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsMarketplaceModalOpen(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/40 border border-purple-200 dark:border-purple-900/50 px-3 py-1.5 rounded-xl shadow-xs transition-colors cursor-pointer"
              title="Синхронизация с маркетплейсами Wildberries и OZON"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>WB / OZON</span>
            </button>

            <button
              onClick={() => setIsFoodBasketModalOpen(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-900/50 px-3 py-1.5 rounded-xl shadow-xs transition-colors cursor-pointer"
              title="Настройка продуктовой корзины и лимитов"
            >
              <ShoppingBasket className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Корзина продуктов</span>
            </button>

            <button
              onClick={() => setIsRegularExpensesModalOpen(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-900/50 px-3 py-1.5 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>ИИ Анализ расходов</span>
            </button>

            <button
              onClick={onOpenAddPlanned}
              className="flex items-center gap-1 text-xs font-bold text-white bg-[#041627] dark:bg-[#10b981] dark:text-[#041627] hover:bg-[#1a2b3c] dark:hover:bg-[#059669] px-3 py-1.5 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Добавить статью</span>
            </button>
          </div>
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
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
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

      {/* 5. Planned Items List */}
      <div className="flex flex-col gap-2.5">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-muted)] flex flex-col items-center gap-2">
            <Calendar className="w-8 h-8 opacity-40 text-[var(--color-text-muted)]" />
            <p className="text-sm font-semibold">В этом периоде нет запланированных статей</p>
            <button
              onClick={() => setActivePeriodTab('current')}
              className="text-xs text-[var(--color-accent)] font-bold hover:underline"
            >
              Вернуться к текущему месяцу
            </button>
          </div>
        ) : (
          filteredItems.map(item => {
            const isProgress = item.isProgressTracked || item.title.toLowerCase().includes('бенз');
            const spent = item.spentAmount ?? 0;
            const plan = item.amount;
            const diff = plan - spent; // Plan 18000, Fact 12000 => diff 6000
            const isOverBudget = spent > plan;
            const overBudgetAmount = spent - plan;
            const remainingToPay = Math.max(0, diff);
            const percent = plan > 0 ? Math.round((spent / plan) * 100) : 0;
            const isTransferred = item.period && item.period !== 'current';

            if (fullEditId === item.id) {
              return (
                <motion.form
                  key={item.id}
                  layout
                  onSubmit={(e) => handleSaveFullEdit(item.id, e)}
                  className="bg-[var(--color-bg-card)] rounded-2xl p-4 border-2 border-[var(--color-accent)]/50 shadow-xs flex flex-col gap-3"
                >
                  <div className="flex justify-between items-center pb-1 border-b border-[var(--color-border)]">
                    <span className="text-xs font-bold text-[var(--color-text-main)] flex items-center gap-1.5">
                      <Edit2 className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                      Редактирование цели / расхода: <span className="text-[var(--color-accent)]">{item.title}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setFullEditId(null)}
                      className="text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] p-1 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block mb-1">
                        Название статьи / цели
                      </label>
                      <input
                        type="text"
                        required
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Напр. Бенз, DDX Fitness, МФУ"
                        className="w-full h-8 px-2.5 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-lg text-xs font-bold text-[var(--color-text-main)]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block mb-1">
                        Плановый лимит / сумма, ₽
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        placeholder="18000"
                        className="w-full h-8 px-2.5 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-lg text-xs font-bold text-[var(--color-text-main)]"
                      />
                    </div>
                  </div>

                  {/* Fact spent amount if progress tracked */}
                  {(editIsProgressTracked || editCategory === 'авто' || isProgress) && (
                    <div className="p-2.5 rounded-xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)]">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block">
                          Фактически потрачено (Факт / заправки), ₽
                        </label>
                        <span className="text-[10px] text-[var(--color-text-muted)]">
                          Останется лимит: {formatRubles(Math.max(0, (parseFloat(editAmount) || 0) - (parseFloat(editSpentAmount) || 0)))}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editSpentAmount}
                          onChange={(e) => setEditSpentAmount(e.target.value)}
                          placeholder="12000"
                          className="w-full h-8 px-2.5 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-lg text-xs font-bold text-[var(--color-text-main)]"
                        />
                        <div className="flex gap-1 shrink-0">
                          {[500, 1000, 2000].map(val => (
                            <button
                              type="button"
                              key={val}
                              onClick={() => {
                                const curr = parseFloat(editSpentAmount) || 0;
                                setEditSpentAmount((curr + val).toString());
                              }}
                              className="px-1.5 py-1 text-[10px] font-semibold bg-[var(--color-bg-card)] border border-[var(--color-border)] hover:bg-[var(--color-bg-card-muted)] rounded-lg cursor-pointer text-[var(--color-text-secondary)]"
                            >
                              +{val}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block mb-1">
                        Категория
                      </label>
                      <select
                        value={editCategory}
                        onChange={(e) => {
                          const newCat = e.target.value;
                          setEditCategory(newCat);
                          if (newCat === 'авто') {
                            setEditIsProgressTracked(true);
                          }
                        }}
                        className="w-full h-8 px-2 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-lg text-xs font-semibold text-[var(--color-text-main)]"
                      >
                        <option value="покупки">Покупки</option>
                        <option value="авто">Авто & Бензин</option>
                        <option value="игры_хобби">Игры & Хобби</option>
                        <option value="обязательные">Обязательные</option>
                        <option value="мероприятия">Мероприятия</option>
                        <option value="прочее">Прочее</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block mb-1">
                        День списания (1–31)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        placeholder="Например: 5"
                        value={editTypicalDay}
                        onChange={(e) => setEditTypicalDay(e.target.value)}
                        className="w-full h-8 px-2.5 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-lg text-xs font-semibold text-[var(--color-text-main)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block mb-1">
                      Примечание
                    </label>
                    <input
                      type="text"
                      placeholder="Например: Текущий месяц / Сентябрь"
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      className="w-full h-8 px-2.5 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-lg text-xs font-medium text-[var(--color-text-main)]"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 py-1">
                    <label className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)] cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={editAutoRenew}
                        onChange={(e) => setEditAutoRenew(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-[var(--color-border)] text-[#006d37] focus:ring-[#006d37]"
                      />
                      <span className="font-medium">Автоматически продлевать на следующий месяц</span>
                    </label>

                    {/* Toggle progress tracking */}
                    <label className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)] cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={editIsProgressTracked}
                        onChange={(e) => setEditIsProgressTracked(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-[var(--color-border)] text-[#006d37] focus:ring-[#006d37]"
                      />
                      <span className="font-medium">Регулярный расход с мини-шкалой прогресса (План vs Факт)</span>
                    </label>
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-[var(--color-border-subtle)]">
                    <div className="flex items-center gap-1.5">
                      {canMoveToWishlist(item) && (
                        <button
                          type="button"
                          onClick={() => movePlannedToWishlist(item.id)}
                          className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                        >
                          Перенести в вишлист
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFullEditId(null)}
                        className="px-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]/50 rounded-xl transition-colors cursor-pointer"
                      >
                        Отмена
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-[#006d37] dark:bg-[#10b981] dark:text-[#041627] hover:bg-[#005228] text-white text-xs font-bold rounded-xl shadow-xs active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Сохранить</span>
                      </button>
                    </div>
                  </div>
                </motion.form>
              );
            }

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
                  {/* Top Row: Title, Badges, Plan & Actions */}
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
                        <div className="flex items-center gap-2 flex-wrap">
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
                          {item.isAutoGenerated && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5 text-blue-500" />
                              ИИ-план
                            </span>
                          )}
                          {item.typicalDay && (
                            <span className="text-[10px] font-medium text-[var(--color-text-secondary)] flex items-center gap-0.5 bg-[var(--color-bg-card-subtle)] px-2 py-0.5 rounded-full border border-[var(--color-border-subtle)]">
                              <Calendar className="w-2.5 h-2.5 text-blue-500" />
                              {item.typicalDay}-е число
                            </span>
                          )}
                          {isTransferred && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                              {item.period === 'next' ? 'Октябрь 2026' : 'Отложено'}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--color-text-muted)]">
                          {item.notes || 'План vs Факт с автоматическим учетом заправок'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
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
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-all ml-1 cursor-pointer"
                        title="Удалить статью"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Progress scale / achievement bar: Plan 18000, Spent 12000 => Left 6000 */}
                  <div className="p-3 rounded-xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)] flex flex-col gap-2">
                    <div className="flex justify-between items-center text-xs flex-wrap gap-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-[var(--color-text-muted)]">Факт (потрачено):</span>
                        {editingItemId === item.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={editSpentVal}
                              onChange={(e) => setEditSpentVal(e.target.value)}
                              className="w-24 px-2 py-0.5 text-xs font-bold bg-[var(--color-bg-card)] border border-[var(--color-accent)] rounded-lg text-[var(--color-text-main)]"
                              autoFocus
                            />
                            <button 
                              onClick={() => handleSaveSpent(item.id)}
                              className="p-1 text-emerald-600 hover:bg-emerald-500/10 rounded cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => setEditingItemId(null)}
                              className="p-1 text-rose-500 hover:bg-rose-500/10 rounded cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 font-bold text-[var(--color-text-main)]">
                            <span>{formatRubles(spent)}</span>
                            <button
                              onClick={() => handleStartEditSpent(item.id, spent)}
                              className="p-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] cursor-pointer"
                              title="Изменить фактическую сумму"
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
                            Осталось оплатить: <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{formatRubles(remainingToPay)}</span>
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
                            : 'bg-[#006d37] dark:bg-[#10b981]'
                        }`}
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[10.5px] text-[var(--color-text-muted)]">
                      <span>
                        Использовано: <strong className={isOverBudget ? 'text-rose-600 dark:text-rose-400' : ''}>{percent}%</strong> ({formatRubles(spent)} из {formatRubles(plan)})
                      </span>
                      <span className={isOverBudget ? "text-rose-600 dark:text-rose-400 font-bold" : "text-[var(--color-accent)] font-semibold"}>
                        {isOverBudget 
                          ? `Перерасход: +${formatRubles(overBudgetAmount)}`
                          : `Остаток лимита: ${formatRubles(remainingToPay)}`
                        }
                      </span>
                    </div>
                  </div>

                  {/* Quick Add Fuel Spending Buttons & Actions */}
                  <div className="flex items-center justify-between pt-1 text-xs flex-wrap gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-[var(--color-text-muted)] font-medium">Заправка:</span>
                      <div className="flex gap-1">
                        {[500, 1000, 2000].map(val => (
                          <button
                            key={val}
                            onClick={() => addSpentToPlannedItem(item.id, val)}
                            className="px-2 py-0.5 rounded-lg bg-[var(--color-bg-card-subtle)] hover:bg-[var(--color-bg-card-muted)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] border border-[var(--color-border)] text-[11px] font-bold transition-all active:scale-95 shadow-xs cursor-pointer"
                          >
                            +{val} ₽
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleStartFullEdit(item)}
                        className="text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] font-semibold flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-[var(--color-bg-card-subtle)] cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Редактировать</span>
                      </button>

                      {/* Transfer Period Button */}
                      <div className="relative">
                        <button
                          onClick={() => setTransferMenuId(transferMenuId === item.id ? null : item.id)}
                          className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <ArrowRightLeft className="w-3 h-3" />
                          <span>{isTransferred ? 'Сменить период' : 'Перенести период'}</span>
                        </button>

                        {transferMenuId === item.id && (
                          <div className="absolute right-0 top-full mt-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl shadow-lg p-1.5 z-20 flex flex-col gap-1 min-w-[200px]">
                            <span className="text-[10px] font-bold text-[var(--color-text-muted)] px-2 py-0.5 uppercase">
                              Перенести в период:
                            </span>
                            <button
                              onClick={() => handleTransferToPeriod(item.id, 'current', 'Текущий месяц')}
                              className="text-left px-2 py-1 text-xs text-[var(--color-text-main)] hover:bg-[var(--color-bg-card-subtle)] rounded-lg transition-colors font-medium"
                            >
                              Текущий месяц
                            </button>
                            <button
                              onClick={() => handleTransferToPeriod(item.id, 'next', 'Следующий месяц (Октябрь)')}
                              className="text-left px-2 py-1 text-xs text-[var(--color-text-main)] hover:bg-[var(--color-bg-card-subtle)] rounded-lg transition-colors font-medium"
                            >
                              Следующий месяц (Октябрь 2026)
                            </button>
                            <button
                              onClick={() => handleTransferToPeriod(item.id, 'future', 'Отложено')}
                              className="text-left px-2 py-1 text-xs text-[var(--color-text-main)] hover:bg-[var(--color-bg-card-subtle)] rounded-lg transition-colors font-medium"
                            >
                              Отложить на будущие периоды
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            }

            return (
              <motion.div
                key={item.id}
                layout
                className={`bg-[var(--color-bg-card)] rounded-2xl p-3.5 border transition-all flex flex-col gap-2 group ${
                  item.isPaid 
                    ? 'border-[var(--color-border)] opacity-75' 
                    : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)] shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => togglePlannedItemPaid(item.id)}
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-bold ${item.isPaid ? 'text-[var(--color-text-muted)] line-through' : 'text-[var(--color-text-main)]'}`}>
                          {item.title}
                        </span>
                        {item.type === 'food_basket' && (
                          <button
                            onClick={() => setIsFoodBasketModalOpen(true)}
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 flex items-center gap-1 hover:bg-emerald-500/20 transition-colors"
                          >
                            <ShoppingBasket className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                            Корзина
                          </button>
                        )}
                        {item.type === 'food_discretionary' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 flex items-center gap-1">
                            Дискреционные
                          </span>
                        )}
                        {item.isAutoGenerated && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5 text-blue-500" />
                            ИИ-план
                          </span>
                        )}
                        {item.typicalDay && (
                          <span className="text-[10px] font-medium text-[var(--color-text-secondary)] flex items-center gap-0.5 bg-[var(--color-bg-card-subtle)] px-2 py-0.5 rounded-full border border-[var(--color-border-subtle)]">
                            <Calendar className="w-2.5 h-2.5 text-blue-500" />
                            {item.typicalDay}-е число
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-1.5 flex-wrap">
                        <span>{item.notes || item.category}</span>
                        {isTransferred && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                            {item.period === 'next' ? 'Октябрь 2026' : 'Отложено'}
                          </span>
                        )}
                        {item.plannedAmountAlt && (
                          <span className="text-[var(--color-accent)] font-medium">
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
                      className="opacity-0 group-hover:opacity-100 p-1 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-all ml-1 cursor-pointer"
                      title="Удалить статью"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Bottom Actions: Edit inline & Period selection / Move to Wishlist */}
                <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border-subtle)] text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => handleStartFullEdit(item)}
                      className="text-[11px] font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Редактировать</span>
                    </button>

                    <button
                      onClick={() => togglePlannedItemAutoRenew(item.id)}
                      title="Нажмите, чтобы переключить автопродление на следующий месяц"
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg border flex items-center gap-1 transition-all cursor-pointer ${
                        item.autoRenew !== false
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                          : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20'
                      }`}
                    >
                      <Repeat className="w-2.5 h-2.5" />
                      <span>{item.autoRenew !== false ? 'Авто' : 'Разовый'}</span>
                    </button>

                    {/* Period Transfer Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setTransferMenuId(transferMenuId === item.id ? null : item.id)}
                        className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <ArrowRightLeft className="w-3 h-3" />
                        <span>{isTransferred ? 'Сменить период ▾' : 'Перенести период ▾'}</span>
                      </button>

                      {transferMenuId === item.id && (
                        <div className="absolute left-0 top-full mt-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl shadow-lg p-1.5 z-20 flex flex-col gap-1 min-w-[200px]">
                          <span className="text-[10px] font-bold text-[var(--color-text-muted)] px-2 py-0.5 uppercase">
                            Выберите период:
                          </span>
                          <button
                            onClick={() => handleTransferToPeriod(item.id, 'current', 'Текущий месяц')}
                            className="text-left px-2.5 py-1.5 text-xs text-[var(--color-text-main)] hover:bg-[var(--color-bg-card-subtle)] rounded-lg transition-colors font-medium flex items-center justify-between"
                          >
                            <span>Текущий месяц</span>
                            {!item.period || item.period === 'current' ? <Check className="w-3 h-3 text-[var(--color-accent)]" /> : null}
                          </button>
                          <button
                            onClick={() => handleTransferToPeriod(item.id, 'next', 'Следующий месяц (Октябрь)')}
                            className="text-left px-2.5 py-1.5 text-xs text-[var(--color-text-main)] hover:bg-[var(--color-bg-card-subtle)] rounded-lg transition-colors font-medium flex items-center justify-between"
                          >
                            <span>След. месяц (Октябрь 2026)</span>
                            {item.period === 'next' ? <Check className="w-3 h-3 text-[var(--color-accent)]" /> : null}
                          </button>
                          <button
                            onClick={() => handleTransferToPeriod(item.id, 'future', 'Отложено')}
                            className="text-left px-2.5 py-1.5 text-xs text-[var(--color-text-main)] hover:bg-[var(--color-bg-card-subtle)] rounded-lg transition-colors font-medium flex items-center justify-between"
                          >
                            <span>Отложить на неопределенный срок</span>
                            {item.period === 'future' ? <Check className="w-3 h-3 text-[var(--color-accent)]" /> : null}
                          </button>
                        </div>
                      )}
                    </div>

                    {isTransferred && (
                      <button
                        onClick={() => handleTransferToPeriod(item.id, 'current', 'Текущий месяц')}
                        className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Вернуть в текущий</span>
                      </button>
                    )}
                  </div>

                  {canMoveToWishlist(item) && (
                    <button
                      onClick={() => movePlannedToWishlist(item.id)}
                      className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                      title="Перенести в список желаний"
                    >
                      В вишлист →
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      <RegularExpensesModal
        isOpen={isRegularExpensesModalOpen}
        onClose={() => setIsRegularExpensesModalOpen(false)}
      />

      <FoodBasketModal
        isOpen={isFoodBasketModalOpen}
        onClose={() => setIsFoodBasketModalOpen(false)}
      />

      <MarketplaceSyncModal
        isOpen={isMarketplaceModalOpen}
        onClose={() => setIsMarketplaceModalOpen(false)}
      />
    </div>
  );
};
