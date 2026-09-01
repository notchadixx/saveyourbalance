export type Marketplace = 'dns' | 'ozon' | 'wildberries' | 'sunlight' | 'other';

export type ExpenseCategory = 
  | 'продукты' 
  | 'еда_вне_дома' 
  | 'транспорт' 
  | 'авто' 
  | 'покупки' 
  | 'развлечения' 
  | 'здоровье' 
  | 'подписки' 
  | 'подарки' 
  | 'дом' 
  | 'прочее';

export interface ExpenseItem {
  id: string;
  category: string;
  categoryType: ExpenseCategory;
  title: string;
  amount: number;
  time?: string;
  notes?: string;
  isConfirmed?: boolean;
  bankSource?: string; // e.g. "Т-Банк •4821"
}

export interface DayRecord {
  date: string; // 'YYYY-MM-DD'
  dayNumber: number; // 5, 6, 7...
  dayOfWeekShort: string; // 'Пт', 'Сб', 'Вс', 'Пн'...
  dayOfWeekFull: string; // 'Пятница', 'Суббота'...
  expenses: ExpenseItem[];
  spent: number;
  normLimit: number; // e.g. 1155.51
  deviation: number; // normLimit - spent (positive = economy, negative = overspend)
  budgetRemainingOnDate: number;
  totalRemaining: number;
  isToday?: boolean;
  isPast?: boolean;
}

export interface PlannedItem {
  id: string;
  title: string;
  amount: number; // Planned budget for the period (e.g. 18000.00 for "Бенз")
  spentAmount?: number; // Spent amount so far for progress-tracked items (e.g. 12000.00)
  isProgressTracked?: boolean; // If true, renders mini-progress achievement scale (plan vs fact)
  category: 'обязательные' | 'покупки' | 'игры_хобби' | 'авто' | 'мероприятия' | 'прочее';
  isPaid: boolean;
  notes?: string;
  plannedAmountAlt?: number; // e.g. 18000 / 12000
  period?: 'current' | 'next' | 'advance_period' | 'salary_period' | string; // Перенос на другой период
}

export interface WishlistItem {
  id: string;
  title: string;
  url: string;
  marketplace: Marketplace;
  articleId?: string; // nmId on WB, product code on OZON/DNS
  price: number;
  isPurchased: boolean;
  priority: 'high' | 'medium' | 'low';
  category?: string;
  notes?: string;
  targetMonth?: string;
}

export interface CushionMonthPlan {
  year: number;
  monthName: string;
  targetAccumulated: number;
  monthlyDeposit: number;
  rateInfo: string;
  capitalization: number;
  expense: number;
  balance: number;
  deviation: number;
}

export interface MandatoryExpense {
  id: string;
  title: string;
  amount: number;
  category: string;
  isAutoCalculated?: boolean;
}

// ==========================================
// BANKING & SYNCHRONIZATION TYPES
// ==========================================

export type BankId = 'tbank' | 'sber' | 'alfa' | 'vtb' | 'raiffeisen' | 'gazprom' | 'other';

export interface BankAccount {
  id: string;
  bankId: BankId;
  bankName: string;
  accountType: 'checking' | 'savings'; // checking = дебетовая карта/основной, savings = накопительный счет/подушка
  accountName: string; // "Black Premium", "СберКарта", "Альфа-Счет"
  accountNumberMask: string; // "•4821"
  balance: number;
  interestRate?: number; // 13.5 (%)
  lastSyncedAt: string;
  isConnected: boolean;
  color: string;
}

export interface BankTransaction {
  id: string;
  bankAccountId: string;
  bankName: string;
  accountNumberMask: string;
  title: string;
  merchant: string;
  amount: number; // always positive for expense
  type: 'expense' | 'income' | 'transfer' | 'interest';
  categoryType: ExpenseCategory;
  categoryName: string;
  date: string; // 'YYYY-MM-DD'
  time: string; // 'HH:mm'
  status: 'pending' | 'approved' | 'rejected';
  isIncomeConfirmed?: boolean;
  rawSnippet?: string;
}

export type IncomeSourceType = 'bank_card' | 'cash' | 'transfer' | 'freelance' | 'bonus' | 'gift' | 'debt_return' | 'sale' | 'other';

export interface IncomeItem {
  id: string;
  title: string;
  amount: number;
  date: string; // 'YYYY-MM-DD'
  time?: string; // 'HH:mm'
  sourceType: IncomeSourceType;
  sourceName?: string; // "Т-Банк •4821", "Наличные", "СБП Перевод"
  category: string; // "Зарплата", "Аванс", "Перевод", "Наличные", "Кэшбэк", "Подработка", "Премия", "Возврат долга", "Продажа", "Подарок", "Прочее"
  isIncludedInBudget: boolean; // Включено ли в текущий расчет 30-дневного бюджета
  isManual: boolean; // Добавлено вручную пользователем
  bankTransactionId?: string; // Если создано на основе банковской входящей транзакции
  notes?: string;
  createdAt: string;
}

export interface BudgetState {
  periodTitle: string; // "05.08.2026 — 04.09.2026"
  periodStartDate: string; // "2026-08-05"
  periodEndDate: string; // "2026-09-04"
  todayDate: string; // "2026-08-28"
  
  // Advance and salary timeline
  salaryDateDay: number; // 5 (5th of month)
  advanceDateDay: number; // 20 (20th of month)
  advancePaymentDate: string; // "2026-08-20"
  estimatedAdvanceAmount: number; // 40 000.00 (estimated advance payment)
  isAdvanceReceived?: boolean; // Получен ли уже аванс в текущем периоде
  
  // High-level budget
  total30DaysBudget: number; // 135 789.69
  previousMonthRemainder: number; // 11 803.76
  safetyCushionDeposit: number; // 8 265.00
  currentSalary: number; // 82 650.00
  
  // Balance sync state
  isBalanceSynced?: boolean;
  lastBalanceSyncDate?: string;
  
  // Planned items
  plannedItems: PlannedItem[];
  
  // Daily spending data
  days: DayRecord[];
  
  // Wishlist
  wishlist: WishlistItem[];
  
  // Safety cushion
  cushionAccumulated: number; // 8 269.53 (на счетах / вкладах)
  cushionCash: number; // Наличные сбережения
  cushionTargetAmount: number; // 163 294.11
  cushionTargetMonthsCount: number; // 3
  cushionMonthlyContribution: number; // Ежемесячное пополнение
  mandatoryExpenses: MandatoryExpense[];
  mandatoryExpensesMode?: 'manual' | 'auto';
  cushionSchedule: CushionMonthPlan[];
  isCushionDepositDoneThisMonth?: boolean; // Были ли совершен взнос в текущем месяце (август 2026)
  actualCushionDepositThisMonth?: number; // Сумма совершенного взноса (8 265.00)
  cushionNormMode?: 'percent' | 'fixed'; // Способ расчета нормы: процент от з/п или фиксированная сумма
  cushionNormPercent?: number; // Процент нормы (рекомендация: 10%)
  cushionNormFixedAmount?: number; // Фиксированная сумма нормы
  
  // Banking integration state
  bankAccounts: BankAccount[];
  pendingBankTransactions: BankTransaction[];
  lastBankSyncTimestamp?: string;
  
  // Income & additional inflows (card receipts, cash, freelance, gifts)
  incomes: IncomeItem[];
  
  // View mode
  isMobileFrame: boolean;
}

export type ActiveTab = 'today' | 'budget' | 'planning' | 'wishlist' | 'cushion' | 'analytics' | 'confirm-expenses';
