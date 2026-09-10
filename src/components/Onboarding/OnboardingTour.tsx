import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  X, 
  Zap, 
  Plus, 
  BarChart3, 
  Calculator,
  CreditCard,
  Layers,
  SlidersHorizontal
} from 'lucide-react';
import { useBudget, formatRubles } from '../../context/BudgetContext';
import { ActiveTab } from '../../types';

const pluralizeDays = (n: number) => {
  const abs = Math.abs(n);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod100 >= 11 && mod100 <= 19) return 'дней';
  if (mod10 === 1) return 'день';
  if (mod10 >= 2 && mod10 <= 4) return 'дня';
  return 'дней';
};

const pluralizeArticles = (n: number) => {
  const abs = Math.abs(n);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod100 >= 11 && mod100 <= 19) return 'статей';
  if (mod10 === 1) return 'статья';
  if (mod10 >= 2 && mod10 <= 4) return 'статьи';
  return 'статей';
};

interface TourStepConfig {
  id: string;
  targetId: string;
  fallbackTargetId?: string;
  tab: ActiveTab;
  title: string;
  icon: React.ReactNode;
  iconBgColor: string;
  formulaLabel?: string;
  content: (ctx: {
    todayAllowedSpend: number;
    baseDailyNorm: number;
    todayRemainingForecast: number;
    daysToSalary: number;
    totalPlannedSum: number;
    isCushionEnabled: boolean;
    safetyCushionDeposit: number;
    cleanRemainderToday: number;
    totalCheckingBankBalance: number;
    hasCardBalance: boolean;
    plannedItemsCount: number;
    plannedItemsSample: string[];
  }) => React.ReactNode;
}

export const OnboardingTour: React.FC = () => {
  const { 
    state, 
    activeTab, 
    setActiveTab, 
    setOnboardingTourSeen,
    todayAllowedSpend,
    baseDailyNorm,
    todayRemainingForecast,
    daysToSalary,
    totalPlannedSum,
    cleanRemainderToday,
    totalCheckingBankBalance,
    hasCardBalance
  } = useBudget();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  // Check if tour should run: only when hasSeenOnboardingTour is false or undefined
  const shouldShowTour = state.hasSeenOnboardingTour === false;

  const currentPlannedItems = useMemo(() => {
    return (state.plannedItems || []).filter(
      item => !item.period || item.period === 'current'
    );
  }, [state.plannedItems]);

  const plannedItemsSample = useMemo(() => {
    return currentPlannedItems.slice(0, 3).map(i => i.title);
  }, [currentPlannedItems]);

  const steps: TourStepConfig[] = useMemo(() => [
    {
      id: 'budget-balance-step',
      targetId: 'tour-budget-balance',
      fallbackTargetId: 'tour-budget-summary',
      tab: 'budget',
      title: 'Баланс карты и срок до зарплаты',
      icon: <CreditCard className="w-4 h-4 text-blue-500" />,
      iconBgColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      formulaLabel: `${daysToSalary} ${pluralizeDays(daysToSalary)} до следующей зарплаты`,
      content: ({ totalCheckingBankBalance, daysToSalary }) => (
        <div className="space-y-2 text-xs leading-relaxed text-[var(--color-text-secondary)]">
          <p>
            Главная цифра вашего бюджета — это{' '}
            <span className="font-extrabold text-[var(--color-text-main)] text-sm">
              реальный баланс на карте ({formatRubles(totalCheckingBankBalance)})
            </span>.
          </p>
          <p>
            До следующей зарплаты осталось{' '}
            <span className="font-bold text-[var(--color-text-main)]">
              {daysToSalary} {pluralizeDays(daysToSalary)}
            </span>. Приложение распределяет доступные деньги на этот срок так, чтобы комфортно дожить до следующей выплаты.
          </p>
        </div>
      ),
    },
    {
      id: 'budget-audit-step',
      targetId: 'tour-balance-audit',
      fallbackTargetId: 'tour-budget-manual-btn',
      tab: 'budget',
      title: 'Корректировка и ручной ввод',
      icon: <SlidersHorizontal className="w-4 h-4 text-amber-500" />,
      iconBgColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      formulaLabel: 'Сверка приложения с реальной картой',
      content: () => (
        <div className="space-y-2 text-xs leading-relaxed text-[var(--color-text-secondary)]">
          <p>
            Если цифра в приложении разошлась с тем, что сейчас на карте (были покупки без чека или поступил перевод), нажмите{' '}
            <span className="font-bold text-[var(--color-text-main)]">«Ручной ввод»</span> или{' '}
            <span className="font-bold text-[var(--color-text-main)]">«Изменить»</span>.
          </p>
          <p>
            Вы в любой момент можете указать реальную сумму: система скорректирует расчёт и пересчитает нормы трат без необходимости вручную искать прошлые ошибки.
          </p>
        </div>
      ),
    },
    {
      id: 'plans-step',
      targetId: 'tour-plans-summary',
      fallbackTargetId: 'tour-plans-add-btn',
      tab: 'planning',
      title: 'Список планов и обязательств',
      icon: <Layers className="w-4 h-4 text-purple-500" />,
      iconBgColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
      formulaLabel: `Запланировано: ${formatRubles(totalPlannedSum, { showCents: false })}`,
      content: ({ totalPlannedSum, plannedItemsCount, plannedItemsSample }) => (
        <div className="space-y-2 text-xs leading-relaxed text-[var(--color-text-secondary)]">
          <p>
            Здесь собраны все обязательные платежи (ЖКХ, подписки, кредиты) и крупные запланированные покупки: всего на{' '}
            <span className="font-extrabold text-purple-600 dark:text-purple-400 text-sm">
              {formatRubles(totalPlannedSum, { showCents: false })}
            </span>.
          </p>
          <p>
            Планы можно добавлять кнопкой <strong>«+ Добавить статью»</strong>, редактировать и удалять. Каждый добавленный план сразу вычитается из доступных средств и напрямую уменьшает чистый остаток до конца периода.
          </p>
          {plannedItemsCount > 0 ? (
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-700 dark:text-purple-300">
              <span>
                В вашем плане: <strong>{plannedItemsCount}</strong> {pluralizeArticles(plannedItemsCount)}
                {plannedItemsSample.length > 0 && ` (${plannedItemsSample.join(', ')})`}.
              </span>
            </div>
          ) : (
            <p className="text-[11px] text-[var(--color-text-muted)] italic">
              Список пока пуст — добавьте ваши регулярные счета, чтобы деньги на них были заранее зарезервированы.
            </p>
          )}
        </div>
      ),
    },
    {
      id: 'today-daily-limit-step',
      targetId: 'tour-daily-limit',
      fallbackTargetId: 'tour-forecast-remainder',
      tab: 'today',
      title: 'Дневной лимит расходов',
      icon: <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />,
      iconBgColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      formulaLabel: `Чистый остаток ÷ ${daysToSalary} дн. до зарплаты`,
      content: ({ todayAllowedSpend, baseDailyNorm }) => (
        <div className="space-y-2 text-xs leading-relaxed text-[var(--color-text-secondary)]">
          <p>
            Ваш доступный лимит на сегодня:{' '}
            <span className="font-extrabold text-[var(--color-text-main)] text-sm">
              {formatRubles(todayAllowedSpend, { showCents: false })}
            </span>{' '}
            <span className="text-[var(--color-text-muted)]">
              (базовая норма: {formatRubles(baseDailyNorm, { showCents: false })})
            </span>.
          </p>
          <p>
            Этот дневной лимит <strong>уже учитывает и обязательные планы, и подушку безопасности</strong>, которые вы только что видели. Тратьте эту сумму со спокойной душой — все ваши цели защищены.
          </p>
          <p>
            Если сегодня потратите меньше — неиспользованный остаток автоматически распределится на оставшиеся дни, увеличив будущие лимиты!
          </p>
        </div>
      ),
    },
    {
      id: 'today-add-expense-step',
      targetId: 'tour-add-expense',
      fallbackTargetId: 'tour-daily-limit',
      tab: 'today',
      title: 'Внесение ежедневных трат',
      icon: <Plus className="w-4 h-4 text-blue-500" />,
      iconBgColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      formulaLabel: 'Быстрый ввод расхода',
      content: () => (
        <div className="space-y-2 text-xs leading-relaxed text-[var(--color-text-secondary)]">
          <p>
            Нажимайте <span className="font-bold text-[var(--color-text-main)]">«+Добавить расход»</span> каждый день сразу после покупок — кофе, обед, бензин или супермаркет.
          </p>
          <p>
            Трата мгновенно вычитается из лимита сегодняшнего дня и отражается в вашей истории расходов.
          </p>
        </div>
      ),
    },
    {
      id: 'analytics-forecast-step',
      targetId: 'tour-analytics-forecast',
      tab: 'analytics',
      title: 'Анализ и динамика остатка',
      icon: <BarChart3 className="w-4 h-4 text-indigo-500" />,
      iconBgColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
      formulaLabel: 'История трат + Планы + Подушка',
      content: ({ cleanRemainderToday }) => (
        <div className="space-y-2 text-xs leading-relaxed text-[var(--color-text-secondary)]">
          <p>
            Раздел «Анализ» объединяет всё воедино: историю ваших реальных расходов, зарезервированные планы и подушку безопасности.
          </p>
          <p>
            Главная карточка показывает актуальный чистый остаток:{' '}
            <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
              {formatRubles(cleanRemainderToday, { showCents: false })}
            </span>.
          </p>
          <p>
            Здесь наглядно видно, соблюдается ли намеченный ритм трат и с какой суммой вы подойдёте к следующей зарплате.
          </p>
        </div>
      ),
    },
  ], [
    daysToSalary, 
    state.isCushionEnabled, 
    totalPlannedSum, 
    state.safetyCushionDeposit, 
    cleanRemainderToday, 
    totalCheckingBankBalance, 
    todayAllowedSpend, 
    baseDailyNorm,
    currentPlannedItems.length,
    plannedItemsSample
  ]);

  const currentStep = steps[currentStepIndex];

  // Recalculate target element rect
  const updateTargetRect = useCallback(() => {
    if (!shouldShowTour || !currentStep) return;

    let el = document.getElementById(currentStep.targetId);
    if (!el && currentStep.fallbackTargetId) {
      el = document.getElementById(currentStep.fallbackTargetId);
    }

    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    } else {
      setTargetRect(null);
    }
  }, [shouldShowTour, currentStep]);

  // When step changes, ensure the correct tab is active, scroll element into view, and update rect
  useEffect(() => {
    if (!shouldShowTour || !currentStep) return;

    // Switch tab if step demands a specific tab
    if (activeTab !== currentStep.tab) {
      setActiveTab(currentStep.tab);
    }

    // Scroll element into view with retries to handle tab switching animations
    let attempts = 0;
    let foundCount = 0;
    const interval = setInterval(() => {
      attempts++;
      let el = document.getElementById(currentStep.targetId);
      if (!el && currentStep.fallbackTargetId) {
        el = document.getElementById(currentStep.fallbackTargetId);
      }

      if (el) {
        if (foundCount === 0) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        }
        foundCount++;
        const rect = el.getBoundingClientRect();
        setTargetRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });
        if (foundCount >= 5) {
          clearInterval(interval);
        }
      } else if (attempts >= 25) {
        clearInterval(interval);
      }
    }, 60);

    return () => clearInterval(interval);
  }, [currentStepIndex, currentStep, activeTab, setActiveTab, shouldShowTour]);

  // Listen to window resize and capturing scroll (so nested container scrolls also update position)
  useEffect(() => {
    if (!shouldShowTour) return;

    const handleScrollOrResize = () => {
      updateTargetRect();
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [shouldShowTour, updateTargetRect]);

  if (!shouldShowTour || !currentStep) {
    return null;
  }

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      const nextIndex = currentStepIndex + 1;
      const nextStep = steps[nextIndex];
      if (nextStep && nextStep.tab !== activeTab) {
        setActiveTab(nextStep.tab);
      }
      setCurrentStepIndex(nextIndex);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1;
      const prevStep = steps[prevIndex];
      if (prevStep && prevStep.tab !== activeTab) {
        setActiveTab(prevStep.tab);
      }
      setCurrentStepIndex(prevIndex);
    }
  };

  const handleSkip = () => {
    setOnboardingTourSeen(true);
    if (activeTab !== 'today') {
      setActiveTab('today');
    }
  };

  const handleComplete = () => {
    setOnboardingTourSeen(true);
    if (activeTab !== 'today') {
      setActiveTab('today');
    }
  };

  // Tooltip positioning math
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 400;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
  const cardWidth = Math.min(380, viewportWidth - 32);

  let cardStyle: React.CSSProperties = {
    width: cardWidth,
  };

  if (targetRect) {
    const targetCenterX = targetRect.left + targetRect.width / 2;
    let cardLeft = targetCenterX - cardWidth / 2;
    cardLeft = Math.max(16, Math.min(cardLeft, viewportWidth - cardWidth - 16));
    cardStyle.left = cardLeft;

    const estimatedCardHeight = 270;
    const spaceBelow = viewportHeight - (targetRect.top + targetRect.height + 16);
    const spaceAbove = targetRect.top - 16;

    if (spaceBelow >= estimatedCardHeight) {
      // Comfortably fits below target
      const topPos = Math.min(
        targetRect.top + targetRect.height + 14,
        viewportHeight - estimatedCardHeight - 16
      );
      cardStyle.top = Math.max(16, topPos);
    } else if (spaceAbove >= estimatedCardHeight) {
      // Comfortably fits above target
      const bottomPos = Math.min(
        viewportHeight - targetRect.top + 14,
        viewportHeight - estimatedCardHeight - 16
      );
      cardStyle.bottom = Math.max(16, bottomPos);
    } else {
      // Tight space: place where more room is available, clamp strictly to screen edges
      if (spaceBelow >= spaceAbove) {
        cardStyle.bottom = 16;
      } else {
        cardStyle.top = 16;
      }
    }
  } else {
    // Fallback centered position
    cardStyle.top = '50%';
    cardStyle.left = '50%';
    cardStyle.transform = 'translate(-50%, -50%)';
  }

  cardStyle.maxHeight = 'calc(100vh - 32px)';
  cardStyle.overflowY = 'auto';

  const padding = 8;
  const spotlightTop = targetRect ? Math.max(8, targetRect.top - padding) : 0;
  const spotlightLeft = targetRect ? Math.max(8, targetRect.left - padding) : 0;
  const spotlightWidth = targetRect ? Math.max(0, Math.min(viewportWidth - 16, targetRect.width + padding * 2)) : 0;
  const spotlightHeight = targetRect ? Math.max(0, Math.min(viewportHeight * 0.45, targetRect.height + padding * 2)) : 0;

  return (
    <div className="fixed inset-0 z-[75] select-none pointer-events-auto">
      {/* Click blocker for background */}
      <div 
        className="fixed inset-0 z-[76] cursor-default"
        onClick={(e) => {
          e.stopPropagation();
        }}
      />

      {/* Spotlight highlight box with box-shadow dark overlay */}
      {targetRect && (
        <motion.div
          layoutId="onboarding-spotlight"
          initial={false}
          animate={{
            top: spotlightTop,
            left: spotlightLeft,
            width: spotlightWidth,
            height: spotlightHeight,
          }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="fixed rounded-2xl pointer-events-none z-[77] transition-all duration-300"
          style={{
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.76)',
          }}
        >
          {/* Animated glowing border ring */}
          <div className="w-full h-full rounded-2xl ring-3 ring-blue-500 shadow-[0_0_24px_rgba(59,130,246,0.7)] animate-pulse pointer-events-none" />
        </motion.div>
      )}

      {/* Tooltip Card */}
      <motion.div
        key={currentStep.id}
        initial={{ opacity: 0, y: 10, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.96 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="fixed z-[78] bg-[var(--color-bg-card)] text-[var(--color-text-main)] rounded-2xl p-5 shadow-2xl border border-[var(--color-border)] flex flex-col gap-3.5 backdrop-blur-md"
        style={cardStyle}
      >
        {/* Top bar: Step tracker + Close (skip) button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Экскурсия</span>
            </div>
            <span className="text-[11px] font-semibold text-[var(--color-text-muted)]">
              {currentStepIndex + 1} из {steps.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Step indicator dots */}
            <div className="flex items-center gap-1">
              {steps.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-200 ${
                    idx === currentStepIndex
                      ? 'w-4 bg-blue-600 dark:bg-blue-400'
                      : 'w-1.5 bg-[var(--color-border-strong)]'
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleSkip}
              className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] rounded-lg hover:bg-[var(--color-border-subtle)] transition-colors cursor-pointer"
              title="Пропустить экскурсию"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Title & Icon */}
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${currentStep.iconBgColor}`}>
            {currentStep.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-[var(--color-text-main)] truncate">
              {currentStep.title}
            </h4>
            {currentStep.formulaLabel && (
              <span className="text-[10px] font-medium text-[var(--color-text-muted)] flex items-center gap-1">
                <Calculator className="w-3 h-3 text-[var(--color-accent)] shrink-0" />
                <span className="truncate">{currentStep.formulaLabel}</span>
              </span>
            )}
          </div>
        </div>

        {/* Body content with real user calculations */}
        <div className="py-0.5">
          {currentStep.content({
            todayAllowedSpend,
            baseDailyNorm,
            todayRemainingForecast,
            daysToSalary,
            totalPlannedSum,
            isCushionEnabled: state.isCushionEnabled !== false,
            safetyCushionDeposit: state.safetyCushionDeposit ?? 0,
            cleanRemainderToday,
            totalCheckingBankBalance,
            hasCardBalance,
            plannedItemsCount: currentPlannedItems.length,
            plannedItemsSample
          })}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-1 border-t border-[var(--color-border-subtle)] mt-0.5">
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors py-1.5 px-1 active:scale-95 cursor-pointer"
          >
            Пропустить экскурсию
          </button>

          <div className="flex items-center gap-2">
            {currentStepIndex > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="px-3 py-1.5 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-border-subtle)] text-[var(--color-text-main)] text-xs font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Назад</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <span>{currentStepIndex === steps.length - 1 ? 'Понятно, начать!' : 'Далее'}</span>
              {currentStepIndex === steps.length - 1 ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <ArrowRight className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
