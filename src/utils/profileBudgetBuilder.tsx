import { 
  FinancialProfile, 
  BudgetState, 
  DayRecord, 
  PlannedItem, 
  WishlistItem, 
  BankAccount, 
  BankTransaction, 
  IncomeItem,
  MandatoryExpense,
  CushionMonthPlan
} from '../types';
import { generatePeriodTemplateForMonth } from './periodUtils';
import { getTodayDateString, INITIAL_BUDGET_STATE, buildCushionSchedule } from '../mockData';
import { calculateBudgetNorms } from './normCalculator';

// Вспомогательная функция: генерация дней для заданного периода
function generateDaysForPeriod(
  startDateStr: string,
  endDateStr: string,
  normLimit: number = 0
): DayRecord[] {
  const days: DayRecord[] = [];
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const dayFull = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

  let dayNumber = 1;
  const current = new Date(start);
  while (current <= end) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const dow = current.getDay();

    days.push({
      date: dateStr,
      dayNumber: dayNumber,
      dayOfWeekShort: dayNames[dow],
      dayOfWeekFull: dayFull[dow],
      expenses: [],
      spent: 0,
      normLimit: normLimit,
      deviation: normLimit,
      budgetRemainingOnDate: 0,
      totalRemaining: 0,
      isToday: dateStr === getTodayDateString(),
      isPast: dateStr < getTodayDateString(),
    });

    current.setDate(current.getDate() + 1);
    dayNumber++;
  }

  return days;
}

/**
 * Строит начальное состояние бюджета на основе финансового профиля.
 * Учитывает профиль (salary_advance, stable, variable, irregular, freelance),
 * корректно определяет даты начала и конца периода (например, со дня премии или регулярных списаний),
 * и сохраняет уже настроенные в онбординге кредитные карты и планы.
 */
export function buildInitialStateFromProfile(
  profile: FinancialProfile,
  existingState?: Partial<BudgetState>
): BudgetState {
  const today = getTodayDateString();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Определение дня старта периода и аванса в зависимости от профиля:
  let effectiveSalaryDay = profile.mainSalaryDate || 5;
  let effectiveAdvanceDay: number | undefined = profile.advanceDate;

  if (profile.profileType === 'variable') {
    // Для профиля "Оклад + бонусы/KPI": период начинается с дня выплаты премии
    // и заканчивается за день до следующей премии.
    effectiveSalaryDay = profile.bonusDateDay || 25;
    effectiveAdvanceDay = profile.advanceDate || 20;
  } else if (profile.profileType === 'freelance') {
    // Для "Своего профиля": привязка к дате регулярных автоплатежей
    // (например, с 5 по 4 число следующего месяца, или с 1 по последнее число).
    effectiveSalaryDay = profile.regularPaymentsDay || 1;
    effectiveAdvanceDay = undefined;
  } else if (profile.profileType === 'stable') {
    // Стабильный оклад: единовременная выплата, аванса нет
    effectiveSalaryDay = profile.mainSalaryDate || 5;
    effectiveAdvanceDay = undefined;
  } else if (profile.profileType === 'irregular') {
    // Плавающий график: привязка к дате выплат
    effectiveSalaryDay = profile.mainSalaryDate || 5;
    effectiveAdvanceDay = undefined;
  } else if (profile.profileType === 'salary_advance') {
    // Зарплата + аванс: от зарплаты до зарплаты
    effectiveSalaryDay = profile.mainSalaryDate || 5;
    effectiveAdvanceDay = profile.advanceDate || 20;
  }

  // Генерируем шаблон периода с учётом переноса на рабочие дни
  const template = generatePeriodTemplateForMonth(
    currentYear,
    currentMonth,
    effectiveSalaryDay,
    effectiveAdvanceDay || 20,
    today
  );

  // Берём базовое состояние
  const base = INITIAL_BUDGET_STATE;

  // Расчёт планового бюджета
  const total30DaysBudget = profile.fixedPartAmount || base.total30DaysBudget;

  // Плановые расходы: сохраняем только статьи, настроенные пользователем
  const plannedItems = existingState?.plannedItems !== undefined 
    ? existingState.plannedItems 
    : [];

  const isCushionEnabled = existingState?.isCushionEnabled !== false;
  const cushionNormMode = existingState?.cushionNormMode || 'percent';
  const cushionPercent = existingState?.cushionNormPercent ?? 10;
  const cushionNormFixedAmount = existingState?.cushionNormFixedAmount ?? 0;

  let safetyCushionDeposit = 0;
  if (isCushionEnabled) {
    if (existingState?.safetyCushionDeposit !== undefined && existingState.safetyCushionDeposit >= 0) {
      safetyCushionDeposit = existingState.safetyCushionDeposit;
    } else if (cushionNormMode === 'fixed') {
      safetyCushionDeposit = cushionNormFixedAmount;
    } else {
      safetyCushionDeposit = Math.round(total30DaysBudget * (cushionPercent / 100));
    }
  } else {
    safetyCushionDeposit = 0;
  }

  // Вычисляем норму дня по единой формуле: (бюджет - плановые расходы - подушка) / число дней
  const { dailyNorm } = calculateBudgetNorms({
    totalBudget: total30DaysBudget,
    plannedItems: plannedItems,
    safetyCushionDeposit: safetyCushionDeposit,
    cushionPercent: isCushionEnabled && cushionNormMode === 'percent' ? cushionPercent : 0,
    totalDays: template.totalDays,
  });

  // Создаём дни для нового периода с единой нормой
  const days = generateDaysForPeriod(
    template.startDateStr,
    template.endDateStr,
    dailyNorm
  );

  // Формируем итоговое состояние
  const newState: BudgetState = {
    ...base,
    periodTitle: template.formattedLabel,
    periodStartDate: template.startDateStr,
    periodEndDate: template.endDateStr,
    todayDate: today,
    salaryDateDay: effectiveSalaryDay,
    advanceDateDay: effectiveAdvanceDay,
    advancePaymentDate: effectiveAdvanceDay ? template.advanceDateStr : '',
    estimatedAdvanceAmount: (existingState?.estimatedAdvanceAmount && existingState.estimatedAdvanceAmount !== 40000)
      ? existingState.estimatedAdvanceAmount
      : 0,
    isAdvanceReceived: effectiveAdvanceDay ? (today >= template.advanceDateStr) : false,
    includeAdvanceInBudget: !!effectiveAdvanceDay,
    total30DaysBudget: total30DaysBudget,
    previousMonthRemainder: 0,
    isCushionEnabled: isCushionEnabled,
    cushionNormMode: cushionNormMode,
    cushionNormPercent: cushionPercent,
    cushionNormFixedAmount: cushionNormFixedAmount,
    safetyCushionDeposit: safetyCushionDeposit,
    cushionMonthlyContribution: safetyCushionDeposit,
    currentSalary: profile.fixedPartAmount || base.currentSalary,
    days: days,
    // Сохраняем пользовательские настройки из онбординга (кредитные карты, планы, фудконтроль)
    plannedItems: plannedItems,
    wishlist: existingState?.wishlist || base.wishlist,
    bankAccounts: existingState?.bankAccounts || base.bankAccounts,
    pendingBankTransactions: existingState?.pendingBankTransactions || base.pendingBankTransactions,
    incomes: existingState?.incomes || base.incomes,
    creditCards: existingState?.creditCards && existingState.creditCards.length > 0 
      ? existingState.creditCards 
      : (base.creditCards || []),
    foodControl: existingState?.foodControl || base.foodControl,
    mandatoryExpenses: existingState?.mandatoryExpenses || base.mandatoryExpenses,
    cushionSchedule: existingState?.cushionSchedule || buildCushionSchedule(
      total30DaysBudget,
      false,
      0.00,
      existingState?.cushionAccumulated ?? base.cushionAccumulated,
      template.month,
      template.year,
      cushionNormMode,
      isCushionEnabled ? cushionPercent : 0,
      isCushionEnabled ? cushionNormFixedAmount : 0
    ),
    cushionAccumulated: existingState?.cushionAccumulated ?? base.cushionAccumulated,
    cushionTargetAmount: existingState?.cushionTargetAmount ?? base.cushionTargetAmount,
    financialProfile: profile,
    hasSeenOnboardingTour: existingState?.hasSeenOnboardingTour ?? false,
  };

  return newState;
}
