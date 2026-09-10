export function formatRubles(amount: number, options?: { showCents?: boolean; sign?: boolean }): string {
  const isNegative = amount < 0;
  const absVal = Math.abs(amount);
  
  const formatted = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: options?.showCents ? 2 : (Number.isInteger(absVal) ? 0 : 2),
    maximumFractionDigits: 2,
  }).format(absVal);

  if (options?.sign) {
    return `${isNegative ? '-' : '+'}${formatted} ₽`;
  }
  return `${isNegative ? '-' : ''}${formatted} ₽`;
}
