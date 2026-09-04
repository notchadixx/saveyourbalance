import { BudgetState, FinancialProfile } from '../types';
import { INITIAL_BUDGET_STATE } from '../mockData';

export interface ExportPayload {
  version: string;
  exportedAt: string;
  app: string;
  profile?: FinancialProfile | null;
  state: BudgetState;
}

export interface ImportValidationResult {
  isValid: boolean;
  error?: string;
  state?: BudgetState;
  profile?: FinancialProfile | null;
}

/**
 * Скачивает файл JSON с полной резервной копией бюджета
 */
export function exportBudgetDataAsJSON(state: BudgetState, profile?: FinancialProfile | null): void {
  const payload: ExportPayload = {
    version: '3.0.0',
    exportedAt: new Date().toISOString(),
    app: 'Daily Limit Budget App',
    profile: profile || state.financialProfile || null,
    state,
  };

  const jsonString = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const todayStr = state.todayDate || new Date().toISOString().split('T')[0];
  const filename = `budget_backup_${todayStr}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Экспортирует все расходы и плановые статьи в удобный CSV-файл (с UTF-8 BOM для Excel)
 */
export function exportBudgetDataAsCSV(state: BudgetState): void {
  const rows: string[][] = [
    ['Тип записи', 'Дата', 'Категория', 'Наименование', 'Сумма (₽)', 'Статус / Заметки', 'Источник / Карта']
  ];

  // 1. Все расходы по дням
  (state.days || []).forEach(day => {
    (day.expenses || []).forEach(exp => {
      rows.push([
        'Расход дня',
        day.date,
        exp.category,
        `"${(exp.title || '').replace(/"/g, '""')}"`,
        exp.amount.toFixed(2),
        exp.isConfirmed ? 'Подтвержден' : 'Ожидает',
        `"${(exp.bankSource || '').replace(/"/g, '""')}"`
      ]);
    });
  });

  // 2. Все плановые статьи
  (state.plannedItems || []).forEach(plan => {
    rows.push([
      'Плановая статья',
      state.periodStartDate,
      plan.category,
      `"${(plan.title || '').replace(/"/g, '""')}"`,
      plan.amount.toFixed(2),
      plan.isPaid ? 'Оплачено' : `План (Факт: ${(plan.spentAmount || 0).toFixed(2)})`,
      plan.type || 'план'
    ]);
  });

  // 3. Доходы
  (state.incomes || []).forEach(inc => {
    rows.push([
      'Доход',
      inc.date,
      inc.category,
      `"${(inc.title || '').replace(/"/g, '""')}"`,
      inc.amount.toFixed(2),
      inc.isIncludedInBudget ? 'Включен в бюджет' : 'Отдельно',
      `"${(inc.sourceName || '').replace(/"/g, '""')}"`
    ]);
  });

  const csvContent = '\uFEFF' + rows.map(r => r.join(';')).join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const todayStr = state.todayDate || new Date().toISOString().split('T')[0];
  const filename = `budget_transactions_${todayStr}.csv`;

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Валидирует и восстанавливает импортированные данные
 */
export function validateImportedBudgetData(rawData: any): ImportValidationResult {
  if (!rawData || typeof rawData !== 'object') {
    return { isValid: false, error: 'Файл не содержит корректного JSON-объекта.' };
  }

  // Если файл завернут в структуру ExportPayload или является чистым BudgetState
  let candidateState: any = null;
  let candidateProfile: any = null;

  if (rawData.state && typeof rawData.state === 'object') {
    candidateState = rawData.state;
    candidateProfile = rawData.profile || candidateState.financialProfile || null;
  } else {
    candidateState = rawData;
    candidateProfile = rawData.financialProfile || null;
  }

  // Проверка ключевых полей
  if (!Array.isArray(candidateState.days)) {
    return { isValid: false, error: 'Некорректная структура данных: отсутствует массив дней (days).' };
  }

  if (!candidateState.periodStartDate || typeof candidateState.periodStartDate !== 'string') {
    return { isValid: false, error: 'Некорректная структура данных: отсутствует дата начала периода.' };
  }

  // Нормализуем и объединяем с дефолтными значениями на случай отсутствия новых полей
  const mergedState: BudgetState = {
    ...INITIAL_BUDGET_STATE,
    ...candidateState,
    plannedItems: Array.isArray(candidateState.plannedItems) ? candidateState.plannedItems : INITIAL_BUDGET_STATE.plannedItems,
    days: Array.isArray(candidateState.days) ? candidateState.days : INITIAL_BUDGET_STATE.days,
    bankAccounts: Array.isArray(candidateState.bankAccounts) ? candidateState.bankAccounts : INITIAL_BUDGET_STATE.bankAccounts,
    creditCards: Array.isArray(candidateState.creditCards) ? candidateState.creditCards : (INITIAL_BUDGET_STATE.creditCards || []),
    incomes: Array.isArray(candidateState.incomes) ? candidateState.incomes : (INITIAL_BUDGET_STATE.incomes || []),
    wishlist: Array.isArray(candidateState.wishlist) ? candidateState.wishlist : INITIAL_BUDGET_STATE.wishlist,
    foodControl: candidateState.foodControl || INITIAL_BUDGET_STATE.foodControl,
    financialProfile: candidateProfile || candidateState.financialProfile,
  };

  return {
    isValid: true,
    state: mergedState,
    profile: candidateProfile,
  };
}
