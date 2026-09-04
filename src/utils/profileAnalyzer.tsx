import { IncomeItem, FinancialProfile, IncomePattern, IncomeType } from '../types';

/**
 * Анализирует список доходов (транзакций) и определяет профиль пользователя.
 * Возвращает предложенный профиль и детали для отображения.
 */
export function analyzeIncomeProfile(incomeItems: IncomeItem[]): {
  suggestedProfile: FinancialProfile;
  details: {
    fixedAmount: number;
    variableAverage: number;
    mainDate: number;
    advanceDate?: number;
    pattern: IncomePattern;
    incomeType: IncomeType;
  };
} {
  // Если нет данных, возвращаем профиль "неизвестно" с дефолтами
  if (!incomeItems || incomeItems.length === 0) {
    return getDefaultProfile();
  }

  // 1. Отфильтруем только те, что похожи на зарплату (по категории или ключевым словам)
  const salaryItems = incomeItems.filter(item =>
    item.category.toLowerCase().includes('зарплат') ||
    item.category.toLowerCase().includes('аванс') ||
    item.title.toLowerCase().includes('зарплат') ||
    item.title.toLowerCase().includes('аванс') ||
    item.sourceType === 'bank_card' // предположим, что зарплата приходит на карту
  );

  // Если ничего не найдено, пробуем взять все доходы
  const itemsToAnalyze = salaryItems.length > 0 ? salaryItems : incomeItems;

  // 2. Собираем суммы и даты
  const amounts = itemsToAnalyze.map(item => item.amount);
  const dates = itemsToAnalyze.map(item => new Date(item.date));

  // 3. Ищем постоянную часть: вычисляем моду (самую частую сумму) с погрешностью ±5%
  const fixedAmount = findModeWithTolerance(amounts, 0.05);
  const variableAmounts = amounts.filter(a => Math.abs(a - fixedAmount) / fixedAmount > 0.05);
  const variableAverage = variableAmounts.length > 0
    ? variableAmounts.reduce((a, b) => a + b, 0) / variableAmounts.length
    : 0;

  // 4. Определяем день месяца, когда чаще всего приходят деньги
  const dayCounts: Record<number, number> = {};
  dates.forEach(date => {
    const day = date.getDate();
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  });
  let maxDay = 5; // по умолчанию 5-е число
  let maxCount = 0;
  for (const [day, count] of Object.entries(dayCounts)) {
    if (count > maxCount) {
      maxCount = count;
      maxDay = parseInt(day);
    }
  }

  // 5. Ищем второй пик для аванса (если есть)
  let advanceDay: number | undefined;
  const sortedDays = Object.entries(dayCounts)
    .map(([day, count]) => ({ day: parseInt(day), count }))
    .sort((a, b) => b.count - a.count);
  if (sortedDays.length > 1 && sortedDays[0].count > 1 && sortedDays[1].count > 1) {
    // если второй по частоте день отличается от первого и встречается хотя бы 2 раза
    advanceDay = sortedDays[1].day;
  }

  // 6. Определяем паттерн периодичности (ежемесячно, раз в две недели, еженедельно)
  const intervals: number[] = [];
  for (let i = 1; i < dates.length; i++) {
    const diff = (dates[i].getTime() - dates[i-1].getTime()) / (1000 * 60 * 60 * 24);
    intervals.push(Math.round(diff));
  }
  const avgInterval = intervals.length > 0
    ? intervals.reduce((a, b) => a + b, 0) / intervals.length
    : 30;
  
  // Рассчитываем дисперсию интервалов для выявления нерегулярного графика
  const isHighVariance = intervals.length > 1 && intervals.some(inv => Math.abs(inv - avgInterval) > 12);

  let pattern: IncomePattern = 'monthly';
  if (isHighVariance) pattern = 'irregular';
  else if (avgInterval < 10) pattern = 'weekly';
  else if (avgInterval < 20) pattern = 'biweekly';
  else pattern = 'monthly';

  // 7. Определяем тип дохода
  let incomeType: IncomeType;
  const variableRatio = variableAmounts.length / (amounts.length || 1);
  if (variableRatio < 0.1) incomeType = 'fixed';
  else if (variableRatio < 0.4) incomeType = 'fixed_with_variable';
  else incomeType = 'variable';

  // 8. Выбираем профиль
  let profileType: FinancialProfile['profileType'];
  if (incomeType === 'fixed' && !advanceDay) {
    profileType = 'stable';
  } else if (incomeType === 'fixed' && advanceDay) {
    profileType = 'salary_advance';
  } else if (incomeType === 'fixed_with_variable') {
    profileType = 'variable';
  } else if (pattern === 'irregular' || incomeType === 'variable') {
    profileType = 'irregular';
  } else {
    profileType = 'freelance';
  }

  // Формируем итоговый профиль
  const suggestedProfile: FinancialProfile = {
    id: 'auto_' + Date.now(),
    profileType,
    mainSalaryDate: maxDay,
    advanceDate: advanceDay,
    hasVariablePart: variableAmounts.length > 0,
    fixedPartAmount: fixedAmount,
    variablePartAverage: variableAverage || undefined,
    advanceTreatment: advanceDay ? 'separate' : 'include', // по умолчанию аванс отдельно
    incomePattern: pattern,
    incomeType,
    periodStartDay: maxDay,
    isAutoDetected: true,
    createdAt: new Date().toISOString(),
  };

  return {
    suggestedProfile,
    details: {
      fixedAmount,
      variableAverage,
      mainDate: maxDay,
      advanceDate: advanceDay,
      pattern,
      incomeType,
    },
  };
}

// Вспомогательная функция: находит моду с учётом погрешности
function findModeWithTolerance(values: number[], tolerance: number): number {
  if (values.length === 0) return 0;
  // Группируем значения, которые близки друг к другу
  const groups: number[][] = [];
  for (const val of values) {
    let found = false;
    for (const group of groups) {
      const avg = group.reduce((a, b) => a + b, 0) / group.length;
      if (Math.abs(val - avg) / avg <= tolerance) {
        group.push(val);
        found = true;
        break;
      }
    }
    if (!found) {
      groups.push([val]);
    }
  }
  // Находим группу с наибольшим количеством
  let maxGroup = groups[0];
  for (const group of groups) {
    if (group.length > maxGroup.length) maxGroup = group;
  }
  // Возвращаем среднее по группе
  return maxGroup.reduce((a, b) => a + b, 0) / maxGroup.length;
}

// Дефолтный профиль, если данных нет
function getDefaultProfile(): {
  suggestedProfile: FinancialProfile;
  details: {
    fixedAmount: number;
    variableAverage: number;
    mainDate: number;
    advanceDate?: number;
    pattern: IncomePattern;
    incomeType: IncomeType;
  };
} {
  const suggestedProfile: FinancialProfile = {
    id: 'default_' + Date.now(),
    profileType: 'stable',
    mainSalaryDate: 5,
    advanceDate: undefined,
    hasVariablePart: false,
    fixedPartAmount: 50000,
    advanceTreatment: 'separate',
    incomePattern: 'monthly',
    incomeType: 'fixed',
    periodStartDay: 5,
    isAutoDetected: false,
    createdAt: new Date().toISOString(),
  };

  return {
    suggestedProfile,
    details: {
      fixedAmount: 50000,
      variableAverage: 0,
      mainDate: 5,
      advanceDate: undefined,
      pattern: 'monthly',
      incomeType: 'fixed',
    },
  };
}