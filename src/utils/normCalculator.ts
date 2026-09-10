import { PlannedItem } from '../types';

export interface DailyNormParams {
  totalBudget: number; // Общий бюджет (зарплата или плановый доход на период)
  plannedItems?: PlannedItem[];
  plannedSum?: number; // Уже рассчитанная сумма плановых/регулярных расходов
  safetyCushionDeposit?: number; // Сумма отчислений в подушку безопасности
  cushionPercent?: number; // Процент в подушку (по умолчанию 10%)
  totalDays: number; // Число дней в периоде (например, 30 или 31)
}

export interface BudgetNormsResult {
  totalPlannedSum: number;
  safetyCushionDeposit: number;
  freeDiscretionaryBudget: number; // Итого на прочее = totalBudget - plannedSum - cushion
  dailyNorm: number; // Норма в день = freeDiscretionaryBudget / totalDays
}

/**
 * Считает сумму плановых/регулярных расходов для текущего периода
 */
export function calculatePlannedExpensesSum(plannedItems: PlannedItem[] = []): number {
  return (plannedItems || [])
    .filter(item => !item.period || item.period === 'current')
    .reduce((acc, item) => acc + (item.amount || 0), 0);
}

/**
 * Считает свободный бюджет ("Итого на прочее" / D1):
 * D1 = totalBudget - plannedExpensesSum - safetyCushionDeposit
 */
export function calculateFreeDiscretionaryBudget(
  totalBudget: number,
  plannedExpensesSum: number,
  safetyCushionDeposit: number
): number {
  return Math.max(0, totalBudget - plannedExpensesSum - safetyCushionDeposit);
}

/**
 * Считает дневную норму ("Итого в день" / E1):
 * E1 = freeDiscretionaryBudget / totalDays
 */
export function calculateDailyNorm(
  freeDiscretionaryBudget: number,
  totalDays: number
): number {
  if (totalDays <= 0 || freeDiscretionaryBudget <= 0) return 0;
  return Math.round((freeDiscretionaryBudget / totalDays) * 100) / 100;
}

/**
 * Единая формула расчета нормы бюджета и лимита на день:
 * "(бюджет - плановые расходы - подушка) / число дней"
 */
export function calculateBudgetNorms(params: DailyNormParams): BudgetNormsResult {
  const totalBudget = Math.max(0, params.totalBudget || 0);

  const totalPlannedSum = typeof params.plannedSum === 'number'
    ? params.plannedSum
    : calculatePlannedExpensesSum(params.plannedItems || []);

  const safetyCushionDeposit = typeof params.safetyCushionDeposit === 'number'
    ? Math.max(0, params.safetyCushionDeposit)
    : Math.round(totalBudget * ((params.cushionPercent ?? 10) / 100));

  const freeDiscretionaryBudget = calculateFreeDiscretionaryBudget(
    totalBudget,
    totalPlannedSum,
    safetyCushionDeposit
  );

  const totalDays = Math.max(1, params.totalDays || 30);
  const dailyNorm = calculateDailyNorm(freeDiscretionaryBudget, totalDays);

  return {
    totalPlannedSum,
    safetyCushionDeposit,
    freeDiscretionaryBudget,
    dailyNorm,
  };
}
