import React, { useState, useEffect } from 'react';
import { useBudget, formatRubles } from '../../../context/BudgetContext';
import { useProfile } from '../../../context/ProfileContext';
import { SuggestedRegularExpense, ExpenseCategory } from '../../../types';
import { 
  Sparkles, 
  Check, 
  Trash2, 
  Plus, 
  Calendar, 
  AlertCircle, 
  TrendingUp, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Edit2,
  Info,
  ExternalLink,
  Repeat
} from 'lucide-react';

interface Props {
  onNext: () => void;
  onPrev: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export const RegularExpensesStep: React.FC<Props> = ({ onNext }) => {
  const { 
    state, 
    analyzeRegularExpenses, 
    applySuggestedPlans, 
    setRegularExpensesAnalyzed,
    ignoreMerchant,
    getPaymentDateAdvice
  } = useBudget();

  const { profile, setProfile } = useProfile();
  const profileType = profile?.profileType;
  const bonusDateDay = profile?.bonusDateDay || 25;
  const regularPaymentsDay = profile?.regularPaymentsDay || 5;

  // Load AI analysis suggestions
  const [suggestions, setSuggestions] = useState<SuggestedRegularExpense[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(true);

  // Manual addition modal / accordion state
  const [isAddingManual, setIsAddingManual] = useState<boolean>(false);
  const [manualTitle, setManualTitle] = useState<string>('');
  const [manualAmount, setManualAmount] = useState<string>('');
  const [manualDay, setManualDay] = useState<number>(state.salaryDateDay || 5);
  const [manualCategory, setManualCategory] = useState<ExpenseCategory>('обязательные');

  // Editing existing suggestion
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [editDay, setEditDay] = useState<string>('');

  // Date optimization guide expanded state
  const [showOptimizationGuide, setShowOptimizationGuide] = useState<boolean>(false);
  const [selectedProviderGuide, setSelectedProviderGuide] = useState<string | null>(null);

  useEffect(() => {
    // Simulate smart analysis run with instant load
    const timer = setTimeout(() => {
      const detected = analyzeRegularExpenses();
      setSuggestions(detected);
      setSelectedIds(new Set(detected.map(d => d.id)));
      setIsAnalyzing(false);
    }, 400);

    return () => clearTimeout(timer);
  }, []);

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

  // Calculate selected total
  const selectedItems = suggestions.filter(s => selectedIds.has(s.id));
  const totalSelectedMonthly = selectedItems.reduce((acc, curr) => {
    const amt = curr.isFixed ? curr.amount : (curr.predictedAmount || curr.amount);
    return acc + amt;
  }, 0);

  // Sync with budget context when moving forward
  useEffect(() => {
    // Whenever selected suggestions change, update the budget context prepared plans
    if (selectedItems.length > 0) {
      applySuggestedPlans(selectedItems);
    }
  }, [selectedIds, suggestions]);

  if (isAnalyzing) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 animate-pulse">
            <Sparkles className="w-7 h-7" />
          </div>
          <div className="absolute -inset-1 rounded-2xl border-2 border-blue-500/30 animate-ping opacity-30" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            Анализируем банковские транзакции...
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs">
            Ищем повторяющиеся платежи за последние 6–12 месяцев (ЖКХ, интернет, связь, подписки, спорт).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Заголовок шага */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Repeat className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                <span>Регулярные расходы</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                  ИИ Анализ
                </span>
              </h2>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
          Мы нашли повторяющиеся платежи в вашей истории. Выберите, какие из них включить в ежемесячный план бюджета.
        </p>
      </div>

      {/* Сводная плашка: Количество и Сумма */}
      <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800/80 border border-blue-100/80 dark:border-slate-700 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 block">
            Выбрано к включению в план:
          </span>
          <span className="text-xs font-bold text-gray-900 dark:text-white">
            {selectedItems.length} из {suggestions.length} платежей
          </span>
        </div>

        <div className="text-right">
          <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 block">
            Итого в месяц:
          </span>
          <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400">
            {formatRubles(totalSelectedMonthly)}
          </span>
        </div>
      </div>

      {/* Рекомендации под выбранный финансовый профиль */}
      {profileType === 'variable' && (
        <div className="p-3.5 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Рекомендация: автоплатежи в день премии ({bonusDateDay}-е число)</span>
          </div>
          <p className="text-xs text-amber-800/90 dark:text-amber-300/80 leading-relaxed">
            Для профиля «Оклад + бонусы/KPI» рекомендуем настроить все автоплатежи и списания именно на {bonusDateDay}-е число (день начисления премии). Это сразу закроет обязательные статьи в момент поступления переменной части и исключит неопределенность с лимитами на жизнь.
          </p>
        </div>
      )}

      {profileType === 'freelance' && (
        <div className="p-3.5 rounded-2xl bg-purple-50/90 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/50 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-purple-900 dark:text-purple-200">
            <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
            <span>Рекомендация для «Своего профиля»: единая дата платежей</span>
          </div>
          <p className="text-xs text-purple-800/90 dark:text-purple-300/80 leading-relaxed">
            Поскольку ваш доход переменный, рекомендуем настроить регулярные автоплатежи в одну постоянную дату. Периоды бюджета будут автоматически синхронизированы с этой датой (с {regularPaymentsDay}-го по {regularPaymentsDay > 1 ? regularPaymentsDay - 1 : 31}-е число). Если регулярных расходов нет — период строится с 1-го по последнее число месяца.
          </p>

          <div className="flex items-center justify-between pt-1 border-t border-purple-200/60 dark:border-purple-900/40">
            <span className="text-xs font-medium text-purple-950 dark:text-purple-200">
              Целевой день регулярных списаний:
            </span>
            <div className="flex items-center gap-2">
              <select
                value={regularPaymentsDay}
                onChange={(e) => {
                  const day = parseInt(e.target.value, 10) || 1;
                  if (profile) {
                    setProfile({
                      ...profile,
                      regularPaymentsDay: day,
                      periodStartDay: day,
                    });
                  }
                }}
                className="px-2.5 py-1 text-xs font-bold rounded-lg border border-purple-300 dark:border-purple-800 bg-white dark:bg-slate-900 text-purple-900 dark:text-purple-200 cursor-pointer"
              >
                <option value={1}>1-е число (календарный месяц)</option>
                <option value={5}>5-е число</option>
                <option value={10}>10-е число</option>
                <option value={15}>15-е число</option>
                <option value={20}>20-е число</option>
                <option value={25}>25-е число</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Быстрые действия: Выбрать все / Добавить */}
      <div className="flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={toggleSelectAll}
          className="text-blue-600 dark:text-blue-400 hover:underline font-semibold text-xs cursor-pointer flex items-center gap-1"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{selectedIds.size === suggestions.length ? 'Снять все' : 'Выбрать все'}</span>
        </button>

        <button
          type="button"
          onClick={() => setIsAddingManual(!isAddingManual)}
          className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200 font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Добавить расход</span>
        </button>
      </div>

      {/* Форма ручного добавления расхода */}
      {isAddingManual && (
        <form onSubmit={handleAddManual} className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-900/50 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-gray-100 dark:border-slate-700">
            <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              Добавить регулярный платёж
            </span>
            <button
              type="button"
              onClick={() => setIsAddingManual(false)}
              className="text-gray-400 hover:text-gray-600 text-xs"
            >
              Отмена
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 block mb-1">
                Название / Поставщик
              </label>
              <input
                type="text"
                required
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                placeholder="Напр. Паркинг, Секция"
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 block mb-1">
                Сумма в месяц (₽)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={manualAmount}
                onChange={(e) => setManualAmount(e.target.value)}
                placeholder="3500"
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 block mb-1">
                День списания (1–31)
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={manualDay}
                onChange={(e) => setManualDay(parseInt(e.target.value, 10) || 5)}
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 block mb-1">
                Категория
              </label>
              <select
                value={manualCategory}
                onChange={(e) => setManualCategory(e.target.value as ExpenseCategory)}
                className="w-full text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white"
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

      {/* Список найденных регулярных расходов */}
      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-0.5">
        {suggestions.length === 0 ? (
          <div className="p-6 text-center rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-dashed border-gray-200 dark:border-slate-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Регулярные расходы не найдены. Вы можете добавить их вручную с помощью кнопки выше.
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
                    ? 'bg-white dark:bg-slate-800 border-blue-200 dark:border-blue-900 shadow-xs'
                    : 'bg-gray-50/60 dark:bg-slate-900/40 border-gray-200/80 dark:border-slate-800 opacity-60'
                }`}
              >
                {isEditing ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                        {item.title}
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        Отмена
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-500 font-semibold block mb-0.5">
                          Сумма (₽)
                        </label>
                        <input
                          type="number"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          className="w-full text-xs px-2 py-1 rounded-lg border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 font-semibold block mb-0.5">
                          День месяца (1-31)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={editDay}
                          onChange={(e) => setEditDay(e.target.value)}
                          className="w-full text-xs px-2 py-1 rounded-lg border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white font-bold"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSaveEdit(item.id)}
                      className="w-full py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg shadow-xs"
                    >
                      Сохранить изменения
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
                          <span className="text-xs font-bold text-gray-900 dark:text-white">
                            {item.title}
                          </span>

                          {/* Метка типа платежа */}
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

                        {/* Метаданные: Дата списания и периодичность */}
                        <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1 font-medium text-gray-700 dark:text-gray-300">
                            <Calendar className="w-3 h-3 text-blue-500" />
                            {item.typicalDay}-е число месяца
                          </span>
                          <span>•</span>
                          <span>{item.occurrenceCount ? `${item.occurrenceCount} списаний в выписке` : 'Ежемесячно'}</span>
                        </div>

                        {/* Описание и прогноз если нестабильный */}
                        {!item.isFixed && item.predictedAmount && (
                          <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                            Средняя: {formatRubles(item.amount)} → Прогноз на след. месяц: ~{formatRubles(item.predictedAmount)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0 space-y-1">
                      <div className="text-xs font-extrabold text-gray-900 dark:text-white">
                        {formatRubles(effectiveAmount)}
                      </div>

                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(item)}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Редактировать сумму или дату"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemove(item.id, item.merchant)}
                          className="p-1 text-gray-400 hover:text-rose-500 transition-colors"
                          title="Удалить из списка и не предлагать"
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

      {/* Оптимизация дат платежей (Payment Date Optimization Card) */}
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

          {/* Интерактивная кнопка раскрытия инструкции */}
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
              <div className="mt-2.5 p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/60 space-y-2.5 text-xs animate-in fade-in duration-200">
                <p className="text-[11px] text-gray-600 dark:text-gray-400">
                  Поставщики услуг и банки позволяют настроить единый день списания:
                </p>

                <div className="space-y-2">
                  {dateAdvice.providersGuide.map((prov, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-gray-900 dark:text-white text-[11px]">
                          {prov.name}
                        </span>
                        <span className="text-[9.5px] font-semibold text-gray-400">
                          {prov.category}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-gray-600 dark:text-gray-300 leading-snug">
                        {prov.howToChange}
                      </p>
                    </div>
                  ))}
                </div>

                {dateAdvice.alternativeAdvice && (
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50">
                    <span className="text-[10px] font-bold text-blue-900 dark:text-blue-300 block mb-0.5">
                      💡 Альтернатива для нерегулярного дохода:
                    </span>
                    <p className="text-[10.5px] text-blue-800 dark:text-blue-300">
                      {dateAdvice.alternativeAdvice}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
