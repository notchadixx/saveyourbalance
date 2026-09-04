import React, { useState, useEffect } from 'react';
import { useBudget, formatRubles } from '../context/BudgetContext';
import { SuggestedRegularExpense, ExpenseCategory } from '../types';
import { 
  Sparkles, 
  X, 
  Check, 
  Trash2, 
  Plus, 
  Calendar, 
  AlertCircle, 
  TrendingUp, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Edit2, 
  Info,
  Repeat
} from 'lucide-react';

interface RegularExpensesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RegularExpensesModal: React.FC<RegularExpensesModalProps> = ({ isOpen, onClose }) => {
  const { 
    state, 
    analyzeRegularExpenses, 
    applySuggestedPlans, 
    setRegularExpensesAnalyzed,
    ignoreMerchant,
    getPaymentDateAdvice
  } = useBudget();

  const [suggestions, setSuggestions] = useState<SuggestedRegularExpense[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(true);

  // Manual addition
  const [isAddingManual, setIsAddingManual] = useState<boolean>(false);
  const [manualTitle, setManualTitle] = useState<string>('');
  const [manualAmount, setManualAmount] = useState<string>('');
  const [manualDay, setManualDay] = useState<number>(state.salaryDateDay || 5);
  const [manualCategory, setManualCategory] = useState<ExpenseCategory>('обязательные');

  // Editing existing suggestion
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [editDay, setEditDay] = useState<string>('');

  // Guide accordion
  const [showOptimizationGuide, setShowOptimizationGuide] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnalyzing(true);
      const timer = setTimeout(() => {
        const detected = analyzeRegularExpenses();
        setSuggestions(detected);
        setSelectedIds(new Set(detected.map(d => d.id)));
        setIsAnalyzing(false);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const dateAdvice = getPaymentDateAdvice();

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === suggestions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(suggestions.map(s => s.id)));
    }
  };

  const handleRemove = (id: string, merchant: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== id));
    const next = new Set(selectedIds);
    next.delete(id);
    setSelectedIds(next);
    ignoreMerchant(merchant);
  };

  const handleStartEdit = (item: SuggestedRegularExpense) => {
    setEditingId(item.id);
    setEditAmount((item.isFixed ? item.amount : (item.predictedAmount || item.amount)).toString());
    setEditDay(item.typicalDay.toString());
  };

  const handleSaveEdit = (id: string) => {
    const parsedAmount = parseFloat(editAmount);
    const parsedDay = parseInt(editDay, 10);

    if (!isNaN(parsedAmount) && parsedAmount > 0) {
      setSuggestions(prev => prev.map(s => {
        if (s.id === id) {
          return {
            ...s,
            amount: parsedAmount,
            predictedAmount: s.isFixed ? undefined : parsedAmount,
            typicalDay: !isNaN(parsedDay) ? Math.min(31, Math.max(1, parsedDay)) : s.typicalDay
          };
        }
        return s;
      }));
    }
    setEditingId(null);
  };

  const handleAddManual = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(manualAmount.replace(/\s/g, '').replace(',', '.'));
    if (!manualTitle.trim() || isNaN(amountNum) || amountNum <= 0) return;

    const newId = `manual-sug-${Date.now()}`;
    const newSug: SuggestedRegularExpense = {
      id: newId,
      merchant: manualTitle.trim(),
      title: manualTitle.trim(),
      amount: amountNum,
      typicalDay: manualDay || 5,
      periodicity: 'monthly',
      confidence: 1.0,
      isFixed: true,
      category: manualCategory,
      notes: `Добавлено вручную (${manualDay}-е число)`
    };

    setSuggestions(prev => [...prev, newSug]);
    setSelectedIds(prev => new Set([...prev, newId]));
    setManualTitle('');
    setManualAmount('');
    setIsAddingManual(false);
  };

  const selectedItems = suggestions.filter(s => selectedIds.has(s.id));
  const totalSelectedMonthly = selectedItems.reduce((acc, curr) => {
    const amt = curr.isFixed ? curr.amount : (curr.predictedAmount || curr.amount);
    return acc + amt;
  }, 0);

  const handleApplyToPlan = () => {
    if (selectedItems.length > 0) {
      applySuggestedPlans(selectedItems);
      setRegularExpensesAnalyzed(true);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[var(--color-bg-card)] w-full max-w-xl max-h-[90vh] rounded-3xl shadow-2xl border border-[var(--color-border)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Шапка модального окна */}
        <div className="p-4 sm:p-5 border-b border-[var(--color-border)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--color-text-main)] flex items-center gap-2">
                <span>Анализ регулярных расходов</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                  ИИ-Ассистент
                </span>
              </h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                Автоматический поиск повторяющихся списаний и оптимизация дат
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[var(--color-bg-card-subtle)] text-[var(--color-text-muted)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Контент */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {isAnalyzing ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center animate-pulse">
                <Sparkles className="w-6 h-6" />
              </div>
              <p className="text-xs font-semibold text-[var(--color-text-main)]">
                Сканируем историю транзакций за 6–12 месяцев...
              </p>
            </div>
          ) : (
            <>
              {/* Статистика */}
              <div className="p-3.5 rounded-2xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)] flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-[var(--color-text-muted)] block">
                    Выбрано к включению в план:
                  </span>
                  <span className="text-xs font-bold text-[var(--color-text-main)]">
                    {selectedItems.length} из {suggestions.length} платежей
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-semibold text-[var(--color-text-muted)] block">
                    Сумма в месяц:
                  </span>
                  <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400">
                    {formatRubles(totalSelectedMonthly)}
                  </span>
                </div>
              </div>

              {/* Панель управления выбором */}
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{selectedIds.size === suggestions.length ? 'Снять все' : 'Выбрать все'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsAddingManual(!isAddingManual)}
                  className="px-2.5 py-1 rounded-lg bg-[var(--color-bg-card-subtle)] hover:bg-[var(--color-border)] text-[var(--color-text-main)] font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer border border-[var(--color-border-subtle)]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Добавить вручную</span>
                </button>
              </div>

              {/* Форма ручного добавления */}
              {isAddingManual && (
                <form onSubmit={handleAddManual} className="p-3.5 rounded-2xl bg-[var(--color-bg-card)] border border-blue-200 dark:border-blue-900/50 shadow-xs space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-[var(--color-border)]">
                    <span className="text-xs font-bold text-[var(--color-text-main)] flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-blue-600" />
                      Добавить регулярный платёж
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingManual(false)}
                      className="text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] text-xs"
                    >
                      Отмена
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block mb-1">
                        Название
                      </label>
                      <input
                        type="text"
                        required
                        value={manualTitle}
                        onChange={(e) => setManualTitle(e.target.value)}
                        placeholder="Напр. Детский сад, Парковка"
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] text-[var(--color-text-main)]"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block mb-1">
                        Сумма (₽)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={manualAmount}
                        onChange={(e) => setManualAmount(e.target.value)}
                        placeholder="4500"
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] text-[var(--color-text-main)]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block mb-1">
                        День списания (1–31)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={manualDay}
                        onChange={(e) => setManualDay(parseInt(e.target.value, 10) || 5)}
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] text-[var(--color-text-main)]"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block mb-1">
                        Категория
                      </label>
                      <select
                        value={manualCategory}
                        onChange={(e) => setManualCategory(e.target.value as ExpenseCategory)}
                        className="w-full text-xs px-2 py-1.5 rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] text-[var(--color-text-main)]"
                      >
                        <option value="обязательные">Обязательные</option>
                        <option value="авто">Авто / Бензин</option>
                        <option value="игры_хобби">Подписки / Хобби</option>
                        <option value="покупки">Покупки</option>
                        <option value="прочее">Прочее</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                  >
                    Добавить в список
                  </button>
                </form>
              )}

              {/* Список предложений */}
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-0.5">
                {suggestions.length === 0 ? (
                  <div className="p-6 text-center rounded-2xl bg-[var(--color-bg-card-subtle)] border border-dashed border-[var(--color-border)]">
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Регулярные расходы не найдены. Вы можете добавить их вручную.
                    </p>
                  </div>
                ) : (
                  suggestions.map((item) => {
                    const isSelected = selectedIds.has(item.id);
                    const isEditing = editingId === item.id;
                    const effectiveAmount = item.isFixed ? item.amount : (item.predictedAmount || item.amount);

                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-2xl border transition-all ${
                          isSelected
                            ? 'bg-[var(--color-bg-card)] border-blue-200 dark:border-blue-900 shadow-xs'
                            : 'bg-[var(--color-bg-card-subtle)] border-[var(--color-border-subtle)] opacity-60'
                        }`}
                      >
                        {isEditing ? (
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-[var(--color-text-main)]">
                                {item.title}
                              </span>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
                              >
                                Отмена
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] text-[var(--color-text-muted)] font-semibold block mb-0.5">
                                  Сумма (₽)
                                </label>
                                <input
                                  type="number"
                                  value={editAmount}
                                  onChange={(e) => setEditAmount(e.target.value)}
                                  className="w-full text-xs px-2 py-1 rounded-lg border border-blue-300 dark:border-blue-700 bg-[var(--color-input-bg)] text-[var(--color-text-main)] font-bold"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-[var(--color-text-muted)] font-semibold block mb-0.5">
                                  День месяца (1-31)
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  max="31"
                                  value={editDay}
                                  onChange={(e) => setEditDay(e.target.value)}
                                  className="w-full text-xs px-2 py-1 rounded-lg border border-blue-300 dark:border-blue-700 bg-[var(--color-input-bg)] text-[var(--color-text-main)] font-bold"
                                />
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleSaveEdit(item.id)}
                              className="w-full py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg shadow-xs"
                            >
                              Сохранить
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2.5">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelect(item.id)}
                                className="mt-1 w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                              />

                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-bold text-[var(--color-text-main)]">
                                    {item.title}
                                  </span>

                                  {item.isFixed ? (
                                    <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/50">
                                      Фиксированный
                                    </span>
                                  ) : (
                                    <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-900/50">
                                      Прогноз с трендом
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-muted)]">
                                  <span className="flex items-center gap-1 font-medium text-[var(--color-text-main)]">
                                    <Calendar className="w-3 h-3 text-blue-500" />
                                    {item.typicalDay}-е число
                                  </span>
                                  <span>•</span>
                                  <span>{item.occurrenceCount ? `${item.occurrenceCount} списаний` : 'Ежемесячно'}</span>
                                </div>

                                {!item.isFixed && item.predictedAmount && (
                                  <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                                    Средняя: {formatRubles(item.amount)} → Прогноз: ~{formatRubles(item.predictedAmount)}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="text-right shrink-0 space-y-1">
                              <div className="text-xs font-extrabold text-[var(--color-text-main)]">
                                {formatRubles(effectiveAmount)}
                              </div>

                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(item)}
                                  className="p-1 text-[var(--color-text-muted)] hover:text-blue-600 transition-colors"
                                  title="Редактировать сумму или дату"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemove(item.id, item.merchant)}
                                  className="p-1 text-[var(--color-text-muted)] hover:text-rose-500 transition-colors"
                                  title="Удалить из списка и игнорировать"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Совет по оптимизации дат платежей */}
              {dateAdvice.hasScatteredDates && suggestions.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-amber-900 dark:text-amber-200 block">
                        Совет по оптимизации дат платежей
                      </span>
                      <p className="text-[11px] text-amber-800/90 dark:text-amber-300 leading-relaxed">
                        {dateAdvice.recommendationText}
                      </p>
                    </div>
                  </div>

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setShowOptimizationGuide(!showOptimizationGuide)}
                      className="w-full py-2 px-3 rounded-xl bg-amber-100/80 dark:bg-amber-900/40 hover:bg-amber-200/80 text-amber-900 dark:text-amber-200 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5" />
                        <span>Как перенести даты платежей (инструкция)</span>
                      </span>
                      {showOptimizationGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {showOptimizationGuide && (
                      <div className="mt-2.5 p-3 rounded-xl bg-[var(--color-bg-card)] border border-amber-200 dark:border-amber-800/60 space-y-2 text-xs">
                        <div className="space-y-1.5">
                          {dateAdvice.providersGuide.map((prov, idx) => (
                            <div
                              key={idx}
                              className="p-2 rounded-lg bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)]"
                            >
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="font-bold text-[var(--color-text-main)] text-[11px]">
                                  {prov.name}
                                </span>
                                <span className="text-[9.5px] font-semibold text-[var(--color-text-muted)]">
                                  {prov.category}
                                </span>
                              </div>
                              <p className="text-[10.5px] text-[var(--color-text-secondary)] leading-snug">
                                {prov.howToChange}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Футер */}
        <div className="p-4 sm:p-5 border-t border-[var(--color-border)] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-card-subtle)] transition-colors"
          >
            Отмена
          </button>

          <button
            type="button"
            onClick={handleApplyToPlan}
            disabled={selectedItems.length === 0}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Добавить выбранные в план ({selectedItems.length})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
