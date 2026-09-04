import React, { useState } from 'react';
import { useProfile } from '../../context/ProfileContext';
import { useBudget } from '../../context/BudgetContext';
import { IncomeAnalysisStep } from './Steps/IncomeAnalysisStep';
import { ProfileSelectionStep } from './Steps/ProfileSelectionStep';
import { ProfileCustomizationStep } from './Steps/ProfileCustomizationStep';
import { RegularExpensesStep } from './Steps/RegularExpensesStep';
import { CreditCardsStep } from './Steps/CreditCardsStep';
import { FoodManagementStep } from './Steps/FoodManagementStep';
import { ConfirmationStep } from './Steps/ConfirmationStep';
import { ArrowRight, ArrowLeft, Check, Sparkles } from 'lucide-react';

export const OnboardingFlow: React.FC = () => {
  const [step, setStep] = useState(0);
  const { profile, completeOnboarding } = useProfile();
  const { initializeBudgetFromProfile } = useBudget();

  const isFreelance = profile?.profileType === 'freelance';
  const steps = isFreelance
    ? [
        IncomeAnalysisStep,
        ProfileSelectionStep,
        RegularExpensesStep,
        CreditCardsStep,
        FoodManagementStep,
        ConfirmationStep,
      ]
    : [
        IncomeAnalysisStep,
        ProfileSelectionStep,
        ProfileCustomizationStep,
        RegularExpensesStep,
        CreditCardsStep,
        FoodManagementStep,
        ConfirmationStep,
      ];

  const currentStepIndex = Math.min(step, steps.length - 1);
  const CurrentStep = steps[currentStepIndex];

  const nextStep = () => setStep(Math.min(currentStepIndex + 1, steps.length - 1));
  const prevStep = () => setStep(Math.max(currentStepIndex - 1, 0));

  const handleFinish = () => {
    if (profile) {
      initializeBudgetFromProfile(profile);
    }
    completeOnboarding();
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-800 p-6 flex flex-col justify-between min-h-[560px]">
        <div>
          {/* Верхняя панель и индикатор шагов */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
              <Sparkles className="w-4 h-4" />
              <span>Умная профилизация</span>
            </div>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Шаг {currentStepIndex + 1} из {steps.length}
            </span>
          </div>

          {/* Индикатор прогресса */}
          <div className="flex gap-1.5 mb-6">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  idx <= currentStepIndex 
                    ? 'bg-blue-600 dark:bg-blue-500' 
                    : 'bg-gray-100 dark:bg-slate-800'
                }`}
              />
            ))}
          </div>

          {/* Текущий экран */}
          <div className="min-h-[340px]">
            <CurrentStep onNext={nextStep} onPrev={prevStep} isFirst={currentStepIndex === 0} isLast={currentStepIndex === steps.length - 1} />
          </div>
        </div>

        {/* Кнопки навигации */}
        <div className="pt-6 border-t border-gray-100 dark:border-slate-800/80 mt-auto">
          {currentStepIndex < steps.length - 1 ? (
            <div className="flex items-center justify-between gap-3">
              {currentStepIndex > 0 ? (
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Назад</span>
                </button>
              ) : <div />}

              <button
                type="button"
                onClick={nextStep}
                className="flex items-center gap-1.5 ml-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <span>Далее</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={prevStep}
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Назад</span>
              </button>

              <button
                type="button"
                onClick={handleFinish}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Начать пользоваться</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};