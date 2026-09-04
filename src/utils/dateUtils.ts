/**
 * Date formatting and calculation utilities for budget and credit cards
 */

export function daysUntil(targetDateStr: string, fromDateStr?: string): number {
  if (!targetDateStr) return 0;
  
  // Normalize date strings (extract YYYY-MM-DD)
  const targetDateOnly = targetDateStr.split('T')[0];
  const [tYear, tMonth, tDay] = targetDateOnly.split('-').map(Number);
  
  let fromYear: number, fromMonth: number, fromDay: number;
  if (fromDateStr) {
    const fromDateOnly = fromDateStr.split('T')[0];
    [fromYear, fromMonth, fromDay] = fromDateOnly.split('-').map(Number);
  } else {
    const now = new Date();
    fromYear = now.getFullYear();
    fromMonth = now.getMonth() + 1;
    fromDay = now.getDate();
  }

  const targetUtc = Date.UTC(tYear, tMonth - 1, tDay);
  const fromUtc = Date.UTC(fromYear, fromMonth - 1, fromDay);
  
  const diffMs = targetUtc - fromUtc;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function formatDate(dateStr: string, options?: { showYear?: boolean; shortMonth?: boolean }): string {
  if (!dateStr) return '';
  const dateOnly = dateStr.split('T')[0];
  const parts = dateOnly.split('-');
  if (parts.length !== 3) return dateStr;
  
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  
  if (isNaN(year) || isNaN(month) || isNaN(day)) return dateStr;

  const monthsShort = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  const monthsFull = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
  ];

  const monthName = options?.shortMonth ? monthsShort[month - 1] : monthsFull[month - 1];
  
  if (options?.showYear) {
    return `${day} ${monthName} ${year}`;
  }
  return `${day} ${monthName}`;
}
