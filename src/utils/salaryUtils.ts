export interface SalaryScheduleInfo {
  year: number;
  month: number; // 1-12
  monthName: string;
  baseDay: number; // usually 5
  actualSalaryDay: number; // 3, 4, or 5
  salaryDateStr: string; // YYYY-MM-DD
  dayOfWeekName: string;
  isAdjustedForWeekend: boolean;
  adjustmentNote: string;
}

const MONTH_NAMES_RU = [
  '',
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const DAY_NAMES_RU = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
const DAY_SHORT_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

/**
 * Calculates the actual salary arrival day for a given month and year.
 * Base payday is the 5th of the month.
 * If the 5th is Saturday -> moved to Friday 4th.
 * If the 5th is Sunday -> moved to Friday 3rd.
 * Otherwise -> 5th.
 */
export function getSalaryDateInfo(year: number, month: number, baseDay: number = 5): SalaryScheduleInfo {
  const targetDate = new Date(year, month - 1, baseDay);
  const dayOfWeek = targetDate.getDay(); // 0 = Sun, 6 = Sat

  let actualDay = baseDay;
  let isAdjusted = false;
  let note = '5-е число — рабочий день.';

  if (dayOfWeek === 6) {
    // Saturday -> Friday (4th)
    actualDay = baseDay - 1;
    isAdjusted = true;
    note = '5-е число выпадает на субботу — зарплата переносится на пятницу 4-е.';
  } else if (dayOfWeek === 0) {
    // Sunday -> Friday (3rd)
    actualDay = baseDay - 2;
    isAdjusted = true;
    note = '5-е число выпадает на воскресенье — зарплата переносится на пятницу 3-е.';
  }

  const actualDate = new Date(year, month - 1, actualDay);
  const actualDayOfWeek = actualDate.getDay();

  const formattedMonth = month.toString().padStart(2, '0');
  const formattedDay = actualDay.toString().padStart(2, '0');

  return {
    year,
    month,
    monthName: MONTH_NAMES_RU[month] || '',
    baseDay,
    actualSalaryDay: actualDay,
    salaryDateStr: `${year}-${formattedMonth}-${formattedDay}`,
    dayOfWeekName: DAY_NAMES_RU[actualDayOfWeek],
    isAdjustedForWeekend: isAdjusted,
    adjustmentNote: note,
  };
}

/**
 * Generates all day records for a specific year and month
 */
export function generateMonthDays(year: number, month: number, dailyNorm: number = 1859.46) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const formattedMonth = month.toString().padStart(2, '0');
  const days = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month - 1, day);
    const dayOfWeekIdx = d.getDay();
    const formattedDay = day.toString().padStart(2, '0');
    const dateStr = `${year}-${formattedMonth}-${formattedDay}`;

    days.push({
      date: dateStr,
      dayNumber: day,
      dayOfWeekShort: DAY_SHORT_RU[dayOfWeekIdx],
      dayOfWeekFull: DAY_NAMES_RU[dayOfWeekIdx],
      expenses: [],
      spent: 0,
      normLimit: dailyNorm,
      deviation: dailyNorm,
      budgetRemainingOnDate: 0,
      totalRemaining: 0,
      isToday: false,
      isPast: false,
    });
  }

  return days;
}
