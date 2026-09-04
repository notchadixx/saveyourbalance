import React, { useState, useMemo } from 'react';
import { useBudget, formatRubles } from '../../../context/BudgetContext';
import { CreditCard, CreditCardStrategy } from '../../../types';
import { formatDate } from '../../../utils/dateUtils';
import { 
  CreditCard as CreditCardIcon, 
  Sparkles, 
  Check, 
  Trash2, 
  Edit3, 
  Sliders, 
  TrendingDown, 
  ShieldCheck, 
  HelpCircle, 
  AlertCircle,
  Building2,
  Calendar,
  Layers
} from 'lucide-react';

interface Props {
  onNext: () => void;
  onPrev: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export const CreditCardsStep: React.FC<Props> = () => {
  const { state, addCreditCard, updateCreditCard, removeCreditCard } = useBudget();
  const existingCards = state.creditCards || [];

  const [hasCards, setHasCards] = useState<boolean | null>(() => {
    return existingCards.length > 0 ? true : null;
  });

  // Default detected card from bank analysis
  const [detectedBank, setDetectedBank] = useState<string>('Т-Банк (Кредитная Platinum)');
  const [detectedMask, setDetectedMask] = useState<string>('•5521');
  const [creditLimit, setCreditLimit] = useState<number>(150000);
  const [currentDebt, setCurrentDebt] = useState<number>(35000);
  
  // Strategy: 'optimizer' or 'debt'
  const [strategy, setStrategy] = useState<CreditCardStrategy>('optimizer');

  // Grace date (approx 55 days ahead)
  const [gracePeriodEndDate, setGracePeriodEndDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 55);
    return d.toISOString().split('T')[0];
  });

  // Calculate months to grace period end
  const monthsUntilGrace = useMemo(() => {
    const now = new Date();
    const grace = new Date(gracePeriodEndDate);
    const diffDays = Math.max(1, Math.round((grace.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    return Math.max(1, Math.round(diffDays / 30));
  }, [gracePeriodEndDate]);

  // Recommended minimum payment for 'debt' strategy = debt / monthsUntilGrace
  const recommendedDebtPayment = useMemo(() => {
    if (currentDebt <= 0) return 0;
    return Math.ceil(currentDebt / Math.max(1, monthsUntilGrace));
  }, [currentDebt, monthsUntilGrace]);

  // Custom manual payment if user overrides
  const [isCustomPayment, setIsCustomPayment] = useState<boolean>(false);
  const [customPaymentAmount, setCustomPaymentAmount] = useState<string>('');

  // Toggle manual edits for limit and debt
  const [isManualEditing, setIsManualEditing] = useState<boolean>(false);
  const [manualLimitInput, setManualLimitInput] = useState<string>('150000');
  const [manualDebtInput, setManualDebtInput] = useState<string>('35000');

  // Card confirmed / applied flag
  const [isSaved, setIsSaved] = useState<boolean>(existingCards.length > 0);

  const effectiveMonthlyPayment = useMemo(() => {
    if (strategy !== 'debt') return undefined;
    if (isCustomPayment && customPaymentAmount) {
      const parsed = parseFloat(customPaymentAmount);
      return !isNaN(parsed) && parsed > 0 ? parsed : recommendedDebtPayment;
    }
    return recommendedDebtPayment;
  }, [strategy, isCustomPayment, customPaymentAmount, recommendedDebtPayment]);

  const handleApplyCard = () => {
    const cleanMask = detectedMask.slice(-4) || '5521';
    
    // Clear previously added cards if replacing
    if (existingCards.length > 0) {
      existingCards.forEach(c => removeCreditCard(c.id));
    }

    addCreditCard({
      bankName: detectedBank,
      cardMask: `•${cleanMask}`,
      creditLimit: creditLimit,
      currentDebt: currentDebt,
      initialDebt: currentDebt,
      gracePeriodEndDate,
      strategy,
      monthlyPayment: effectiveMonthlyPayment,
      minPayment: undefined, // при оптимизаторе нет минимального платежа
    });

    setIsSaved(true);
  };

  const handleSaveManualEdit = () => {
    const l = parseFloat(manualLimitInput);
    const d = parseFloat(manualDebtInput);
    if (!isNaN(l) && l > 0) setCreditLimit(l);
    if (!isNaN(d) && d >= 0) setCurrentDebt(d);
    setIsManualEditing(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
          <CreditCardIcon className="w-4 h-4" />
          <span>Кредитные карты и умный грейс</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Пользуетесь кредитными картами?</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Банковский анализ автоматически определил данные вашей карты и параметры грейс-периода
        </p>
      </div>

      {/* Выбор: есть кредитка или нет */}
      {hasCards === null && (
        <div className="grid grid-cols-1 gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              setHasCards(true);
              handleApplyCard();
            }}
            className="flex items-center gap-3 p-4 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 hover:border-blue-500 transition-all text-left group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              <CreditCardIcon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                Да, у меня есть кредитная карта
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Использовать автоматический анализ лимита, долга и грейс-периода
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setHasCards(false);
              if (existingCards.length > 0) {
                existingCards.forEach(c => removeCreditCard(c.id));
              }
            }}
            className="flex items-center gap-3 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-gray-300 dark:hover:border-slate-700 transition-all text-left group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-gray-900 dark:text-white">
                Нет, не пользуюсь
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Кредитные виджеты и расчёты долга не будут загромождать интерфейс
              </p>
            </div>
          </button>
        </div>
      )}

      {/* Пользователь выбрал НЕТ */}
      {hasCards === false && (
        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 text-center space-y-2">
          <div className="w-10 h-10 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Check className="w-5 h-5 stroke-[2.5]" />
          </div>
          <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
            Кредитные карты отключены
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Вы сможете в любой момент включить кредитную карту и контроль грейса в настройках приложения.
          </p>
          <button
            type="button"
            onClick={() => setHasCards(true)}
            className="text-xs text-blue-600 dark:text-blue-400 underline font-medium pt-1 inline-block cursor-pointer"
          >
            Подключить кредитную карту
          </button>
        </div>
      )}

      {/* Анализ кредитных карт из банковской синхронизации */}
      {hasCards === true && (
        <div className="space-y-3.5">
          {/* Плашка найденной карты */}
          <div className="p-4 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950 space-y-3 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-blue-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                  <CreditCardIcon className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-900 dark:text-white block">
                    {detectedBank} {detectedMask}
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>Синхронизировано с банком</span>
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setManualLimitInput(creditLimit.toString());
                  setManualDebtInput(currentDebt.toString());
                  setIsManualEditing(!isManualEditing);
                }}
                className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{isManualEditing ? 'Скрыть' : 'Изменить данные'}</span>
              </button>
            </div>

            {/* Метрики карты */}
            {!isManualEditing ? (
              <div className="grid grid-cols-3 gap-2 text-center py-1">
                <div className="p-2 rounded-xl bg-white dark:bg-slate-800/80 border border-gray-100 dark:border-slate-800">
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 block">Кредитный лимит</span>
                  <span className="text-xs font-bold text-gray-900 dark:text-white">{formatRubles(creditLimit)}</span>
                </div>

                <div className="p-2 rounded-xl bg-white dark:bg-slate-800/80 border border-gray-100 dark:border-slate-800">
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 block">Текущий долг</span>
                  <span className="text-xs font-bold text-red-600 dark:text-red-400">{formatRubles(currentDebt)}</span>
                </div>

                <div className="p-2 rounded-xl bg-white dark:bg-slate-800/80 border border-gray-100 dark:border-slate-800">
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 block">Конец грейса</span>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{formatDate(gracePeriodEndDate)}</span>
                </div>
              </div>
            ) : (
              /* Ручное редактирование, если клиент с чем-то не согласен */
              <div className="p-3 rounded-xl bg-white dark:bg-slate-800/90 border border-blue-200 dark:border-blue-900/60 space-y-2.5">
                <span className="text-xs font-bold text-gray-900 dark:text-white block">
                  Ручная корректировка параметров карты
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-0.5">Лимит (₽)</label>
                    <input
                      type="number"
                      step="1000"
                      value={manualLimitInput}
                      onChange={(e) => setManualLimitInput(e.target.value)}
                      className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-0.5">Текущий долг (₽)</label>
                    <input
                      type="number"
                      step="1000"
                      value={manualDebtInput}
                      onChange={(e) => setManualDebtInput(e.target.value)}
                      className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveManualEdit}
                  className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
                >
                  Применить изменения
                </button>
              </div>
            )}
          </div>

          {/* Выбор стратегии: Оптимизатор или Долговая */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-900 dark:text-white">
              Выберите стратегию ведения кредитной карты:
            </label>

            <div className="grid grid-cols-1 gap-2.5">
              {/* ОПТИМИЗАТОР */}
              <div
                onClick={() => {
                  setStrategy('optimizer');
                }}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  strategy === 'optimizer'
                    ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 dark:border-amber-500 ring-1 ring-amber-500/30'
                    : 'border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-extrabold text-amber-900 dark:text-amber-200">
                      Оптимизатор (Заработок на беспроцентном периоде)
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
                    Рекомендуется
                  </span>
                </div>

                <p className="text-xs text-amber-900/90 dark:text-amber-300/90 leading-relaxed">
                  Идеально, если вы объединяете накопительный счёт с кредиткой: ваши свободные средства лежат под высокий процент и приносят пассивный доход, а текущие расходы совершаются с карты. В конце грейс-периода задолженность полностью гасится накопительным счётом без копейки переплат.
                </p>

                <div className="mt-2.5 pt-2 border-t border-amber-200/60 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>
                    Лимиты расходов считаются только от ваших реальных доходов. <strong>Виджет минимального платежа скрыт</strong>, долг закрывается в грейс.
                  </span>
                </div>
              </div>

              {/* ДОЛГОВАЯ */}
              <div
                onClick={() => {
                  setStrategy('debt');
                }}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  strategy === 'debt'
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 dark:border-indigo-500 ring-1 ring-indigo-600/30'
                    : 'border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <TrendingDown className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-extrabold text-indigo-950 dark:text-indigo-200">
                      Долговая (Планомерное закрытие долга)
                    </span>
                  </div>
                </div>

                <p className="text-xs text-indigo-900/80 dark:text-indigo-300/80 leading-relaxed">
                  Подходит, если накопилась задолженность и цель — гарантированно закрыть её в срок. Ежемесячный платёж вычитается из доступного бюджета на жизнь.
                </p>

                {/* Автоматический расчёт минимального/рекомендуемого платежа */}
                {strategy === 'debt' && (
                  <div className="mt-3 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-indigo-950 dark:text-indigo-200">
                        Рекомендуемый платёж (долг / {monthsUntilGrace} мес. до грейса):
                      </label>
                      <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                        {formatRubles(recommendedDebtPayment)} / мес
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-slate-800">
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">
                        Хотите изменить сумму платежа?
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsCustomPayment(!isCustomPayment);
                        }}
                        className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 underline cursor-pointer"
                      >
                        {isCustomPayment ? 'Вернуть расчетный' : 'Задать вручную'}
                      </button>
                    </div>

                    {isCustomPayment && (
                      <div className="pt-1">
                        <input
                          type="number"
                          step="500"
                          placeholder={recommendedDebtPayment.toString()}
                          value={customPaymentAmount}
                          onChange={(e) => setCustomPaymentAmount(e.target.value)}
                          className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-indigo-300 dark:border-indigo-800 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Подтвердить и сохранить настройки карты */}
          <button
            type="button"
            onClick={handleApplyCard}
            className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Сохранить параметры карты</span>
          </button>
        </div>
      )}
    </div>
  );
};
