export interface PeriodTemplate {
  id: string; // e.g. "2026-08"
  year: number;
  month: number; // 1-12
  monthName: string; // "Август 2026"
  shortName: string; // "Авг 2026"
  startDateStr: string; // "2026-08-05"
  endDateStr: string; // "2026-09-03"
  formattedLabel: string; // "05.08.2026 — 03.09.2026"
  formattedShortLabel: string; // "05.08 – 03.09"
  advanceDateStr: string; // "2026-08-20"
  formattedAdvanceLabel: string; // "20.08.2026"
  totalDays: number;
  isCurrent: boolean;
  isPast: boolean;
  isFuture: boolean;
  nominalSalaryDay: number;
  actualSalaryDay: number;
  salaryDateStr: string;
  isSalaryShifted: boolean;
  salaryShiftReason: string;
  nominalAdvanceDay: number;
  actualAdvanceDay: number;
  isAdvanceShifted: boolean;
  advanceShiftReason: string;
}

const MONTH_NAMES_RU = [
  '',
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const MONTH_SHORT_RU = [
  '',
  'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
  'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'
];

const DAY_NAMES_RU = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

/**
 * Official Russian Public Holidays (Праздничные нерабочие дни РФ)
 * Specific fixed dates + standard holiday periods
 */
export function isRussianPublicHoliday(year: number, month: number, day: number): boolean {
  // 1-8 January: New Year holidays & Christmas
  if (month === 1 && day >= 1 && day <= 8) return true;
  // 23 February: Defender of Fatherland Day
  if (month === 2 && day === 23) return true;
  // 8 March: International Women's Day
  if (month === 3 && day === 8) return true;
  // 1 May: Spring & Labor Day
  if (month === 5 && day === 1) return true;
  // 9 May: Victory Day
  if (month === 5 && day === 9) return true;
  // 12 June: Russia Day
  if (month === 6 && day === 12) return true;
  // 4 November: National Unity Day
  if (month === 11 && day === 4) return true;

  // Specific official bridge transfers for 2025, 2026, 2027 (standard government decrees)
  const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const specialHolidays = new Set<string>([
    // 2025
    '2025-05-02', '2025-05-08', '2025-06-13', '2025-11-03', '2025-12-31',
    // 2026
    '2026-01-09', '2026-05-04', '2026-05-11', '2026-12-31',
    // 2027
    '2027-01-09', '2027-02-22', '2027-03-09', '2027-05-03', '2027-05-10', '2027-12-31',
    // 2028
    '2028-05-02', '2028-05-08', '2028-12-31',
  ]);

  return specialHolidays.has(dateKey);
}

/**
 * Checks if a specific date is a working day (Monday - Friday, not a public holiday).
 */
export function isWorkingDay(date: Date): boolean {
  const dayOfWeek = date.getDay(); // 0 = Sun, 6 = Sat
  if (dayOfWeek === 0 || dayOfWeek === 6) return false;

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  return !isRussianPublicHoliday(year, month, day);
}

/**
 * Calculates actual payout date given a target base day (e.g. 5 for salary, 20 for advance).
 * If the base day is Saturday, Sunday, or a holiday, moves backward to the closest preceding working day (t-1, t-2, etc.).
 */
export function calculateAdjustedPayoutDate(
  year: number, 
  month: number, 
  baseDay: number,
  titlePrefix: string = 'Зарплата'
): {
  date: Date;
  dateStr: string;
  year: number;
  month: number;
  day: number;
  dayOfWeekName: string;
  isShifted: boolean;
  shiftReason: string;
} {
  // Start with target base day
  const d = new Date(year, month - 1, baseDay);
  const nominalDayOfWeek = d.getDay();
  let shiftCount = 0;

  // Step back while it's a weekend or public holiday
  while (!isWorkingDay(d)) {
    d.setDate(d.getDate() - 1);
    shiftCount++;
  }

  const actualYear = d.getFullYear();
  const actualMonth = d.getMonth() + 1;
  const actualDay = d.getDate();
  const actualDayOfWeek = d.getDay();

  const formattedMonth = String(actualMonth).padStart(2, '0');
  const formattedDay = String(actualDay).padStart(2, '0');
  const dateStr = `${actualYear}-${formattedMonth}-${formattedDay}`;

  let shiftReason = `${baseDay}-е число — рабочий день (${DAY_NAMES_RU[nominalDayOfWeek]}).`;
  const isShifted = shiftCount > 0;

  if (isShifted) {
    const nominalDayName = DAY_NAMES_RU[nominalDayOfWeek];
    if (nominalDayOfWeek === 6) {
      shiftReason = `${baseDay}-е число выпадает на субботу — ${titlePrefix.toLowerCase()} переносится на пятницу ${actualDay}-е.`;
    } else if (nominalDayOfWeek === 0) {
      shiftReason = `${baseDay}-е число выпадает на воскресенье — ${titlePrefix.toLowerCase()} переносится на пятницу ${actualDay}-е.`;
    } else {
      shiftReason = `${baseDay}-е число выпадает на нерабочий день/праздник (${nominalDayName}) — ${titlePrefix.toLowerCase()} переносится на ${actualDay}-е (${DAY_NAMES_RU[actualDayOfWeek]}).`;
    }
  }

  return {
    date: d,
    dateStr,
    year: actualYear,
    month: actualMonth,
    day: actualDay,
    dayOfWeekName: DAY_NAMES_RU[actualDayOfWeek],
    isShifted,
    shiftReason,
  };
}

/**
 * Calculates complete period template for a given year & month.
 * Period starts on the actual salary payout date of this month,
 * and ends on the DAY BEFORE the actual salary payout date of the NEXT month.
 */
export function generatePeriodTemplateForMonth(
  year: number, 
  month: number, 
  baseSalaryDay: number = 5,
  baseAdvanceDay: number = 20,
  referenceDateStr?: string
): PeriodTemplate {
  // 1. Current month salary payout (Start Date)
  const currentSalaryInfo = calculateAdjustedPayoutDate(year, month, baseSalaryDay, 'Зарплата');

  // 2. Next month salary payout
  let nextMonth = month + 1;
  let nextYear = year;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear = year + 1;
  }
  const nextSalaryInfo = calculateAdjustedPayoutDate(nextYear, nextMonth, baseSalaryDay, 'Зарплата');

  // 3. End Date is 1 day before the next month's salary payout date
  const endDate = new Date(nextSalaryInfo.date);
  endDate.setDate(endDate.getDate() - 1);

  const endYear = endDate.getFullYear();
  const endMonth = endDate.getMonth() + 1;
  const endDay = endDate.getDate();

  const startDateStr = currentSalaryInfo.dateStr;
  const endDateStr = `${endYear}-${String(endMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;

  // 4. Advance payout in this period
  const advanceInfo = calculateAdjustedPayoutDate(year, month, baseAdvanceDay, 'Аванс');

  // 5. Total days in period
  const diffTime = endDate.getTime() - currentSalaryInfo.date.getTime();
  const totalDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1);

  // 6. Formatting labels
  const startDayFormatted = String(currentSalaryInfo.day).padStart(2, '0');
  const startMonthFormatted = String(currentSalaryInfo.month).padStart(2, '0');
  const endDayFormatted = String(endDay).padStart(2, '0');
  const endMonthFormatted = String(endMonth).padStart(2, '0');

  const formattedLabel = `${startDayFormatted}.${startMonthFormatted}.${currentSalaryInfo.year} — ${endDayFormatted}.${endMonthFormatted}.${endYear}`;
  const formattedShortLabel = `${startDayFormatted}.${startMonthFormatted} — ${endDayFormatted}.${endMonthFormatted}`;
  const formattedAdvanceLabel = `${String(advanceInfo.day).padStart(2, '0')}.${String(advanceInfo.month).padStart(2, '0')}.${advanceInfo.year}`;

  // 7. Status relative to today
  const today = referenceDateStr || new Date().toISOString().split('T')[0];
  const isCurrent = today >= startDateStr && today <= endDateStr;
  const isPast = today > endDateStr;
  const isFuture = today < startDateStr;

  const id = `${year}-${String(month).padStart(2, '0')}`;

  return {
    id,
    year,
    month,
    monthName: `${MONTH_NAMES_RU[month]} ${year}`,
    shortName: `${MONTH_SHORT_RU[month]} ${year}`,
    startDateStr,
    endDateStr,
    formattedLabel,
    formattedShortLabel,
    advanceDateStr: advanceInfo.dateStr,
    formattedAdvanceLabel,
    totalDays,
    isCurrent,
    isPast,
    isFuture,
    nominalSalaryDay: baseSalaryDay,
    actualSalaryDay: currentSalaryInfo.day,
    salaryDateStr: currentSalaryInfo.dateStr,
    isSalaryShifted: currentSalaryInfo.isShifted,
    salaryShiftReason: currentSalaryInfo.shiftReason,
    nominalAdvanceDay: baseAdvanceDay,
    actualAdvanceDay: advanceInfo.day,
    isAdvanceShifted: advanceInfo.isShifted,
    advanceShiftReason: advanceInfo.shiftReason,
  };
}

/**
 * Generates rolling periods: 4 months in past, current, and 14+ months in the future.
 * Ensures the period list ALWAYS has at least a full year ahead (12+ months) dynamically.
 */
export function generateRollingPeriodTemplates(
  referenceDateStr: string = '2026-08-26',
  pastMonthsCount: number = 4,
  futureMonthsCount: number = 14,
  baseSalaryDay: number = 5,
  baseAdvanceDay: number = 20
): PeriodTemplate[] {
  const parts = (referenceDateStr || '2026-08-26').split('-');
  const refYear = parseInt(parts[0], 10) || 2026;
  const refMonth = parseInt(parts[1], 10) || 8;

  const templates: PeriodTemplate[] = [];

  // Start from (refMonth - pastMonthsCount)
  for (let offset = -pastMonthsCount; offset <= futureMonthsCount; offset++) {
    let targetMonth = refMonth + offset;
    let targetYear = refYear;

    while (targetMonth < 1) {
      targetMonth += 12;
      targetYear -= 1;
    }
    while (targetMonth > 12) {
      targetMonth -= 12;
      targetYear += 1;
    }

    const template = generatePeriodTemplateForMonth(
      targetYear,
      targetMonth,
      baseSalaryDay,
      baseAdvanceDay,
      referenceDateStr
    );
    templates.push(template);
  }

  return templates;
}

/**
 * Finds the matching period template for any given date string (YYYY-MM-DD).
 */
export function findPeriodTemplateForDate(
  dateStr: string,
  templates: PeriodTemplate[]
): PeriodTemplate | undefined {
  return templates.find(t => dateStr >= t.startDateStr && dateStr <= t.endDateStr);
}
