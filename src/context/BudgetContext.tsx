import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { 
  BudgetState, 
  DayRecord,
  ExpenseItem, 
  PlannedItem, 
  WishlistItem, 
  ActiveTab, 
  BankAccount, 
  BankTransaction,
  ExpenseCategory,
  MandatoryExpense,
  CushionMonthPlan,
  IncomeItem,
  IncomeSourceType,
  FinancialProfile,
  CreditCard,
  SuggestedRegularExpense,
  PaymentDateOptimizationAdvice,
  FoodItem,
  FoodControlState,
  FoodControlMode,
  MarketplaceOrder,
  MarketplaceSyncState
} from '../types';
import { INITIAL_BUDGET_STATE, getTodayDateString, buildCushionSchedule } from '../mockData';
import { useAuth } from './AuthContext';
import { useProfile } from './ProfileContext'; // <-- ДОБАВЛЕНО
import { db, doc, safeSetDoc, onSnapshot } from '../lib/firebase';
import { getSalaryDateInfo, SalaryScheduleInfo, generateMonthDays } from '../utils/salaryUtils';
import { 
  PeriodTemplate, 
  generateRollingPeriodTemplates, 
  generatePeriodTemplateForMonth, 
  findPeriodTemplateForDate 
} from '../utils/periodUtils';
import { buildInitialStateFromProfile } from '../utils/profileBudgetBuilder'; // <-- ДОБАВЛЕНО
import { 
  analyzeBankTransactionsForRegularExpenses, 
  analyzePaymentDates 
} from '../utils/regularExpenseAnalyzer';
import {
  calculateBasketTotal,
  calculateTotalFoodSpentInPeriod,
  generateDefaultFoodPriceHistory
} from '../utils/foodBasketUtils';

const STORAGE_KEY = 'daily_limit_budget_app_state_v3';

export interface UnrealizedPlanSaving {
  id: string;
  title: string;
  category: string;
  plannedAmount: number;
  spentAmount: number;
  savedAmount: number;
}

export interface PeriodEndingRemainderInfo {
  dailyBudgetRemaining: number;
  unrealizedPlansSavings: number;
  totalEndingRemainder: number;
  unrealizedPlansBreakdown: UnrealizedPlanSaving[];
}

export interface BudgetContextType {
  state: BudgetState;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  isMobileFrame: boolean;
  toggleMobileFrame: () => void;
  
  // Theme mode
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  
  // Cloud sync status
  syncStatus: 'synced' | 'saving' | 'offline' | 'guest';
  
  // Calculated stats based on Google Sheets formulas
  totalPlannedSum: number; // SUM(B4:B20)
  freeDiscretionaryBudget: number; // D1 = B1 - SUM(B4:B20) - B3
  baseDailyNorm: number; // E1 = D1 / 30
  daysToSalary: number; // D3 = COUNTIF(G:G, ">=TODAY")
  cleanRemainderToday: number; // D5 = D1 - SUM(H_start : H_today)
  todayAllowedSpend: number; // E3 = D5 / D3 (Daily limit on today before spend)
  todayRemainingAfterSpend: number; // E3 - todaySpent
  todaySpent: number; // H_today
  todayRemainingForecast: number; // J33 = Sum of deviations up to today
  avgSpendPerDay: number; // D7 = AVERAGEIF(H, ">0")
  medianSpendPerDay: number; // E7 = MEDIAN(H)
  cushionProgressPercent: number; // Накоплено / Цель * 100%
  unconfirmedCountToday: number; // Unconfirmed expenses count for today
  totalUnconfirmedCount: number; // Total unconfirmed expenses count
  
  // Period & Salary Rollover info
  rollingPeriods: PeriodTemplate[];
  currentPeriodTemplate: PeriodTemplate;
  selectedPeriodId: string;
  setSelectedPeriodId: (periodId: string) => void;
  activeViewingPeriod: PeriodTemplate;
  setPeriodByTemplate: (periodId: string) => void;
  salarySchedule: SalaryScheduleInfo;
  periodEndingRemainderInfo: PeriodEndingRemainderInfo;

  // Banking integration metrics
  totalCheckingBankBalance: number;
  totalSavingsBankBalance: number;
  bankDiscrepancyAmount: number; // Total checking bank balance - cleanRemainderToday
  pendingBankTransactionsCount: number;
  isBankSyncing: boolean;

  // Incomes & Inflow Analysis
  incomes: IncomeItem[];
  pendingBankIncomes: BankTransaction[];
  pendingBankIncomesCount: number;
  pendingBankIncomesTotal: number;
  totalIncludedAdditionalIncomes: number;

  // Advance & Correction metrics
  isAdvanceDateReached: boolean;
  unreachedPlannedExpenses: number; // Недостигнутые запланированные расходы (в т.ч. остаток лимита на бензин)
  calculatedBudgetCorrection: number; // Формула: Чистый_остаток - (баланс_карт [ + аванс_до_20 ] - нереализованные_планы)
  isBalanceSynced: boolean;

  // Actions
  addExpenseToDate: (date: string, expense: Omit<ExpenseItem, 'id'>) => void;
  updateExpense: (date: string, expenseId: string, updated: Partial<ExpenseItem>) => void;
  deleteExpenseFromDate: (date: string, expenseId: string) => void;
  toggleExpenseConfirmed: (date: string, expenseId: string) => void;
  confirmAllExpensesForDate: (date: string) => void;
  togglePlannedItemPaid: (id: string) => void;
  addPlannedItem: (item: Omit<PlannedItem, 'id'>) => void;
  updatePlannedItem: (id: string, updated: Partial<PlannedItem>) => void;
  deletePlannedItem: (id: string) => void;
  updatePlannedItemProgress: (id: string, spentAmount: number) => void;
  addSpentToPlannedItem: (id: string, amountToAdd: number) => void;
  movePlannedToWishlist: (id: string) => void;
  applyBudgetCorrection: (target?: 'planned' | 'today') => { success: boolean; message: string; amount: number };
  applyBalanceSync: () => { success: boolean; message: string; amount: number };
  updateAdvanceSettings: (estimatedAmount: number, advanceDateDay: number) => void;
  
  // Wishlist actions
  toggleWishlistPurchased: (id: string) => void;
  addWishlistItem: (item: Omit<WishlistItem, 'id'>) => void;
  updateWishlistItem: (id: string, updated: Partial<WishlistItem>) => void;
  deleteWishlistItem: (id: string) => void;
  clearPurchasedWishlist: () => void;
  moveWishlistToPlanned: (id: string, period?: string) => void;

  // Cushion & Mandatory expenses actions
  depositToCushion: (amount: number) => void;
  withdrawFromCushion: (amount: number, reason?: string) => void;
  updateCushionAccumulated: (amount: number) => void;
  updateCashSavings: (amount: number) => void;
  updateCushionMonthlyContribution: (amount: number) => void;
  updateCurrentSalary: (salary: number) => void;
  setCushionDepositStatus: (isDeposited: boolean, amount?: number) => void;
  updateActualCushionDepositThisMonth: (amount: number) => void;
  updateCushionNorm: (mode: 'percent' | 'fixed', percent?: number, fixedAmount?: number) => void;
  updateMandatoryExpense: (id: string, updated: Partial<MandatoryExpense>) => void;
  addMandatoryExpense: (expense: Omit<MandatoryExpense, 'id'>) => void;
  deleteMandatoryExpense: (id: string) => void;
  setMandatoryExpensesMode: (mode: 'manual' | 'auto') => void;

  updateBudgetSettings: (budget: number, rollover: number, cushionDeposit: number, salary: number) => void;
  startNewPeriod: (options?: { newSalary?: number; targetDate?: string; customRollover?: number }) => { success: boolean; message: string; rolloverAmount: number };
  receiveSalary: (amount?: number) => void;
  ensureDaysForMonth: (year: number, month: number) => void;
  resetToDefaults: () => void;

  // Incomes Actions
  acceptBankIncomeToBudget: (transactionId: string, customCategory?: string, customTitle?: string) => void;
  rejectBankIncome: (transactionId: string) => void;
  addManualIncome: (income: Omit<IncomeItem, 'id' | 'createdAt'>) => void;
  toggleIncomeBudgetInclusion: (incomeId: string) => void;
  deleteIncome: (incomeId: string) => void;
  editIncome: (incomeId: string, updated: Partial<IncomeItem>) => void;

  // Banking Actions
  approveBankTransaction: (transactionId: string) => void;
  rejectBankTransaction: (transactionId: string) => void;
  confirmPlannedBankTransaction: (transactionId: string, plannedItemId: string) => { success: boolean; message: string };
  transferPlannedItemPeriod: (itemId: string, targetPeriod: string) => void;
  approveAllPendingBankTransactions: () => void;
  rejectAllPendingBankTransactions: () => void;
  confirmPendingIncome: (transactionId: string, isIncome: boolean) => void;
  syncBankAccounts: () => Promise<void>;
  parseAndImportBankSnippet: (snippet: string) => { success: boolean; message: string; transaction?: BankTransaction };
  reconcileCushionWithBank: (bankAccountId?: string) => { success: boolean; message: string; interestAdded: number };
  applyBalanceCorrection: (adjustmentAmount: number, mode: 'expense' | 'budget_adjust', reason?: string) => void;
  updateBankAccountBalance: (accountId: string, newBalance: number) => void;
  addBankAccount: (account: Omit<BankAccount, 'id'>) => void;
  removeBankAccount: (id: string) => void;

  // Credit Cards Actions
  addCreditCard: (card: Omit<CreditCard, 'id' | 'lastUpdated'>) => void;
  updateCreditCard: (id: string, updated: Partial<CreditCard>) => void;
  removeCreditCard: (id: string) => void;
  updateCreditCardDebt: (id: string, newDebt: number) => void;
  refreshCreditCardGracePeriod: (id: string, newGraceDate?: string) => void;

  // Regular Expenses AI Actions
  analyzeRegularExpenses: () => SuggestedRegularExpense[];
  applySuggestedPlans: (suggestions: SuggestedRegularExpense[]) => void;
  setRegularExpensesAnalyzed: (status?: boolean) => void;
  ignoreMerchant: (merchant: string) => void;
  togglePlannedItemAutoRenew: (id: string) => void;
  getPaymentDateAdvice: () => PaymentDateOptimizationAdvice;

  // Food & Groceries Management Actions
  setFoodControl: (config: FoodControlState) => void;
  setFoodMode: (mode: FoodControlMode) => void;
  updateBasketItem: (id: string, updated: Partial<FoodItem>) => void;
  addBasketItem: (item: Omit<FoodItem, 'id' | 'lastUpdated'>) => void;
  removeBasketItem: (id: string) => void;
  updateFoodLimit: (limit: number) => void;
  syncFoodPlanWithBudget: () => void;
  totalFoodSpentThisPeriod: number;

  // Marketplace Sync Actions (WB & OZON)
  connectMarketplace: (marketplace: 'wildberries' | 'ozon') => void;
  disconnectMarketplace: (marketplace: 'wildberries' | 'ozon') => void;
  syncMarketplaceOrders: () => void;
  cancelMarketplaceOrder: (orderId: string) => void;
  receiveMarketplaceOrder: (orderId: string) => void;
  recordMarketplaceWalletTopup: (marketplace: 'wildberries' | 'ozon', amount: number) => void;

  // Profile & Data Management
  updateUserProfile: (settings: { userName?: string; currency?: string; includeAdvanceInBudget?: boolean }) => void;
  updateFinancialProfileState: (settings: {
    salaryDateDay: number;
    advanceDateDay?: number;
    currentSalary?: number;
    hasAdvance?: boolean;
    cushionNormMode?: 'percent' | 'fixed';
    cushionNormPercent?: number;
    cushionNormFixedAmount?: number;
    includeAdvanceInBudget?: boolean;
    advanceTreatment?: 'include' | 'separate';
  }) => void;
  importBudgetState: (newState: BudgetState) => { success: boolean; message: string };

  // <-- ДОБАВЛЕНО: метод инициализации из профиля
  initializeBudgetFromProfile: (profile: FinancialProfile) => void;
}

// Monthly cushion norm calculator
export function calculateMonthlyCushionNorm(
  salary: number,
  mode: 'percent' | 'fixed' = 'percent',
  percent: number = 10,
  fixedAmount: number = 8265
): number {
  if (mode === 'fixed') {
    return Math.max(0, Math.round((fixedAmount || 0) * 100) / 100);
  }
  const pct = typeof percent === 'number' && !isNaN(percent) ? percent : 10;
  return Math.max(0, Math.round(salary * (pct / 100) * 100) / 100);
}

// Dynamic cushion schedule generator helper based on exact user specification
export function generateDynamicCushionSchedule(params: {
  currentSalary: number;
  isDepositMade: boolean;
  actualDepositAmount: number;
  bankAccumulated: number;
  startMonth?: number;
  startYear?: number;
  rateInfo?: string;
  normMode?: 'percent' | 'fixed';
  normPercent?: number;
  normFixedAmount?: number;
}): CushionMonthPlan[] {
  const {
    currentSalary,
    isDepositMade,
    actualDepositAmount,
    bankAccumulated,
    startMonth = 8,
    startYear = 2026,
    rateInfo = '13.5%',
    normMode = 'percent',
    normPercent = 10,
    normFixedAmount = 8265,
  } = params;

  const monthsRu = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  const schedule: CushionMonthPlan[] = [];
  const monthlyNorm = calculateMonthlyCushionNorm(currentSalary, normMode, normPercent, normFixedAmount);

  // Month 0 (August 2026):
  // If deposit made: target = actualDepositAmount (includes difference from norm)
  // If deposit not made: target = monthlyNorm
  const targetMonth0 = isDepositMade ? actualDepositAmount : monthlyNorm;

  let currentY = startYear;
  let currentM = startMonth;
  let runningTarget = targetMonth0;

  const TOTAL_MONTHS = 48; // 4 years projection (2026 - 2030)

  for (let i = 0; i < TOTAL_MONTHS; i++) {
    const monthName = monthsRu[currentM - 1];

    if (i === 0) {
      // Current month (August 2026): filled because contribution has been made
      const depositThisMonth = isDepositMade ? actualDepositAmount : 0;
      const balanceThisMonth = isDepositMade ? bankAccumulated : 0;
      const capitalizationThisMonth = isDepositMade
        ? Math.max(0, Math.round((bankAccumulated - depositThisMonth) * 100) / 100) || 4.53
        : 0;
      const deviationThisMonth = isDepositMade
        ? Math.round((balanceThisMonth - targetMonth0) * 100) / 100
        : -targetMonth0;

      schedule.push({
        year: currentY,
        monthName,
        targetAccumulated: targetMonth0,
        monthlyDeposit: depositThisMonth,
        rateInfo: isDepositMade ? rateInfo : '—',
        capitalization: capitalizationThisMonth,
        expense: 0,
        balance: balanceThisMonth,
        deviation: deviationThisMonth,
      });

      runningTarget = targetMonth0;
    } else {
      // Future months: Цель на период = Цель(предыдущего месяца) + норма от зарплаты (или фикс)
      runningTarget = Math.round((runningTarget + monthlyNorm) * 100) / 100;

      // Only "Цель на период" is filled for future rows; other columns remain unfilled ('—')
      schedule.push({
        year: currentY,
        monthName,
        targetAccumulated: runningTarget,
        monthlyDeposit: 0,
        rateInfo: '—',
        capitalization: 0,
        expense: 0,
        balance: 0,
        deviation: 0,
      });
    }

    currentM++;
    if (currentM > 12) {
      currentM = 1;
      currentY++;
    }
  }

  return schedule;
}

/**
 * Computes the clean unspent remainder from the last day of the previous period.
 */
export function calculateCleanRemainderFromPreviousPeriod(
  days: DayRecord[],
  prevPeriodStart?: string,
  prevPeriodEnd?: string,
  fallbackAmount: number = 11803.76
): number {
  if (!days || days.length === 0) return fallbackAmount;

  const prevDays = days.filter(d => 
    (!prevPeriodStart || d.date >= prevPeriodStart) && 
    (!prevPeriodEnd || d.date <= prevPeriodEnd)
  ).sort((a, b) => a.date.localeCompare(b.date));

  if (prevDays.length === 0) return fallbackAmount;

  const lastDay = prevDays[prevDays.length - 1];

  if (typeof lastDay.totalRemaining === 'number' && !isNaN(lastDay.totalRemaining) && lastDay.totalRemaining > 0) {
    return Math.round(lastDay.totalRemaining * 100) / 100;
  }
  if (typeof lastDay.budgetRemainingOnDate === 'number' && !isNaN(lastDay.budgetRemainingOnDate) && lastDay.budgetRemainingOnDate > 0) {
    return Math.round(lastDay.budgetRemainingOnDate * 100) / 100;
  }

  const totalNorm = prevDays.reduce((sum, d) => sum + (d.normLimit || 0), 0);
  const totalSpent = prevDays.reduce((sum, d) => sum + (d.spent || 0), 0);
  const diff = totalNorm - totalSpent;
  if (!isNaN(diff) && diff > 0) {
    return Math.round(diff * 100) / 100;
  }

  return fallbackAmount;
}

/**
 * Cleanly migrates budget state to the new period (e.g. September 2026).
 * Ensures all sections are reset for fresh entries, only clean remainder carries over until salary arrives.
 */
export function migrateStateToNewPeriod(
  currentState: BudgetState, 
  actualToday: string = getTodayDateString(),
  customRollover?: number
): BudgetState {
  const salaryDay = currentState.salaryDateDay || 5;
  const advanceDay = currentState.advanceDateDay || 20;

  // Determine current period template
  const newTemplate = generatePeriodTemplateForMonth(
    2026, 
    9, 
    salaryDay, 
    advanceDay, 
    actualToday
  );

  const newStartDate = newTemplate.startDateStr;
  const newEndDate = newTemplate.endDateStr;
  const newTitle = newTemplate.formattedLabel;
  const newAdvanceDate = newTemplate.advanceDateStr;

  // 1. Calculate clean rollover amount from previous period
  const rolloverAmount = customRollover !== undefined
    ? customRollover
    : calculateCleanRemainderFromPreviousPeriod(
        currentState.days || [],
        currentState.periodStartDate,
        currentState.periodEndDate,
        11803.76
      );

  // 2. Plans migration:
  // - Previous completed one-time items archived to 'previous'
  // - Next-period plans promoted to 'current' with spent: 0, isPaid: false
  // - Recurring plans kept in 'current' with spent: 0, isPaid: false
  const updatedPlannedItems: PlannedItem[] = (currentState.plannedItems || []).map(item => {
    const isRecurring = item.autoRenew !== false && (
      item.category === 'обязательные' ||
      item.isProgressTracked ||
      item.title.toLowerCase().includes('бенз') ||
      item.title.toLowerCase().includes('ddx') ||
      item.title.toLowerCase().includes('ростелеком')
    );

    if (item.period === 'next') {
      return {
        ...item,
        period: 'current',
        spentAmount: 0,
        isPaid: false,
      };
    }

    if (isRecurring) {
      return {
        ...item,
        period: 'current',
        spentAmount: 0,
        isPaid: false,
      };
    }

    return {
      ...item,
      period: 'previous',
    };
  });

  // 3. Daily norm calculation
  const newSalary = currentState.currentSalary || 82650;
  const cushionPercent = (currentState.cushionNormPercent || 10) / 100;
  const newCushion = Math.round(newSalary * cushionPercent);
  const recurringPlansTotal = updatedPlannedItems
    .filter(p => !p.period || p.period === 'current')
    .reduce((sum, p) => sum + p.amount, 0);

  const expectedTotalFunds = rolloverAmount + (newSalary - newCushion);
  const expectedDiscretionary = Math.max(0, expectedTotalFunds - recurringPlansTotal);
  const newDailyNorm = Math.round((expectedDiscretionary / (newTemplate.totalDays || 31)) * 100) / 100;

  // 4. Generate clean days for the new period
  const daysShort = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const daysFull = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
  const newPeriodDays: DayRecord[] = [];

  const startDParts = newStartDate.split('-').map(Number);
  const endDParts = newEndDate.split('-').map(Number);
  const curr = new Date(startDParts[0], startDParts[1] - 1, startDParts[2]);
  const end = new Date(endDParts[0], endDParts[1] - 1, endDParts[2]);

  while (curr <= end) {
    const y = curr.getFullYear();
    const m = String(curr.getMonth() + 1).padStart(2, '0');
    const d = String(curr.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    const dayOfWeek = curr.getDay();

    newPeriodDays.push({
      date: dateStr,
      dayNumber: curr.getDate(),
      dayOfWeekShort: daysShort[dayOfWeek],
      dayOfWeekFull: daysFull[dayOfWeek],
      expenses: [],
      spent: 0,
      normLimit: newDailyNorm,
      deviation: newDailyNorm,
      budgetRemainingOnDate: newDailyNorm,
      totalRemaining: rolloverAmount,
      isToday: dateStr === actualToday,
      isPast: dateStr < actualToday,
    });

    curr.setDate(curr.getDate() + 1);
  }

  // Preserve previous days for historical records
  const existingDaysMap = new Map<string, DayRecord>(
    (currentState.days || []).map(d => [d.date, { ...d, isToday: false, isPast: true }])
  );
  newPeriodDays.forEach(d => {
    existingDaysMap.set(d.date, d);
  });
  const combinedDays = Array.from(existingDaysMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  // 5. Cushion Schedule fresh start
  const freshCushionSchedule = buildCushionSchedule(
    newSalary,
    false,
    0.00,
    currentState.cushionAccumulated || 8269.53,
    9,
    2026,
    currentState.cushionNormMode || 'percent',
    currentState.cushionNormPercent ?? 10,
    currentState.cushionNormFixedAmount ?? 8265.00
  );

  return {
    ...currentState,
    periodTitle: newTitle,
    periodStartDate: newStartDate,
    periodEndDate: newEndDate,
    advancePaymentDate: newAdvanceDate,
    isAdvanceReceived: false,
    isSalaryReceived: false,
    actualSalaryAmount: undefined,
    salaryReceivedDate: undefined,
    todayDate: actualToday,
    total30DaysBudget: rolloverAmount, // Clean remainder until salary arrives!
    previousMonthRemainder: rolloverAmount,
    safetyCushionDeposit: 0.00,
    isCushionDepositDoneThisMonth: false,
    actualCushionDepositThisMonth: 0.00,
    cushionSchedule: freshCushionSchedule,
    plannedItems: updatedPlannedItems,
    days: combinedDays,
  };
}

const THEME_STORAGE_KEY = 'limit_dnya_theme_mode';

const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

export const BudgetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { profile, isOnboardingComplete } = useProfile(); // <-- ДОБАВЛЕНО
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'offline' | 'guest'>('guest');
  const [isBankSyncing, setIsBankSyncing] = useState(false);
  const isRemoteUpdateRef = useRef(false);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme === 'light' || savedTheme === 'dark') {
        return savedTheme;
      }
      if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch {
      // ignore
    }
    return 'light';
  });

  const [state, setState] = useState<BudgetState>(() => {
    const actualToday = getTodayDateString();
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        let parsed = JSON.parse(saved);
        // ensure bank and income properties exist
        if (!parsed.bankAccounts) parsed.bankAccounts = INITIAL_BUDGET_STATE.bankAccounts;
        if (!parsed.pendingBankTransactions) parsed.pendingBankTransactions = INITIAL_BUDGET_STATE.pendingBankTransactions;
        if (!parsed.incomes) parsed.incomes = INITIAL_BUDGET_STATE.incomes || [];
        
        parsed.todayDate = actualToday;

        // Check if state needs clean period rollover migration:
        // 1. If periodStartDate is before September 4, 2026
        // 2. OR if total30DaysBudget is carrying old full amount without salary received
        // 3. OR if parsed.periodEndDate < actualToday
        const needsPeriodRollover = !parsed.periodStartDate || 
          parsed.periodStartDate < '2026-09-04' || 
          parsed.periodEndDate < actualToday ||
          (!parsed.isSalaryReceived && parsed.total30DaysBudget > 50000);

        if (needsPeriodRollover) {
          parsed = migrateStateToNewPeriod(parsed, actualToday);
        } else {
          if (Array.isArray(parsed.days)) {
            parsed.days = parsed.days.map((d: DayRecord) => ({
              ...d,
              isToday: d.date === actualToday,
              isPast: d.date < actualToday,
            }));
          }
        }
        return parsed;
      }
    } catch {
      // Fallback
    }
    return {
      ...INITIAL_BUDGET_STATE,
      todayDate: actualToday,
      days: (INITIAL_BUDGET_STATE.days || []).map(d => ({
        ...d,
        isToday: d.date === actualToday,
        isPast: d.date < actualToday,
      }))
    };
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('today');
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayDateString());
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('2026-08');
  const [isMobileFrame, setIsMobileFrame] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth > 768;
    }
    return false;
  });

  // Sync theme
  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      document.documentElement.setAttribute('data-theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {
      console.error('Failed to sync theme', e);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  // Synchronize todayDate with the actual current date on window focus or interval
  useEffect(() => {
    const syncCurrentDate = () => {
      const actualToday = getTodayDateString();
      setState(prev => {
        if (prev.todayDate === actualToday) return prev;
        return {
          ...prev,
          todayDate: actualToday,
          days: (prev.days || []).map(d => ({
            ...d,
            isToday: d.date === actualToday,
            isPast: d.date < actualToday
          }))
        };
      });
    };

    window.addEventListener('focus', syncCurrentDate);
    const interval = setInterval(syncCurrentDate, 30000);
    return () => {
      window.removeEventListener('focus', syncCurrentDate);
      clearInterval(interval);
    };
  }, []);

  // Sync state with Firestore when user is authenticated
  useEffect(() => {
    if (!user) {
      setSyncStatus('guest');
      return;
    }

    setSyncStatus('saving');
    const userDocRef = doc(db, 'users', user.uid, 'budgetData', 'state');

    const unsubscribe = onSnapshot(
      userDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const cloudData = snapshot.data() as BudgetState;
          if (cloudData && cloudData.days && cloudData.days.length > 0) {
            isRemoteUpdateRef.current = true;
            setState(cloudData);
            setSyncStatus('synced');
            return;
          }
        }
        
        // If document doesn't exist yet, seed initial user state
        safeSetDoc(userDocRef, state, { merge: true })
          .then(() => setSyncStatus('synced'))
          .catch((err) => {
            console.error('Failed to seed budget to Firestore:', err);
            setSyncStatus('offline');
          });
      },
      (err) => {
        console.error('Firestore snapshot error:', err);
        setSyncStatus('offline');
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Persist state changes to localStorage and Firestore
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save state to localStorage', e);
    }

    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false;
      return;
    }

    if (user) {
      setSyncStatus('saving');
      const timer = setTimeout(async () => {
        try {
          const userDocRef = doc(db, 'users', user.uid, 'budgetData', 'state');
          await safeSetDoc(userDocRef, {
            ...state,
            updatedAt: new Date().toISOString(),
          }, { merge: true });
          setSyncStatus('synced');
        } catch (err) {
          console.error('Error saving state to Firestore:', err);
          setSyncStatus('offline');
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [state, user]);

  // <-- ДОБАВЛЕНО: автоматическая инициализация из профиля, если нет сохранённого состояния
  useEffect(() => {
    if (profile && isOnboardingComplete) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        const newState = buildInitialStateFromProfile(profile);
        setState(newState);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
        if (user) {
          const userDocRef = doc(db, 'users', user.uid, 'budgetData', 'state');
          safeSetDoc(userDocRef, { ...newState, updatedAt: new Date().toISOString() }, { merge: true });
        }
      }
    }
  }, [profile, isOnboardingComplete, user]);

  const toggleMobileFrame = () => {
    setIsMobileFrame(prev => !prev);
  };

  // ==========================================
  // EXACT GOOGLE SPREADSHEET FORMULA ENGINE
  // ==========================================

  // 1. Total planned items sum = SUM(B4:B20) for current period only
  const totalPlannedSum = useMemo(() => {
    return (state.plannedItems || [])
      .filter(item => !item.period || item.period === 'current')
      .reduce((acc, item) => acc + item.amount, 0);
  }, [state.plannedItems]);

  // 2. D1 "Итого на прочее" = B1 (Общий бюджет) - SUM(B4:B20) (Плановые статьи) - B3 (Подушка)
  // When salary is not yet received, calculate expected month discretionary so baseDailyNorm reflects full month accurately
  const freeDiscretionaryBudget = useMemo(() => {
    if (state.isSalaryReceived) {
      return Math.max(0, state.total30DaysBudget - totalPlannedSum - (state.safetyCushionDeposit || 0));
    }
    const expectedSalary = state.currentSalary || 82650;
    const expectedCushion = Math.round(expectedSalary * ((state.cushionNormPercent || 10) / 100));
    const expectedTotalMonthFunds = (state.previousMonthRemainder || 0) + expectedSalary - expectedCushion;
    return Math.max(0, expectedTotalMonthFunds - totalPlannedSum);
  }, [state.isSalaryReceived, state.total30DaysBudget, totalPlannedSum, state.safetyCushionDeposit, state.currentSalary, state.cushionNormPercent, state.previousMonthRemainder]);

  // Dynamic Rolling Period Templates (always includes 12+ months ahead)
  const rollingPeriods = useMemo(() => {
    const refDate = state.todayDate || getTodayDateString();
    const salaryDay = state.salaryDateDay || 5;
    const advanceDay = state.advanceDateDay || 20;
    return generateRollingPeriodTemplates(refDate, 4, 14, salaryDay, advanceDay);
  }, [state.todayDate, state.salaryDateDay, state.advanceDateDay]);

  // Current period template matching state.todayDate
  const currentPeriodTemplate = useMemo(() => {
    const refDate = state.todayDate || getTodayDateString();
    const found = findPeriodTemplateForDate(refDate, rollingPeriods);
    if (found) return found;
    return generatePeriodTemplateForMonth(2026, 9, state.salaryDateDay || 5, state.advanceDateDay || 20, refDate);
  }, [state.todayDate, state.salaryDateDay, state.advanceDateDay, rollingPeriods]);

  // 3. E1 "Итого в день" (Базовая норма) = D1 / totalDaysInPeriod
  const baseDailyNorm = useMemo(() => {
    const totalDays = currentPeriodTemplate?.totalDays || 31;
    if (freeDiscretionaryBudget > 0) {
      return Math.round((freeDiscretionaryBudget / totalDays) * 100) / 100;
    }
    return 2110.68;
  }, [freeDiscretionaryBudget, currentPeriodTemplate?.totalDays]);

  // 4. Days index & D3 "Дней до зарплаты"
  const todayIdx = useMemo(() => {
    const idx = (state.days || []).findIndex(d => d.date === state.todayDate);
    return idx >= 0 ? idx : 0;
  }, [state.days, state.todayDate]);

  // Accurate calculation of days to salary / end of current period
  const daysToSalary = useMemo(() => {
    const todayStr = state.todayDate || getTodayDateString();
    const targetDateStr = currentPeriodTemplate?.endDateStr || state.periodEndDate;

    if (todayStr && targetDateStr) {
      try {
        const todayObj = new Date(todayStr + 'T00:00:00');
        const targetObj = new Date(targetDateStr + 'T00:00:00');
        const diffMs = targetObj.getTime() - todayObj.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        if (!isNaN(diffDays)) {
          const remainingDays = diffDays + 1;
          return remainingDays >= 0 ? remainingDays : 0;
        }
      } catch {
        // ignore and fallback
      }
    }

    const targetIdx = (state.days || []).findIndex(d => d.date === targetDateStr);
    if (targetIdx >= 0 && todayIdx >= 0) {
      return Math.max(0, targetIdx - todayIdx + 1);
    }

    const daysLen = (state.days || []).length;
    const remaining = daysLen - todayIdx;
    return remaining >= 0 ? remaining : 1;
  }, [state.days, todayIdx, state.todayDate, currentPeriodTemplate?.endDateStr, state.periodEndDate]);

  // 5. Total spent from start of current period up to today (does NOT include previous period)
  const totalPastAndTodaySpent = useMemo(() => {
    const startStr = state.periodStartDate;
    return (state.days || [])
      .filter(d => (!startStr || d.date >= startStr) && d.date <= state.todayDate)
      .reduce((sum, d) => sum + d.spent, 0);
  }, [state.days, state.periodStartDate, state.todayDate]);

  // 6. D5 "Чистый остаток на сегодня"
  const cleanRemainderToday = useMemo(() => {
    if (state.isSalaryReceived) {
      return Math.max(0, freeDiscretionaryBudget - totalPastAndTodaySpent);
    }
    // Before salary arrives, remaining funds are from previousMonthRemainder
    return Math.max(0, (state.previousMonthRemainder || 0) - totalPastAndTodaySpent);
  }, [state.isSalaryReceived, freeDiscretionaryBudget, state.previousMonthRemainder, totalPastAndTodaySpent]);

  // 7. E3 "Общий допустимый расход на сегодня"
  const todayAllowedSpend = useMemo(() => {
    const daysCount = Math.max(1, daysToSalary);
    if (!state.isSalaryReceived) {
      return Math.min(cleanRemainderToday, baseDailyNorm);
    }
    const calculated = cleanRemainderToday / daysCount;
    if (calculated > 0) return Math.round(calculated * 100) / 100;
    return baseDailyNorm > 0 ? baseDailyNorm : 2110.68;
  }, [state.isSalaryReceived, cleanRemainderToday, daysToSalary, baseDailyNorm]);

  // Today record & today spent
  const todayRecord = useMemo(() => {
    return (state.days || []).find(d => d.date === state.todayDate) || (state.days || [])[todayIdx];
  }, [state.days, state.todayDate, todayIdx]);

  const todaySpent = useMemo(() => {
    return todayRecord?.spent || 0;
  }, [todayRecord]);

  const todayRemainingAfterSpend = useMemo(() => {
    return Math.max(0, todayAllowedSpend - todaySpent);
  }, [todayAllowedSpend, todaySpent]);

  // 8. Forecast of ending period remainder:
  // Strictly sums accumulated daily savings (deviations) from elapsed days in the CURRENT period only.
  // Does NOT leak savings from the previous period!
  const todayRemainingForecast = useMemo(() => {
    const startStr = state.periodStartDate;
    const endStr = state.periodEndDate;

    const currentPeriodDays = (state.days || []).filter(d => 
      (!startStr || d.date >= startStr) && (!endStr || d.date <= endStr)
    );

    const pastDaysInPeriod = currentPeriodDays.filter(d => d.date < state.todayDate);
    const todayRec = currentPeriodDays.find(d => d.date === state.todayDate);

    let accumulatedEconomy = pastDaysInPeriod.reduce((acc, d) => acc + (d.normLimit - d.spent), 0);
    if (todayRec) {
      accumulatedEconomy += (todayRec.normLimit - todayRec.spent);
    }

    return Math.round(accumulatedEconomy * 100) / 100;
  }, [state.days, state.periodStartDate, state.periodEndDate, state.todayDate]);

  // 9. D7 "Средний расход в сутки", 10. E7 "Медианный расход"
  const { avgSpendPerDay, medianSpendPerDay } = useMemo(() => {
    const daysList = state.days || [];
    const pastDays = daysList.filter((_, idx) => idx <= todayIdx);
    const activeSpends = pastDays.map(d => d.spent).filter(s => s > 0);

    if (activeSpends.length === 0) {
      return { avgSpendPerDay: 600.63, medianSpendPerDay: 545.00 };
    }

    const avg = activeSpends.reduce((a, b) => a + b, 0) / activeSpends.length;

    const sorted = [...activeSpends].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 !== 0 
      ? sorted[mid] 
      : (sorted[mid - 1] + sorted[mid]) / 2;

    return {
      avgSpendPerDay: avg,
      medianSpendPerDay: median,
    };
  }, [state.days, todayIdx]);

  // Cushion progress
  const cushionProgressPercent = useMemo(() => {
    if (!state.cushionTargetAmount) return 0;
    return (state.cushionAccumulated / state.cushionTargetAmount) * 100;
  }, [state.cushionAccumulated, state.cushionTargetAmount]);

  // Unconfirmed counts
  const unconfirmedCountToday = useMemo(() => {
    return (todayRecord?.expenses || []).filter(e => !e.isConfirmed).length;
  }, [todayRecord]);

  const totalUnconfirmedCount = useMemo(() => {
    return (state.days || []).reduce((sum, d) => sum + (d.expenses || []).filter(e => !e.isConfirmed).length, 0);
  }, [state.days]);

  // ==========================================
  // BANKING INTEGRATION METRICS
  // ==========================================

  // Checking card balances sum
  const totalCheckingBankBalance = useMemo(() => {
    return (state.bankAccounts || [])
      .filter(acc => acc.accountType === 'checking' && acc.isConnected)
      .reduce((sum, acc) => sum + acc.balance, 0);
  }, [state.bankAccounts]);

  // Savings / Cushion balances sum
  const totalSavingsBankBalance = useMemo(() => {
    return (state.bankAccounts || [])
      .filter(acc => acc.accountType === 'savings' && acc.isConnected)
      .reduce((sum, acc) => sum + acc.balance, 0);
  }, [state.bankAccounts]);

  // Discrepancy between bank checking cards and app's clean remainder today
  const bankDiscrepancyAmount = useMemo(() => {
    return totalCheckingBankBalance - cleanRemainderToday;
  }, [totalCheckingBankBalance, cleanRemainderToday]);

  const pendingBankTransactionsCount = useMemo(() => {
    return (state.pendingBankTransactions || []).filter(t => t.status === 'pending').length;
  }, [state.pendingBankTransactions]);

  // Incoming bank transactions awaiting user decision
  const pendingBankIncomes = useMemo(() => {
    return (state.pendingBankTransactions || []).filter(
      t => (t.type === 'income' || t.type === 'transfer' || t.type === 'interest') && t.status === 'pending'
    );
  }, [state.pendingBankTransactions]);

  const pendingBankIncomesCount = useMemo(() => {
    return pendingBankIncomes.length;
  }, [pendingBankIncomes]);

  const pendingBankIncomesTotal = useMemo(() => {
    return pendingBankIncomes.reduce((acc, t) => acc + t.amount, 0);
  }, [pendingBankIncomes]);

  // Total additional incomes currently active and included into 30-days budget
  const totalIncludedAdditionalIncomes = useMemo(() => {
    return (state.incomes || [])
      .filter(i => i.isIncludedInBudget)
      .reduce((acc, i) => acc + i.amount, 0);
  }, [state.incomes]);

  // List of incomes
  const incomes = useMemo(() => {
    return state.incomes || [];
  }, [state.incomes]);

  // ==========================================
  // ADVANCE & CORRECTION FORMULA ENGINE
  // ==========================================

  // 1. Is advance date reached for the current period?
  // Evaluates according to the current period's advance payout date (e.g. 20.08.2026 for period 05.08 - 03.09)
  const isAdvanceDateReached = useMemo(() => {
    try {
      if (state.isAdvanceReceived === true) return true;

      const todayStr = state.todayDate || getTodayDateString();

      // Current period's advance date from template (e.g. 2026-08-20)
      const currentPeriodAdvDate = currentPeriodTemplate?.advanceDateStr;
      if (currentPeriodAdvDate) {
        return todayStr >= currentPeriodAdvDate;
      }

      // If template not available, derive from period start date (e.g. 2026-08-05 -> 2026-08-20)
      if (state.periodStartDate) {
        const parts = state.periodStartDate.split('-');
        if (parts.length >= 2) {
          const y = parts[0];
          const m = parts[1];
          const advDay = state.advanceDateDay || 20;
          const calcAdvDate = `${y}-${m.padStart(2, '0')}-${String(advDay).padStart(2, '0')}`;
          return todayStr >= calcAdvDate;
        }
      }

      const advDate = state.advancePaymentDate || '2026-08-20';
      return todayStr >= advDate;
    } catch {
      return true;
    }
  }, [
    state.isAdvanceReceived, 
    state.todayDate, 
    currentPeriodTemplate?.advanceDateStr, 
    state.periodStartDate, 
    state.advanceDateDay, 
    state.advancePaymentDate
  ]);

  // 2. Unreached planned expenses (Недостигнутые запланированные расходы)
  // For items already marked as paid (isPaid === true), unreached is 0.
  // For progress-tracked items (e.g. "Бенз"): plan 18 000 ₽, spent 12 000 ₽ -> remaining 6 000 ₽
  // If user fulfilled all plans (or marked them paid), unreached sum = 0.
  const unreachedPlannedExpenses = useMemo(() => {
    return (state.plannedItems || []).reduce((sum, item) => {
      // Exclude existing 'Корректировка' item from unreached sum
      if (item.title.toLowerCase().includes('корректировка')) {
        return sum;
      }
      if (item.isPaid) {
        return sum;
      }
      if (item.isProgressTracked || item.title.toLowerCase().includes('бенз')) {
        const spent = item.spentAmount ?? 0;
        const remaining = Math.max(0, item.amount - spent);
        return sum + remaining;
      } else {
        return sum + item.amount;
      }
    }, 0);
  }, [state.plannedItems]);

  // Exact correction calculation according to user's updated formula:
  // a) До аванса: Корректировка = Чистый текущий остаток - (текущий баланс по карте + предполагаемый аванс - планируемые нереализованные расходы)
  // b) После аванса: Корректировка = Чистый текущий остаток - (текущий баланс по карте - планируемые нереализованные расходы)
  const calculatedBudgetCorrection = useMemo(() => {
    const estimatedAdv = state.estimatedAdvanceAmount || 40000;
    if (!isAdvanceDateReached) {
      return cleanRemainderToday - (totalCheckingBankBalance + estimatedAdv - unreachedPlannedExpenses);
    } else {
      return cleanRemainderToday - (totalCheckingBankBalance - unreachedPlannedExpenses);
    }
  }, [
    isAdvanceDateReached,
    cleanRemainderToday,
    totalCheckingBankBalance,
    state.estimatedAdvanceAmount,
    unreachedPlannedExpenses
  ]);

  const isBalanceSynced = useMemo(() => {
    return Boolean(state.isBalanceSynced) || Math.abs(calculatedBudgetCorrection) < 1;
  }, [state.isBalanceSynced, calculatedBudgetCorrection]);

  // ==========================================
  // SALARY SCHEDULE & PERIOD ROLLOVER ENGINE
  // ==========================================

  // 3. Active viewing period (can be switched by user via dropdown in any widget)
  const activeViewingPeriod = useMemo(() => {
    return rollingPeriods.find(p => p.id === selectedPeriodId) || currentPeriodTemplate;
  }, [rollingPeriods, selectedPeriodId, currentPeriodTemplate]);

  const setPeriodByTemplate = (periodId: string) => {
    setSelectedPeriodId(periodId);
  };

  // Salary Schedule for the current active period/month
  const salarySchedule = useMemo(() => {
    try {
      const parts = (state.todayDate || getTodayDateString()).split('-');
      const y = parseInt(parts[0], 10) || 2026;
      const m = parseInt(parts[1], 10) || 8;
      return getSalaryDateInfo(y, m, state.salaryDateDay || 5);
    } catch {
      return getSalaryDateInfo(2026, 8, 5);
    }
  }, [state.todayDate, state.salaryDateDay]);

  // End of period remainder calculation:
  // 1. Daily unspent discretionary remainder (cleanRemainderToday)
  // 2. Unrealized plans savings:
  //    - e.g. "Бенз": plan 18 000 ₽, spent 12 000 ₽ -> 6 000 ₽ unspent savings
  //    - other unpaid planned items -> unspent savings
  // 3. Total remainder = dailyBudgetRemaining + unrealizedPlansSavings
  const periodEndingRemainderInfo = useMemo(() => {
    const dailyBudgetRemaining = Math.max(0, cleanRemainderToday);

    const unrealizedPlansBreakdown: UnrealizedPlanSaving[] = [];
    let totalSaved = 0;

    (state.plannedItems || []).forEach(item => {
      if (item.title.toLowerCase().includes('корректировка')) return;

      if (item.isProgressTracked || item.title.toLowerCase().includes('бенз')) {
        const spent = item.spentAmount ?? 0;
        const saved = Math.max(0, item.amount - spent);
        if (saved > 0) {
          totalSaved += saved;
          unrealizedPlansBreakdown.push({
            id: item.id,
            title: item.title,
            category: item.category,
            plannedAmount: item.amount,
            spentAmount: spent,
            savedAmount: saved,
          });
        }
      } else if (!item.isPaid) {
        totalSaved += item.amount;
        unrealizedPlansBreakdown.push({
          id: item.id,
          title: item.title,
          category: item.category,
          plannedAmount: item.amount,
          spentAmount: 0,
          savedAmount: item.amount,
        });
      }
    });

    const totalEndingRemainder = dailyBudgetRemaining + totalSaved;

    return {
      dailyBudgetRemaining,
      unrealizedPlansSavings: totalSaved,
      totalEndingRemainder,
      cleanRemainderOnEndingDate: dailyBudgetRemaining,
      unrealizedPlansBreakdown,
    };
  }, [cleanRemainderToday, state.plannedItems]);

  // Helper to detect fuel / car expenses for automatic progress scale updating
  const isFuelOrCarExpense = (cat: string, title: string) => {
    const t = (title || '').toLowerCase();
    const c = (cat || '').toLowerCase();
    return (
      c.includes('авто') || 
      t.includes('бенз') || 
      t.includes('азс') || 
      t.includes('заправк') || 
      t.includes('лукойл') || 
      t.includes('газпром') || 
      t.includes('роснефть') || 
      t.includes('тебойл') || 
      t.includes('татнефть') || 
      t.includes('топлив')
    );
  };

  // ==========================================
  // EXPENSES & CORE HANDLERS
  // ==========================================

  const addExpenseToDate = (date: string, expense: Omit<ExpenseItem, 'id'>) => {
    setState(prev => {
      const newDays = (prev.days || []).map(d => {
        if (d.date === date) {
          const newExp: ExpenseItem = {
            ...expense,
            id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            time: expense.time || new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
            isConfirmed: expense.isConfirmed ?? false,
          };
          const updatedExpenses = [...(d.expenses || []), newExp];
          const newSpent = updatedExpenses.reduce((acc, curr) => acc + curr.amount, 0);
          const currentLimit = baseDailyNorm > 0 ? baseDailyNorm : d.normLimit;
          return {
            ...d,
            expenses: updatedExpenses,
            spent: newSpent,
            normLimit: currentLimit,
            deviation: currentLimit - newSpent,
          };
        }
        return d;
      });

      // Auto-increment progress on matching planned items (e.g. "Бенз")
      let updatedPlanned = prev.plannedItems || [];
      if (isFuelOrCarExpense(expense.category || expense.categoryType || '', expense.title || '')) {
        updatedPlanned = updatedPlanned.map(item => {
          if (item.isProgressTracked || item.title.toLowerCase().includes('бенз')) {
            const currentSpent = item.spentAmount ?? 0;
            return {
              ...item,
              spentAmount: currentSpent + expense.amount,
            };
          }
          return item;
        });
      }

      return { ...prev, days: newDays, plannedItems: updatedPlanned };
    });
  };

  const updateExpense = (date: string, expenseId: string, updated: Partial<ExpenseItem>) => {
    setState(prev => {
      const currentLimit = baseDailyNorm > 0 ? baseDailyNorm : 1859.46;
      const newDays = (prev.days || []).map(d => {
        if (d.date === date) {
          const updatedExpenses = (d.expenses || []).map(e => 
            e.id === expenseId ? { ...e, ...updated } : e
          );
          const newSpent = updatedExpenses.reduce((acc, curr) => acc + curr.amount, 0);
          return {
            ...d,
            expenses: updatedExpenses,
            spent: newSpent,
            normLimit: currentLimit,
            deviation: currentLimit - newSpent,
          };
        }
        return d;
      });
      return { ...prev, days: newDays };
    });
  };

  const deleteExpenseFromDate = (date: string, expenseId: string) => {
    setState(prev => {
      let deletedExp: ExpenseItem | undefined;
      const currentLimit = baseDailyNorm > 0 ? baseDailyNorm : 1859.46;
      const newDays = (prev.days || []).map(d => {
        if (d.date === date) {
          deletedExp = (d.expenses || []).find(e => e.id === expenseId);
          const updatedExpenses = (d.expenses || []).filter(e => e.id !== expenseId);
          const newSpent = updatedExpenses.reduce((acc, curr) => acc + curr.amount, 0);
          return {
            ...d,
            expenses: updatedExpenses,
            spent: newSpent,
            normLimit: currentLimit,
            deviation: currentLimit - newSpent,
          };
        }
        return d;
      });

      // Auto-decrement fuel progress if deleted expense was fuel
      let updatedPlanned = prev.plannedItems || [];
      if (deletedExp && isFuelOrCarExpense(deletedExp.category || deletedExp.categoryType || '', deletedExp.title || '')) {
        updatedPlanned = updatedPlanned.map(item => {
          if (item.isProgressTracked || item.title.toLowerCase().includes('бенз')) {
            const currentSpent = item.spentAmount ?? 0;
            return {
              ...item,
              spentAmount: Math.max(0, currentSpent - (deletedExp?.amount || 0)),
            };
          }
          return item;
        });
      }

      return { ...prev, days: newDays, plannedItems: updatedPlanned };
    });
  };

  const toggleExpenseConfirmed = (date: string, expenseId: string) => {
    setState(prev => {
      const newDays = (prev.days || []).map(d => {
        if (d.date === date) {
          const updatedExpenses = (d.expenses || []).map(e =>
            e.id === expenseId ? { ...e, isConfirmed: !e.isConfirmed } : e
          );
          return { ...d, expenses: updatedExpenses };
        }
        return d;
      });
      return { ...prev, days: newDays };
    });
  };

  const confirmAllExpensesForDate = (date: string) => {
    setState(prev => {
      const newDays = (prev.days || []).map(d => {
        if (d.date === date) {
          const updatedExpenses = (d.expenses || []).map(e => ({ ...e, isConfirmed: true }));
          return { ...d, expenses: updatedExpenses };
        }
        return d;
      });
      return { ...prev, days: newDays };
    });
  };

  const togglePlannedItemPaid = (id: string) => {
    setState(prev => ({
      ...prev,
      plannedItems: (prev.plannedItems || []).map(item =>
        item.id === id ? { ...item, isPaid: !item.isPaid } : item
      ),
    }));
  };

  const addPlannedItem = (item: Omit<PlannedItem, 'id'>) => {
    const newItem: PlannedItem = {
      ...item,
      id: `p-${Date.now()}`,
    };
    setState(prev => ({
      ...prev,
      plannedItems: [newItem, ...(prev.plannedItems || [])],
    }));
  };

  const updatePlannedItem = (id: string, updated: Partial<PlannedItem>) => {
    setState(prev => ({
      ...prev,
      plannedItems: (prev.plannedItems || []).map(item =>
        item.id === id ? { ...item, ...updated } : item
      ),
    }));
  };

  const deletePlannedItem = (id: string) => {
    setState(prev => ({
      ...prev,
      plannedItems: (prev.plannedItems || []).filter(i => i.id !== id),
    }));
  };

  const updatePlannedItemProgress = (id: string, spentAmount: number) => {
    setState(prev => ({
      ...prev,
      plannedItems: (prev.plannedItems || []).map(item =>
        item.id === id ? { ...item, spentAmount: Math.max(0, spentAmount) } : item
      ),
    }));
  };

  const addSpentToPlannedItem = (id: string, amountToAdd: number) => {
    setState(prev => ({
      ...prev,
      plannedItems: (prev.plannedItems || []).map(item => {
        if (item.id === id) {
          const current = item.spentAmount ?? 0;
          return { ...item, spentAmount: Math.max(0, current + amountToAdd) };
        }
        return item;
      }),
    }));
  };

  const updateAdvanceSettings = (estimatedAmount: number, advanceDateDay: number) => {
    setState(prev => {
      const startParts = (prev.periodStartDate || '2026-08-05').split('-');
      const year = startParts[0] || '2026';
      const month = startParts[1] || '08';
      const formattedDay = advanceDateDay.toString().padStart(2, '0');
      const newAdvanceDate = `${year}-${month}-${formattedDay}`;

      return {
        ...prev,
        estimatedAdvanceAmount: estimatedAmount,
        advanceDateDay,
        advancePaymentDate: newAdvanceDate,
      };
    });
  };

  // User's exact correction application and balance sync
  const applyBalanceSync = () => {
    const correctionVal = calculatedBudgetCorrection;
    
    setState(prev => {
      const existingIndex = (prev.plannedItems || []).findIndex(
        i => i.title.toLowerCase() === 'корректировка' || i.title.toLowerCase().includes('корректировка бюджета')
      );

      let updatedPlanned = [...(prev.plannedItems || [])];
      const noteText = isAdvanceDateReached
        ? `Корректировка после аванса (баланс карт: ${formatRubles(totalCheckingBankBalance)}, нереализованные планы: ${formatRubles(unreachedPlannedExpenses)})`
        : `Корректировка до аванса (+${formatRubles(state.estimatedAdvanceAmount || 40000)}, баланс карт: ${formatRubles(totalCheckingBankBalance)})`;

      if (existingIndex >= 0) {
        const currentAmt = updatedPlanned[existingIndex].amount || 0;
        const newAmt = currentAmt + correctionVal;
        if (newAmt >= 0) {
          updatedPlanned[existingIndex] = {
            ...updatedPlanned[existingIndex],
            amount: Math.round(newAmt * 100) / 100,
            isPaid: true,
            notes: noteText,
          };
          return {
            ...prev,
            isBalanceSynced: true,
            plannedItems: updatedPlanned,
          };
        } else {
          updatedPlanned[existingIndex] = {
            ...updatedPlanned[existingIndex],
            amount: 0,
            isPaid: true,
            notes: noteText,
          };
          const extraDiff = Math.abs(newAmt);
          return {
            ...prev,
            previousMonthRemainder: Math.round(((prev.previousMonthRemainder || 0) + extraDiff) * 100) / 100,
            total30DaysBudget: Math.round(((prev.total30DaysBudget || 0) + extraDiff) * 100) / 100,
            isBalanceSynced: true,
            plannedItems: updatedPlanned,
          };
        }
      } else {
        if (correctionVal >= 0) {
          updatedPlanned.push({
            id: `p-corr-${Date.now()}`,
            title: 'Корректировка',
            amount: Math.round(correctionVal * 100) / 100,
            category: 'прочее',
            isPaid: true,
            notes: noteText,
            period: 'current',
          });
          return {
            ...prev,
            isBalanceSynced: true,
            plannedItems: updatedPlanned,
          };
        } else {
          const extraDiff = Math.abs(correctionVal);
          return {
            ...prev,
            previousMonthRemainder: Math.round(((prev.previousMonthRemainder || 0) + extraDiff) * 100) / 100,
            total30DaysBudget: Math.round(((prev.total30DaysBudget || 0) + extraDiff) * 100) / 100,
            isBalanceSynced: true,
            plannedItems: updatedPlanned,
          };
        }
      }
    });

    return {
      success: true,
      message: 'Баланс синхронизирован, чистый остаток скорректирован!',
      amount: correctionVal,
    };
  };

  const applyBudgetCorrection = (target: 'planned' | 'today' = 'planned') => {
    return applyBalanceSync();
  };

  // Move a planned expense back to wishlist
  const movePlannedToWishlist = (id: string) => {
    setState(prev => {
      const itemToMove = (prev.plannedItems || []).find(p => p.id === id);
      if (!itemToMove) return prev;

      const newWishlistItem: WishlistItem = {
        id: `w-${Date.now()}`,
        title: itemToMove.title,
        price: itemToMove.amount,
        url: '',
        marketplace: 'other',
        isPurchased: false,
        priority: 'medium',
        notes: itemToMove.notes || 'Перенесено из раздела планов',
      };

      return {
        ...prev,
        plannedItems: (prev.plannedItems || []).filter(p => p.id !== id),
        wishlist: [newWishlistItem, ...(prev.wishlist || [])],
      };
    });
  };

  // Move wishlist item into active budget planning
  const moveWishlistToPlanned = (id: string, period: string = 'current') => {
    setState(prev => {
      const wishItem = (prev.wishlist || []).find(w => w.id === id);
      if (!wishItem) return prev;

      const newPlanned: PlannedItem = {
        id: `p-${Date.now()}`,
        title: wishItem.title,
        amount: wishItem.price,
        category: 'покупки',
        isPaid: false,
        notes: wishItem.notes || `Из вишлиста (${wishItem.marketplace.toUpperCase()})`,
        period,
      };

      return {
        ...prev,
        wishlist: (prev.wishlist || []).filter(w => w.id !== id),
        plannedItems: [newPlanned, ...(prev.plannedItems || [])],
      };
    });
  };

  const toggleWishlistPurchased = (id: string) => {
    setState(prev => ({
      ...prev,
      wishlist: (prev.wishlist || []).map(item =>
        item.id === id ? { ...item, isPurchased: !item.isPurchased } : item
      ),
    }));
  };

  const addWishlistItem = (item: Omit<WishlistItem, 'id'>) => {
    const newItem: WishlistItem = {
      ...item,
      id: `w-${Date.now()}`,
    };
    setState(prev => ({
      ...prev,
      wishlist: [newItem, ...(prev.wishlist || [])],
    }));
  };

  const updateWishlistItem = (id: string, updated: Partial<WishlistItem>) => {
    setState(prev => ({
      ...prev,
      wishlist: (prev.wishlist || []).map(item =>
        item.id === id ? { ...item, ...updated } : item
      ),
    }));
  };

  const deleteWishlistItem = (id: string) => {
    setState(prev => ({
      ...prev,
      wishlist: (prev.wishlist || []).filter(i => i.id !== id),
    }));
  };

  const clearPurchasedWishlist = () => {
    setState(prev => ({
      ...prev,
      wishlist: (prev.wishlist || []).filter(i => !i.isPurchased),
    }));
  };

  const transferPlannedItemPeriod = (itemId: string, targetPeriod: string) => {
    setState(prev => ({
      ...prev,
      plannedItems: (prev.plannedItems || []).map(item =>
        item.id === itemId ? { ...item, period: targetPeriod } : item
      ),
    }));
  };

  const depositToCushion = (amount: number) => {
    setState(prev => {
      const newAccumulated = prev.cushionAccumulated + amount;
      const salary = prev.currentSalary || 82650;
      const actualDeposit = amount;
      const normMode = prev.cushionNormMode || 'percent';
      const normPercent = prev.cushionNormPercent ?? 10;
      const normFixedAmount = prev.cushionNormFixedAmount ?? 8265;

      const newSchedule = generateDynamicCushionSchedule({
        currentSalary: salary,
        isDepositMade: true,
        actualDepositAmount: actualDeposit,
        bankAccumulated: newAccumulated,
        startMonth: 8,
        startYear: 2026,
        normMode,
        normPercent,
        normFixedAmount,
      });

      return {
        ...prev,
        cushionAccumulated: newAccumulated,
        isCushionDepositDoneThisMonth: true,
        actualCushionDepositThisMonth: actualDeposit,
        cushionSchedule: newSchedule,
      };
    });
  };

  const setCushionDepositStatus = (isDeposited: boolean, customAmount?: number) => {
    setState(prev => {
      const salary = prev.currentSalary || 82650;
      const normMode = prev.cushionNormMode || 'percent';
      const normPercent = prev.cushionNormPercent ?? 10;
      const normFixedAmount = prev.cushionNormFixedAmount ?? 8265;
      const normValue = calculateMonthlyCushionNorm(salary, normMode, normPercent, normFixedAmount);

      const depositAmount = isDeposited
        ? (customAmount !== undefined ? customAmount : (prev.actualCushionDepositThisMonth !== undefined && prev.actualCushionDepositThisMonth > 0 ? prev.actualCushionDepositThisMonth : normValue))
        : 0;

      const newSchedule = generateDynamicCushionSchedule({
        currentSalary: salary,
        isDepositMade: isDeposited,
        actualDepositAmount: isDeposited ? depositAmount : normValue,
        bankAccumulated: prev.cushionAccumulated || 8269.53,
        startMonth: 8,
        startYear: 2026,
        normMode,
        normPercent,
        normFixedAmount,
      });

      return {
        ...prev,
        isCushionDepositDoneThisMonth: isDeposited,
        actualCushionDepositThisMonth: isDeposited ? depositAmount : normValue,
        cushionSchedule: newSchedule,
      };
    });
  };

  const updateActualCushionDepositThisMonth = (amount: number) => {
    setState(prev => {
      const cleanAmount = Math.max(0, amount);
      const salary = prev.currentSalary || 82650;
      const normMode = prev.cushionNormMode || 'percent';
      const normPercent = prev.cushionNormPercent ?? 10;
      const normFixedAmount = prev.cushionNormFixedAmount ?? 8265;
      const isDepositMade = prev.isCushionDepositDoneThisMonth ?? true;

      const newSchedule = generateDynamicCushionSchedule({
        currentSalary: salary,
        isDepositMade,
        actualDepositAmount: cleanAmount,
        bankAccumulated: prev.cushionAccumulated || 8269.53,
        startMonth: 8,
        startYear: 2026,
        normMode,
        normPercent,
        normFixedAmount,
      });

      return {
        ...prev,
        actualCushionDepositThisMonth: cleanAmount,
        cushionSchedule: newSchedule,
      };
    });
  };

  const updateCushionNorm = (mode: 'percent' | 'fixed', percent?: number, fixedAmount?: number) => {
    setState(prev => {
      const salary = prev.currentSalary || 82650;
      const newPercent = percent !== undefined ? percent : (prev.cushionNormPercent ?? 10);
      const newFixed = fixedAmount !== undefined ? fixedAmount : (prev.cushionNormFixedAmount ?? 8265);
      const newMonthlyNorm = calculateMonthlyCushionNorm(salary, mode, newPercent, newFixed);

      const isDepositMade = prev.isCushionDepositDoneThisMonth ?? true;
      const actualDeposit = prev.actualCushionDepositThisMonth ?? newMonthlyNorm;

      const newSchedule = generateDynamicCushionSchedule({
        currentSalary: salary,
        isDepositMade,
        actualDepositAmount: actualDeposit,
        bankAccumulated: prev.cushionAccumulated || 8269.53,
        startMonth: 8,
        startYear: 2026,
        normMode: mode,
        normPercent: newPercent,
        normFixedAmount: newFixed,
      });

      return {
        ...prev,
        cushionNormMode: mode,
        cushionNormPercent: newPercent,
        cushionNormFixedAmount: newFixed,
        safetyCushionDeposit: newMonthlyNorm,
        cushionMonthlyContribution: newMonthlyNorm,
        cushionSchedule: newSchedule,
      };
    });
  };

  const updateCurrentSalary = (newSalary: number) => {
    setState(prev => {
      const isDepositMade = prev.isCushionDepositDoneThisMonth ?? true;
      const normMode = prev.cushionNormMode || 'percent';
      const normPercent = prev.cushionNormPercent ?? 10;
      const normFixedAmount = prev.cushionNormFixedAmount ?? 8265;
      const newCushionNorm = calculateMonthlyCushionNorm(newSalary, normMode, normPercent, normFixedAmount);
      const actualDeposit = prev.actualCushionDepositThisMonth ?? newCushionNorm;
      const bankAccumulated = prev.cushionAccumulated ?? 8269.53;

      const newSchedule = generateDynamicCushionSchedule({
        currentSalary: newSalary,
        isDepositMade,
        actualDepositAmount: actualDeposit,
        bankAccumulated,
        startMonth: 8,
        startYear: 2026,
        normMode,
        normPercent,
        normFixedAmount,
      });

      return {
        ...prev,
        currentSalary: newSalary,
        safetyCushionDeposit: newCushionNorm,
        cushionMonthlyContribution: newCushionNorm,
        cushionSchedule: newSchedule,
      };
    });
  };

  const withdrawFromCushion = (amount: number, reason?: string) => {
    setState(prev => {
      const newAccumulated = Math.max(0, prev.cushionAccumulated - amount);
      const isDepositMade = prev.isCushionDepositDoneThisMonth ?? true;
      const actualDeposit = prev.actualCushionDepositThisMonth ?? 8265;
      const normMode = prev.cushionNormMode || 'percent';
      const normPercent = prev.cushionNormPercent ?? 10;
      const normFixedAmount = prev.cushionNormFixedAmount ?? 8265;

      const newSchedule = generateDynamicCushionSchedule({
        currentSalary: prev.currentSalary || 82650,
        isDepositMade,
        actualDepositAmount: actualDeposit,
        bankAccumulated: newAccumulated,
        startMonth: 8,
        startYear: 2026,
        normMode,
        normPercent,
        normFixedAmount,
      });

      return {
        ...prev,
        cushionAccumulated: newAccumulated,
        cushionSchedule: newSchedule,
      };
    });
  };

  const updateCushionAccumulated = (amount: number) => {
    setState(prev => {
      const newAccumulated = Math.max(0, amount);
      const isDepositMade = prev.isCushionDepositDoneThisMonth ?? true;
      const actualDeposit = prev.actualCushionDepositThisMonth ?? 8265;
      const normMode = prev.cushionNormMode || 'percent';
      const normPercent = prev.cushionNormPercent ?? 10;
      const normFixedAmount = prev.cushionNormFixedAmount ?? 8265;

      const newSchedule = generateDynamicCushionSchedule({
        currentSalary: prev.currentSalary || 82650,
        isDepositMade,
        actualDepositAmount: actualDeposit,
        bankAccumulated: newAccumulated,
        startMonth: 8,
        startYear: 2026,
        normMode,
        normPercent,
        normFixedAmount,
      });

      return {
        ...prev,
        cushionAccumulated: newAccumulated,
        cushionSchedule: newSchedule,
      };
    });
  };

  const updateCashSavings = (amount: number) => {
    setState(prev => ({
      ...prev,
      cushionCash: Math.max(0, amount),
    }));
  };

  const updateCushionMonthlyContribution = (amount: number) => {
    setState(prev => {
      const newDeposit = Math.max(0, amount);
      const isDepositMade = prev.isCushionDepositDoneThisMonth ?? true;
      const normMode = prev.cushionNormMode || 'percent';
      const normPercent = prev.cushionNormPercent ?? 10;
      const normFixedAmount = prev.cushionNormFixedAmount ?? 8265;

      const newSchedule = generateDynamicCushionSchedule({
        currentSalary: prev.currentSalary || 82650,
        isDepositMade,
        actualDepositAmount: newDeposit,
        bankAccumulated: prev.cushionAccumulated || 8269.53,
        startMonth: 8,
        startYear: 2026,
        normMode,
        normPercent,
        normFixedAmount,
      });

      return {
        ...prev,
        cushionMonthlyContribution: newDeposit,
        safetyCushionDeposit: newDeposit,
        actualCushionDepositThisMonth: newDeposit,
        cushionSchedule: newSchedule,
      };
    });
  };

  // Mandatory Expenses handlers
  const updateMandatoryExpense = (id: string, updated: Partial<MandatoryExpense>) => {
    setState(prev => {
      const updatedList = (prev.mandatoryExpenses || []).map(m =>
        m.id === id ? { ...m, ...updated } : m
      );
      const newTarget = updatedList.reduce((sum, item) => sum + item.amount, 0) * 3;

      return {
        ...prev,
        mandatoryExpenses: updatedList,
        cushionTargetAmount: newTarget,
      };
    });
  };

  const addMandatoryExpense = (expense: Omit<MandatoryExpense, 'id'>) => {
    const newM: MandatoryExpense = {
      ...expense,
      id: `m-${Date.now()}`,
    };
    setState(prev => {
      const updatedList = [...(prev.mandatoryExpenses || []), newM];
      const newTarget = updatedList.reduce((sum, item) => sum + item.amount, 0) * 3;

      return {
        ...prev,
        mandatoryExpenses: updatedList,
        cushionTargetAmount: newTarget,
      };
    });
  };

  const deleteMandatoryExpense = (id: string) => {
    setState(prev => {
      const updatedList = (prev.mandatoryExpenses || []).filter(m => m.id !== id);
      const newTarget = updatedList.reduce((sum, item) => sum + item.amount, 0) * 3;

      return {
        ...prev,
        mandatoryExpenses: updatedList,
        cushionTargetAmount: newTarget,
      };
    });
  };

  const setMandatoryExpensesMode = (mode: 'manual' | 'auto') => {
    setState(prev => ({
      ...prev,
      mandatoryExpensesMode: mode,
    }));
  };

  const updateBudgetSettings = (budget: number, rollover: number, cushionDeposit: number, salary: number) => {
    setState(prev => {
      const isDepositMade = prev.isCushionDepositDoneThisMonth ?? true;
      const actualDeposit = prev.actualCushionDepositThisMonth ?? cushionDeposit;
      const bankAccumulated = prev.cushionAccumulated ?? 8269.53;
      const normMode = prev.cushionNormMode || 'percent';
      const normPercent = prev.cushionNormPercent ?? 10;
      const normFixedAmount = prev.cushionNormFixedAmount ?? 8265;

      const newSchedule = generateDynamicCushionSchedule({
        currentSalary: salary,
        isDepositMade,
        actualDepositAmount: actualDeposit,
        bankAccumulated,
        startMonth: 8,
        startYear: 2026,
        normMode,
        normPercent,
        normFixedAmount,
      });

      return {
        ...prev,
        total30DaysBudget: budget,
        previousMonthRemainder: rollover,
        safetyCushionDeposit: cushionDeposit,
        cushionMonthlyContribution: cushionDeposit,
        currentSalary: salary,
        cushionSchedule: newSchedule,
      };
    });
  };

  // Ensure all days of a given month (1..31) are populated in state.days
  const ensureDaysForMonth = (year: number, month: number) => {
    setState(prev => {
      const existingDates = new Set((prev.days || []).map(d => d.date));
      const daysInMonth = new Date(year, month, 0).getDate();
      const formattedMonth = month.toString().padStart(2, '0');
      const missingDays: any[] = [];
      const DAY_SHORT_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
      const DAY_NAMES_RU = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

      for (let day = 1; day <= daysInMonth; day++) {
        const formattedDay = day.toString().padStart(2, '0');
        const dateStr = `${year}-${formattedMonth}-${formattedDay}`;
        if (!existingDates.has(dateStr)) {
          const d = new Date(year, month - 1, day);
          const dayOfWeekIdx = d.getDay();

          missingDays.push({
            date: dateStr,
            dayNumber: day,
            dayOfWeekShort: DAY_SHORT_RU[dayOfWeekIdx],
            dayOfWeekFull: DAY_NAMES_RU[dayOfWeekIdx],
            expenses: [],
            spent: 0,
            normLimit: 1859.46,
            deviation: 1859.46,
            budgetRemainingOnDate: 0,
            totalRemaining: 0,
            isToday: dateStr === prev.todayDate,
            isPast: dateStr < prev.todayDate,
          });
        }
      }

      if (missingDays.length === 0) return prev;

      const combined = [...(prev.days || []), ...missingDays].sort((a, b) => a.date.localeCompare(b.date));
      return {
        ...prev,
        days: combined,
      };
    });
  };

  // Start new budget period on salary day, rolling over clean remainder from last day of previous period
  const startNewPeriod = (options?: { newSalary?: number; targetDate?: string; customRollover?: number }) => {
    const currentEndingInfo = periodEndingRemainderInfo;
    let cleanRollover = currentEndingInfo.dailyBudgetRemaining;
    if (cleanRollover === undefined || isNaN(cleanRollover) || cleanRollover <= 0) {
      cleanRollover = calculateCleanRemainderFromPreviousPeriod(
        state.days || [], 
        state.periodStartDate, 
        state.periodEndDate, 
        11803.76
      );
    }
    const rolloverAmount = options?.customRollover !== undefined 
      ? options.customRollover 
      : cleanRollover;

    let targetStartDate = options?.targetDate;
    if (!targetStartDate) {
      const currentStartParts = (state.periodStartDate || '2026-08-05').split('-');
      let currentStartYear = parseInt(currentStartParts[0], 10) || 2026;
      let currentStartMonth = parseInt(currentStartParts[1], 10) || 8;
      let nextMonth = currentStartMonth + 1;
      let nextYear = currentStartYear;
      if (nextMonth > 12) {
        nextMonth = 1;
        nextYear += 1;
      }
      const nextTemplate = generatePeriodTemplateForMonth(
        nextYear,
        nextMonth,
        state.salaryDateDay || 5,
        state.advanceDateDay || 20
      );
      targetStartDate = nextTemplate.startDateStr;
    }

    setState(prev => {
      const modifiedPrev = {
        ...prev,
        currentSalary: options?.newSalary ?? prev.currentSalary,
      };
      return migrateStateToNewPeriod(modifiedPrev, targetStartDate, rolloverAmount);
    });

    setSelectedDate(targetStartDate);

    return {
      success: true,
      message: `Новый период успешно запущен! Перенесён чистый остаток: ${formatRubles(rolloverAmount)}. Ожидается поступление заработной платы.`,
      rolloverAmount,
    };
  };

  // Receive salary: updates total budget, credits safety cushion, and records income
  const receiveSalary = (amount?: number) => {
    setState(prev => {
      const actualSalary = amount ?? prev.currentSalary ?? 82650;
      const cushionPct = (prev.cushionNormPercent || 10) / 100;
      const cushionDeduction = Math.round(actualSalary * cushionPct);
      const updatedTotalBudget = Math.round(((prev.previousMonthRemainder || 0) + actualSalary - cushionDeduction) * 100) / 100;

      const salaryIncome: IncomeItem = {
        id: `inc-salary-${Date.now()}`,
        title: 'Зачисление зарплаты',
        amount: actualSalary,
        date: prev.todayDate,
        time: '10:00',
        sourceType: 'salary',
        sourceName: 'Зарплатный счет (ООО «Технологии»)',
        category: 'Зарплата',
        isIncludedInBudget: true,
        isManual: false,
        createdAt: new Date().toISOString(),
      };

      const newAccumulated = (prev.cushionAccumulated || 0) + cushionDeduction;

      const updatedCushionSchedule = (prev.cushionSchedule || []).map((row, idx) => {
        if (idx === 0) {
          return {
            ...row,
            isDepositMade: true,
            monthlyDeposit: cushionDeduction,
            actualDepositAmount: cushionDeduction,
            deviation: 0,
            accumulatedTotal: newAccumulated,
          };
        }
        return row;
      });

      return {
        ...prev,
        isSalaryReceived: true,
        actualSalaryAmount: actualSalary,
        salaryReceivedDate: prev.todayDate,
        total30DaysBudget: updatedTotalBudget,
        safetyCushionDeposit: cushionDeduction,
        cushionAccumulated: newAccumulated,
        isCushionDepositDoneThisMonth: true,
        actualCushionDepositThisMonth: cushionDeduction,
        cushionSchedule: updatedCushionSchedule,
        incomes: [salaryIncome, ...(prev.incomes || [])],
      };
    });
  };

  // Automatically transition to a new period whenever the salary day arrives
  useEffect(() => {
    if (!state.periodStartDate || !state.todayDate) return;

    try {
      const startParts = state.periodStartDate.split('-');
      const startYear = parseInt(startParts[0], 10) || 2026;
      const startMonth = parseInt(startParts[1], 10) || 8;

      let nextMonth = startMonth + 1;
      let nextYear = startYear;
      if (nextMonth > 12) {
        nextMonth = 1;
        nextYear += 1;
      }

      const nextTemplate = generatePeriodTemplateForMonth(
        nextYear,
        nextMonth,
        state.salaryDateDay || 5,
        state.advanceDateDay || 20
      );
      const nextSalaryDateStr = nextTemplate.startDateStr;

      // When today date arrives on or after the scheduled salary date, automatically roll over
      if (state.todayDate >= nextSalaryDateStr && state.periodStartDate < nextSalaryDateStr) {
        startNewPeriod({ targetDate: nextSalaryDateStr });
      }
    } catch (e) {
      console.error('Error checking automatic salary rollover:', e);
    }
  }, [state.todayDate, state.periodStartDate, state.salaryDateDay]);

  // ==========================================
  // BANKING ACTIONS & SYNCHRONIZATION
  // ==========================================

  // 1. Approve bank transaction -> feeds into today's (or target date) expenses
  const approveBankTransaction = (transactionId: string) => {
    setState(prev => {
      const tx = (prev.pendingBankTransactions || []).find(t => t.id === transactionId);
      if (!tx) return prev;

      // If this transaction is an incoming salary, handle as salary receipt
      if (
        tx.type === 'income' &&
        (tx.categoryName === 'Зарплата' || (tx.categoryType as string) === 'зарплата' || tx.title.toLowerCase().includes('зарплат'))
      ) {
        setTimeout(() => {
          receiveSalary(tx.amount);
        }, 10);

        return {
          ...prev,
          pendingBankTransactions: (prev.pendingBankTransactions || []).filter(t => t.id !== transactionId),
        };
      }

      const targetDate = tx.date || prev.todayDate;
      const targetDay = (prev.days || []).find(d => d.date === targetDate) || (prev.days || []).find(d => d.date === prev.todayDate);
      if (!targetDay) return prev;

      const newExpense: ExpenseItem = {
        id: `exp-bank-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        title: tx.title,
        amount: tx.amount,
        category: tx.categoryName,
        categoryType: tx.categoryType,
        time: tx.time,
        isConfirmed: true, // Approved directly
        bankSource: `${tx.bankName} ${tx.accountNumberMask}`,
      };

      const newDays = (prev.days || []).map(d => {
        if (d.date === targetDay.date) {
          const updatedExpenses = [...d.expenses, newExpense];
          const newSpent = updatedExpenses.reduce((acc, curr) => acc + curr.amount, 0);
          return {
            ...d,
            expenses: updatedExpenses,
            spent: newSpent,
            deviation: d.normLimit - newSpent,
          };
        }
        return d;
      });

      const updatedPending = (prev.pendingBankTransactions || []).filter(t => t.id !== transactionId);

      return {
        ...prev,
        days: newDays,
        pendingBankTransactions: updatedPending,
      };
    });
  };

  // 2. Reject / dismiss bank transaction
  const rejectBankTransaction = (transactionId: string) => {
    setState(prev => ({
      ...prev,
      pendingBankTransactions: (prev.pendingBankTransactions || []).filter(t => t.id !== transactionId),
    }));
  };

  // 2b. Confirm bank transaction as Planned Expense (does NOT deduct from 'Сегодня', updates PlannedItem)
  const confirmPlannedBankTransaction = (transactionId: string, plannedItemId: string): { success: boolean; message: string } => {
    let resultMessage = 'Операция успешно учтена в планах';
    setState(prev => {
      const tx = (prev.pendingBankTransactions || []).find(t => t.id === transactionId);
      if (!tx) return prev;

      const plannedItem = (prev.plannedItems || []).find(p => p.id === plannedItemId);
      if (!plannedItem) return prev;

      const currentSpent = plannedItem.spentAmount || (plannedItem.isPaid ? plannedItem.amount : 0);
      const newSpent = currentSpent + tx.amount;
      const planAmount = plannedItem.amount;

      let isPaid = false;
      let isProgressTracked = true;

      if (Math.abs(newSpent - planAmount) < 0.01) {
        // Правило 1: если фактическая сумма совпала с плановой - учитываем план как достигнутый, ставим галочку
        isPaid = true;
        isProgressTracked = false;
        resultMessage = `Сумма ${formatRubles(tx.amount)} совпала с планом «${plannedItem.title}». Статья выполнена и отмечена как оплаченная ✓`;
      } else if (newSpent < planAmount) {
        // Правило 2: если факт < план, внутри плановой статьи создаём шкалу и учитываем фактическую сумму
        isPaid = false;
        isProgressTracked = true;
        resultMessage = `Сумма ${formatRubles(tx.amount)} добавлена в шкалу расхода «${plannedItem.title}». Накоплено ${formatRubles(newSpent)} из ${formatRubles(planAmount)}.`;
      } else {
        // Правило 3: если факт > план, создаём шкалу, учитываем факт, но сумму плана не меняем, фиксируем перерасход
        isPaid = false;
        isProgressTracked = true;
        resultMessage = `Сумма ${formatRubles(tx.amount)} добавлена в шкалу «${plannedItem.title}». Зафиксирован перерасход: ${formatRubles(newSpent)} при плане ${formatRubles(planAmount)}.`;
      }

      const updatedPlannedItems = (prev.plannedItems || []).map(p => {
        if (p.id !== plannedItemId) return p;
        return {
          ...p,
          spentAmount: newSpent,
          isPaid,
          isProgressTracked,
        };
      });

      return {
        ...prev,
        plannedItems: updatedPlannedItems,
        pendingBankTransactions: (prev.pendingBankTransactions || []).filter(t => t.id !== transactionId),
      };
    });

    return { success: true, message: resultMessage };
  };

  // ==========================================
  // MARKETPLACE SYNC ACTIONS (WB & OZON)
  // ==========================================

  const connectMarketplace = (marketplace: 'wildberries' | 'ozon') => {
    setState(prev => {
      const currentSync = prev.marketplaceSync || {
        isWildberriesConnected: false,
        isOzonConnected: false,
        lastSyncedAt: new Date().toISOString(),
        orders: [],
      };

      const isWb = marketplace === 'wildberries';
      const targetTitle = isWb ? 'Wildberries' : 'OZON';

      // Проверяем, есть ли уже статья в планах
      const existingPlan = (prev.plannedItems || []).find(
        p => p.title.toLowerCase() === targetTitle.toLowerCase()
      );

      let updatedPlannedItems = [...(prev.plannedItems || [])];

      if (!existingPlan) {
        // Создаем статью маркетплейса с отслеживанием прогресса
        const activeOrders = currentSync.orders.filter(
          o => o.marketplace === marketplace && o.status !== 'cancelled'
        );
        const planSum = activeOrders.reduce((sum, o) => sum + o.price, 0) || (isWb ? 6139 : 2500);
        const deliveredSum = activeOrders
          .filter(o => o.status === 'delivered')
          .reduce((sum, o) => sum + o.price, 0);

        updatedPlannedItems.push({
          id: `p-${marketplace}-${Date.now()}`,
          title: targetTitle,
          amount: planSum,
          spentAmount: deliveredSum,
          isProgressTracked: true,
          category: 'покупки',
          isPaid: deliveredSum > 0 && Math.abs(deliveredSum - planSum) < 0.01,
          autoRenew: true,
          notes: `Автосинхронизация заказов с ${targetTitle}`,
        });
      }

      return {
        ...prev,
        marketplaceSync: {
          ...currentSync,
          isWildberriesConnected: isWb ? true : currentSync.isWildberriesConnected,
          isOzonConnected: !isWb ? true : currentSync.isOzonConnected,
          lastSyncedAt: new Date().toISOString(),
        },
        plannedItems: updatedPlannedItems,
      };
    });
  };

  const disconnectMarketplace = (marketplace: 'wildberries' | 'ozon') => {
    setState(prev => {
      if (!prev.marketplaceSync) return prev;
      return {
        ...prev,
        marketplaceSync: {
          ...prev.marketplaceSync,
          isWildberriesConnected: marketplace === 'wildberries' ? false : prev.marketplaceSync.isWildberriesConnected,
          isOzonConnected: marketplace === 'ozon' ? false : prev.marketplaceSync.isOzonConnected,
        }
      };
    });
  };

  const syncMarketplaceOrders = () => {
    setState(prev => {
      if (!prev.marketplaceSync) return prev;
      return {
        ...prev,
        marketplaceSync: {
          ...prev.marketplaceSync,
          lastSyncedAt: new Date().toISOString(),
        }
      };
    });
  };

  // Отмена / отказ от товара на маркетплейсе
  const cancelMarketplaceOrder = (orderId: string) => {
    setState(prev => {
      if (!prev.marketplaceSync) return prev;
      const order = prev.marketplaceSync.orders.find(o => o.id === orderId);
      if (!order || order.status === 'cancelled') return prev;

      const targetTitle = order.marketplace === 'wildberries' ? 'Wildberries' : 'OZON';

      // Обновляем статус заказа
      const updatedOrders = prev.marketplaceSync.orders.map(o => 
        o.id === orderId ? { ...o, status: 'cancelled' as const } : o
      );

      // Плановая сумма маркетплейса уменьшается на цену товара
      const updatedPlannedItems = (prev.plannedItems || []).map(p => {
        if (p.title.toLowerCase() !== targetTitle.toLowerCase()) return p;
        const newPlan = Math.max(0, p.amount - order.price);
        const spent = p.spentAmount || 0;
        const isPaid = newPlan > 0 && Math.abs(spent - newPlan) < 0.01;
        return {
          ...p,
          amount: newPlan,
          isPaid,
          isProgressTracked: !isPaid,
        };
      });

      return {
        ...prev,
        plannedItems: updatedPlannedItems,
        marketplaceSync: {
          ...prev.marketplaceSync,
          orders: updatedOrders,
        }
      };
    });
  };

  // Покупка состоялась (товар получен / выкуплен)
  const receiveMarketplaceOrder = (orderId: string) => {
    setState(prev => {
      if (!prev.marketplaceSync) return prev;
      const order = prev.marketplaceSync.orders.find(o => o.id === orderId);
      if (!order || order.status === 'delivered') return prev;

      const targetTitle = order.marketplace === 'wildberries' ? 'Wildberries' : 'OZON';

      const updatedOrders = prev.marketplaceSync.orders.map(o => 
        o.id === orderId ? { ...o, status: 'delivered' as const } : o
      );

      // Шкала факта увеличивается на эту сумму
      const updatedPlannedItems = (prev.plannedItems || []).map(p => {
        if (p.title.toLowerCase() !== targetTitle.toLowerCase()) return p;
        const currentSpent = p.spentAmount || 0;
        const newSpent = currentSpent + order.price;
        const plan = p.amount;
        const isPaid = Math.abs(newSpent - plan) < 0.01;
        return {
          ...p,
          spentAmount: newSpent,
          isPaid,
          isProgressTracked: !isPaid,
        };
      });

      return {
        ...prev,
        plannedItems: updatedPlannedItems,
        marketplaceSync: {
          ...prev.marketplaceSync,
          orders: updatedOrders,
        }
      };
    });
  };

  // Пополнение WB / OZON кошелька
  const recordMarketplaceWalletTopup = (marketplace: 'wildberries' | 'ozon', amount: number) => {
    setState(prev => {
      const targetTitle = marketplace === 'wildberries' ? 'Wildberries' : 'OZON';
      const existingPlan = (prev.plannedItems || []).find(
        p => p.title.toLowerCase() === targetTitle.toLowerCase()
      );

      let updatedPlannedItems = [...(prev.plannedItems || [])];

      if (existingPlan) {
        updatedPlannedItems = updatedPlannedItems.map(p => {
          if (p.id !== existingPlan.id) return p;
          const currentSpent = p.spentAmount || 0;
          const newSpent = currentSpent + amount;
          const plan = p.amount;
          const isPaid = Math.abs(newSpent - plan) < 0.01;
          return {
            ...p,
            spentAmount: newSpent,
            isPaid,
            isProgressTracked: !isPaid,
          };
        });
      } else {
        updatedPlannedItems.push({
          id: `p-${marketplace}-${Date.now()}`,
          title: targetTitle,
          amount: amount,
          spentAmount: amount,
          isProgressTracked: false,
          isPaid: true,
          category: 'покупки',
          notes: `Пополнение кошелька ${targetTitle}`,
        });
      }

      return {
        ...prev,
        plannedItems: updatedPlannedItems,
      };
    });
  };

  // ==========================================
  // INCOMES & INFLOW ACTION HANDLERS
  // ==========================================

  // 1. Accept bank income into budget (increases total30DaysBudget and adds to incomes history)
  const acceptBankIncomeToBudget = (transactionId: string, customCategory?: string, customTitle?: string) => {
    setState(prev => {
      const tx = (prev.pendingBankTransactions || []).find(t => t.id === transactionId);
      if (!tx) return prev;

      const newIncome: IncomeItem = {
        id: `inc-bank-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        title: customTitle || tx.title,
        amount: tx.amount,
        date: tx.date || prev.todayDate,
        time: tx.time || '12:00',
        sourceType: 'bank_card',
        sourceName: `${tx.bankName} ${tx.accountNumberMask}`,
        category: customCategory || tx.categoryName || 'Поступление',
        isIncludedInBudget: true,
        isManual: false,
        bankTransactionId: tx.id,
        notes: tx.rawSnippet || 'Поступление на банковскую карту',
        createdAt: new Date().toISOString(),
      };

      const updatedIncomes = [newIncome, ...(prev.incomes || [])];
      const updatedTotalBudget = prev.total30DaysBudget + tx.amount;

      let updatedSalary = prev.currentSalary;
      const lowerTitle = (customTitle || tx.title).toLowerCase();
      if (lowerTitle.includes('зарплат') || lowerTitle.includes('аванс')) {
        updatedSalary += tx.amount;
      }

      return {
        ...prev,
        incomes: updatedIncomes,
        total30DaysBudget: updatedTotalBudget,
        currentSalary: updatedSalary,
        pendingBankTransactions: (prev.pendingBankTransactions || []).filter(t => t.id !== transactionId),
      };
    });
  };

  // 2. Reject incoming bank transaction (dismiss without adding to budget)
  const rejectBankIncome = (transactionId: string) => {
    setState(prev => ({
      ...prev,
      pendingBankTransactions: (prev.pendingBankTransactions || []).filter(t => t.id !== transactionId),
    }));
  };

  // 3. Add manual income (cash, freelance, gift, debt return, etc.)
  const addManualIncome = (incomeData: Omit<IncomeItem, 'id' | 'createdAt'>) => {
    setState(prev => {
      const newIncome: IncomeItem = {
        ...incomeData,
        id: `inc-manual-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        createdAt: new Date().toISOString(),
      };

      const updatedIncomes = [newIncome, ...(prev.incomes || [])];
      const updatedTotalBudget = incomeData.isIncludedInBudget 
        ? prev.total30DaysBudget + incomeData.amount 
        : prev.total30DaysBudget;

      return {
        ...prev,
        incomes: updatedIncomes,
        total30DaysBudget: updatedTotalBudget,
      };
    });
  };

  // 4. Toggle whether a specific income is included into 30-days budget
  const toggleIncomeBudgetInclusion = (incomeId: string) => {
    setState(prev => {
      const target = (prev.incomes || []).find(i => i.id === incomeId);
      if (!target) return prev;

      const nextInclusion = !target.isIncludedInBudget;
      const budgetDelta = nextInclusion ? target.amount : -target.amount;

      const updatedIncomes = (prev.incomes || []).map(i => {
        if (i.id === incomeId) {
          return { ...i, isIncludedInBudget: nextInclusion };
        }
        return i;
      });

      return {
        ...prev,
        incomes: updatedIncomes,
        total30DaysBudget: Math.max(0, prev.total30DaysBudget + budgetDelta),
      };
    });
  };

  // 5. Delete an income record
  const deleteIncome = (incomeId: string) => {
    setState(prev => {
      const target = (prev.incomes || []).find(i => i.id === incomeId);
      if (!target) return prev;

      const budgetDelta = target.isIncludedInBudget ? -target.amount : 0;
      const updatedIncomes = (prev.incomes || []).filter(i => i.id !== incomeId);

      return {
        ...prev,
        incomes: updatedIncomes,
        total30DaysBudget: Math.max(0, prev.total30DaysBudget + budgetDelta),
      };
    });
  };

  // 6. Edit an existing income record
  const editIncome = (incomeId: string, updated: Partial<IncomeItem>) => {
    setState(prev => {
      const target = (prev.incomes || []).find(i => i.id === incomeId);
      if (!target) return prev;

      const oldEffectiveAmount = target.isIncludedInBudget ? target.amount : 0;
      const newIsIncluded = updated.isIncludedInBudget !== undefined ? updated.isIncludedInBudget : target.isIncludedInBudget;
      const newAmount = updated.amount !== undefined ? updated.amount : target.amount;
      const newEffectiveAmount = newIsIncluded ? newAmount : 0;
      const budgetDelta = newEffectiveAmount - oldEffectiveAmount;

      const updatedIncomes = (prev.incomes || []).map(i => {
        if (i.id === incomeId) {
          return { ...i, ...updated };
        }
        return i;
      });

      return {
        ...prev,
        incomes: updatedIncomes,
        total30DaysBudget: Math.max(0, prev.total30DaysBudget + budgetDelta),
      };
    });
  };

  // Confirm incoming transaction (legacy compatibility wrapper)
  const confirmPendingIncome = (transactionId: string, isIncome: boolean) => {
    if (isIncome) {
      acceptBankIncomeToBudget(transactionId);
    } else {
      rejectBankIncome(transactionId);
    }
  };

  // 3. Approve all pending bank transactions
  const approveAllPendingBankTransactions = () => {
    setState(prev => {
      const pendingList = prev.pendingBankTransactions || [];
      if (pendingList.length === 0) return prev;

      let newDays = [...(prev.days || [])];

      pendingList.forEach(tx => {
        const targetDate = tx.date || prev.todayDate;
        newDays = newDays.map(d => {
          if (d.date === targetDate || (targetDate === prev.todayDate && d.isToday)) {
            const newExp: ExpenseItem = {
              id: `exp-bank-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              title: tx.title,
              amount: tx.amount,
              category: tx.categoryName,
              categoryType: tx.categoryType,
              time: tx.time,
              isConfirmed: true,
              bankSource: `${tx.bankName} ${tx.accountNumberMask}`,
            };
            const updatedExpenses = [...d.expenses, newExp];
            const newSpent = updatedExpenses.reduce((acc, curr) => acc + curr.amount, 0);
            return {
              ...d,
              expenses: updatedExpenses,
              spent: newSpent,
              deviation: d.normLimit - newSpent,
            };
          }
          return d;
        });
      });

      return {
        ...prev,
        days: newDays,
        pendingBankTransactions: [],
      };
    });
  };

  const rejectAllPendingBankTransactions = () => {
    setState(prev => ({
      ...prev,
      pendingBankTransactions: [],
    }));
  };

  // 4. Instant Bank Synchronization Simulation
  const syncBankAccounts = async () => {
    setIsBankSyncing(true);
    await new Promise(r => setTimeout(r, 1200));

    setState(prev => {
      const nowIso = new Date().toISOString();
      const updatedAccounts = (prev.bankAccounts || []).map(acc => ({
        ...acc,
        lastSyncedAt: nowIso,
      }));

      // Generate a realistic incoming bank transaction if queue is empty
      let updatedPending = [...(prev.pendingBankTransactions || [])];
      if (updatedPending.length === 0) {
        updatedPending.push({
          id: `tx-sync-${Date.now()}`,
          bankAccountId: 'bank-tbank-card',
          bankName: 'Т-Банк',
          accountNumberMask: '•4821',
          title: 'Surf Coffee (Флэт уайт и круассан)',
          merchant: 'Surf Coffee',
          amount: 320.00,
          type: 'expense',
          categoryType: 'еда_вне_дома',
          categoryName: 'Кофейня',
          date: prev.todayDate,
          time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
          status: 'pending',
          rawSnippet: 'Т-Банк. Покупка 320.00 ₽, Surf Coffee. Баланс 24 490.00 ₽',
        });
      }

      return {
        ...prev,
        bankAccounts: updatedAccounts,
        pendingBankTransactions: updatedPending,
        lastBankSyncTimestamp: nowIso,
      };
    });

    setIsBankSyncing(false);
  };

  // 5. Smart SMS / Push text parser for Russian banks
  const parseAndImportBankSnippet = (snippet: string) => {
    if (!snippet || snippet.trim().length === 0) {
      return { success: false, message: 'Пустой текст уведомления' };
    }

    const text = snippet.trim();
    
    // Amount extraction: e.g. 450р, 1 250.00 ₽, Покупка 320.50 RUB
    const amountMatch = text.match(/(?:покупка|оплата|списание|перевод|чек|сумма)?\s*[:\-]?\s*([0-9\s]+(?:[.,][0-9]{1,2})?)\s*(?:₽|руб|р\b|rub)/i) 
      || text.match(/([0-9]+(?:[.,][0-9]{1,2})?)\s*(?:₽|руб|р\b)/i);

    if (!amountMatch) {
      return { success: false, message: 'Не удалось определить сумму операции' };
    }

    const amountStr = amountMatch[1].replace(/\s+/g, '').replace(',', '.');
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      return { success: false, message: 'Некорректная сумма в тексте' };
    }

    // Bank detection
    let detectedBank = 'Т-Банк';
    let detectedCard = '•4821';
    let bankAccountId = 'bank-tbank-card';

    if (/сбер|sber/i.test(text)) {
      detectedBank = 'СберБанк';
      detectedCard = '•9022';
      bankAccountId = 'bank-sber-card';
    } else if (/альфа|alfa/i.test(text)) {
      detectedBank = 'Альфа-Банк';
      detectedCard = '•3312';
      bankAccountId = 'bank-alfa-savings';
    } else if (/втб|vtb/i.test(text)) {
      detectedBank = 'ВТБ';
      detectedCard = '•1084';
      bankAccountId = 'bank-vtb';
    }

    // Merchant detection & Category classification
    let categoryType: ExpenseCategory = 'прочее';
    let categoryName = 'Покупки';
    let title = 'Банковская покупка';
    let txType: 'expense' | 'income' | 'transfer' | 'interest' = 'expense';

    if (/перевод от|зачисление|поступление|кэшбэк|cashback|зарплат|аванс|возврат/i.test(text)) {
      txType = 'income';
      categoryType = 'прочее';
      categoryName = 'Поступление';
      if (/кэшбэк|cashback/i.test(text)) {
        categoryName = 'Кэшбэк';
        title = 'Кэшбэк по карте';
      } else if (/зарплат|аванс/i.test(text)) {
        categoryName = 'Зарплата';
        title = 'Зачисление зарплаты / аванса';
      } else {
        const senderMatch = text.match(/перевод\s+от\s+([А-Яа-яA-Za-z\s.]+?)(?:\.|\,|$|\s+баланс)/i);
        title = senderMatch ? `Перевод от ${senderMatch[1].trim()}` : 'Входящий перевод на карту';
      }
    } else if (/магнит|пятерочка|перекресток|лента|вкусвилл|ашан|дикси|супермаркет|продукты/i.test(text)) {
      categoryType = 'продукты';
      categoryName = 'Супермаркет';
      const m = text.match(/(магнит|пятерочка|перекресток|лента|вкусвилл|ашан|дикси)/i);
      title = m ? `Покупка в ${m[0]}` : 'Продукты в супермаркете';
    } else if (/кафе|кофе|coffee|столовая|додо|ресторан|бургер|кфс|вкусно|lunch|ланч/i.test(text)) {
      categoryType = 'еда_вне_дома';
      categoryName = 'Кафе / Еда';
      title = 'Кафе и перекус';
    } else if (/такси|яндекс\.?go|uber|метро|автобус|транспорт/i.test(text)) {
      categoryType = 'транспорт';
      categoryName = 'Такси / Транспорт';
      title = 'Поездка на такси / транспорт';
    } else if (/лукойл|газпромнефть|роснефть|азс|бензин|заправка/i.test(text)) {
      categoryType = 'авто';
      categoryName = 'Бензин / АЗС';
      title = 'Заправка топливом';
    } else if (/аптека|ригла|вита|планета здоровья|лекарств/i.test(text)) {
      categoryType = 'здоровье';
      categoryName = 'Аптека';
      title = 'Аптека и здоровье';
    } else if (/wildberries|wb|ozon|яндекс\.?маркет|dns/i.test(text)) {
      categoryType = 'покупки';
      categoryName = 'Маркетплейс';
      title = 'Заказ товаров';
    }

    // Card mask from text if available
    const cardMatch = text.match(/(?:карта|card|\*|\•)\s*(\d{4})/i);
    if (cardMatch) {
      detectedCard = `•${cardMatch[1]}`;
    }

    const now = new Date();
    const newTx: BankTransaction = {
      id: `tx-parsed-${Date.now()}`,
      bankAccountId,
      bankName: detectedBank,
      accountNumberMask: detectedCard,
      title,
      merchant: title,
      amount,
      type: txType,
      categoryType,
      categoryName,
      date: state.todayDate,
      time: now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      status: 'pending',
      rawSnippet: snippet,
    };

    // If balance was in message, update account balance
    const balanceMatch = text.match(/баланс[:\s]*([0-9\s]+(?:[.,][0-9]{1,2})?)/i);
    let balanceUpdated = false;
    if (balanceMatch) {
      const parsedBal = parseFloat(balanceMatch[1].replace(/\s+/g, '').replace(',', '.'));
      if (!isNaN(parsedBal)) {
        setState(prev => ({
          ...prev,
          bankAccounts: (prev.bankAccounts || []).map(acc => 
            acc.id === bankAccountId ? { ...acc, balance: parsedBal, lastSyncedAt: new Date().toISOString() } : acc
          ),
          pendingBankTransactions: [newTx, ...(prev.pendingBankTransactions || [])],
        }));
        balanceUpdated = true;
      }
    }

    if (!balanceUpdated) {
      setState(prev => ({
        ...prev,
        pendingBankTransactions: [newTx, ...(prev.pendingBankTransactions || [])],
      }));
    }

    return { 
      success: true, 
      message: `Распознан чек на ${formatRubles(amount)} (${detectedBank}). Поступил в экран подтверждения.`,
      transaction: newTx 
    };
  };

  // 6. Reconcile Cushion with Savings Bank Account
  const reconcileCushionWithBank = (bankAccountId?: string) => {
    const savingsAcc = (state.bankAccounts || []).find(a => 
      bankAccountId ? a.id === bankAccountId : (a.accountType === 'savings' && a.isConnected)
    );

    if (!savingsAcc) {
      return { success: false, message: 'Накопительный счет не найден', interestAdded: 0 };
    }

    const currentCushion = state.cushionAccumulated;
    const bankBalance = savingsAcc.balance;
    const diff = bankBalance - currentCushion;

    // Capitalize or sync exact balance
    setState(prev => {
      // update schedule for current month
      const updatedSchedule = (prev.cushionSchedule || []).map((item, idx) => {
        if (idx === 0) {
          return {
            ...item,
            balance: bankBalance,
            capitalization: diff > 0 ? (item.capitalization + diff) : item.capitalization,
            deviation: bankBalance - item.targetAccumulated,
          };
        }
        return item;
      });

      return {
        ...prev,
        cushionAccumulated: bankBalance,
        cushionSchedule: updatedSchedule,
      };
    });

    return {
      success: true,
      message: diff > 0 
        ? `Сверка завершена. Зачислена капитализация процентов: +${formatRubles(diff)}`
        : `Баланс подушки синхронизирован с банком (${formatRubles(bankBalance)})`,
      interestAdded: Math.max(0, diff),
    };
  };

  // 7. Apply Balance Correction (Auto-align budget with actual bank balance)
  const applyBalanceCorrection = (adjustmentAmount: number, mode: 'expense' | 'budget_adjust', reason?: string) => {
    if (adjustmentAmount === 0) return;

    if (mode === 'expense') {
      // If bank has LESS money than expected, add unrecorded expense to today
      if (adjustmentAmount < 0) {
        const absVal = Math.abs(adjustmentAmount);
        addExpenseToDate(state.todayDate, {
          title: reason || 'Корректировка неучтенных расходов',
          amount: absVal,
          category: 'Корректировка',
          categoryType: 'прочее',
          time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
          isConfirmed: true,
          notes: 'Автоматическая сверка с остатком в банке',
        });
      } else {
        // If bank has MORE money (unrecorded income/cashback), add to previous remainder
        setState(prev => ({
          ...prev,
          previousMonthRemainder: prev.previousMonthRemainder + adjustmentAmount,
        }));
      }
    } else {
      // Adjust previousMonthRemainder or budget directly
      setState(prev => ({
        ...prev,
        previousMonthRemainder: Math.max(0, prev.previousMonthRemainder + adjustmentAmount),
      }));
    }
  };

  // Bank account management
  const updateBankAccountBalance = (accountId: string, newBalance: number) => {
    setState(prev => ({
      ...prev,
      bankAccounts: (prev.bankAccounts || []).map(acc => 
        acc.id === accountId ? { ...acc, balance: newBalance, lastSyncedAt: new Date().toISOString() } : acc
      ),
    }));
  };

  const addBankAccount = (account: Omit<BankAccount, 'id'>) => {
    const newAcc: BankAccount = {
      ...account,
      id: `bank-${Date.now()}`,
      lastSyncedAt: new Date().toISOString(),
      isConnected: true,
    };
    setState(prev => ({
      ...prev,
      bankAccounts: [...(prev.bankAccounts || []), newAcc],
    }));
  };

  const removeBankAccount = (id: string) => {
    setState(prev => ({
      ...prev,
      bankAccounts: (prev.bankAccounts || []).filter(acc => acc.id !== id),
    }));
  };

  // ==========================================
  // CREDIT CARDS ACTIONS
  // ==========================================
  const addCreditCard = (cardData: Omit<CreditCard, 'id' | 'lastUpdated'>) => {
    const cardId = `cc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const formattedMask = cardData.cardMask.replace(/^•*/, '•');
    const newCard: CreditCard = {
      ...cardData,
      id: cardId,
      cardMask: formattedMask,
      initialDebt: cardData.initialDebt !== undefined ? cardData.initialDebt : cardData.currentDebt,
      lastUpdated: new Date().toISOString(),
      isPaidOff: cardData.currentDebt <= 0,
    };

    setState(prev => {
      const updatedCards = [...(prev.creditCards || []), newCard];
      let updatedPlanned = [...prev.plannedItems];

      // Если долговая стратегия и указан ежемесячный платеж — создаем статью в планах
      if (newCard.strategy === 'debt' && (newCard.monthlyPayment || 0) > 0 && !newCard.isPaidOff) {
        const plannedId = `plan_cc_${newCard.id}`;
        const existingIdx = updatedPlanned.findIndex(p => p.creditCardId === newCard.id || p.id === plannedId);
        const plannedItem: PlannedItem = {
          id: plannedId,
          title: `Кредитная карта ${newCard.bankName} (${newCard.cardMask})`,
          amount: newCard.monthlyPayment || 0,
          category: 'обязательные',
          isPaid: false,
          type: 'credit_card',
          creditCardId: newCard.id,
          period: 'current',
          notes: `Ежемесячный платёж по кредитной карте ${newCard.bankName}`,
        };

        if (existingIdx >= 0) {
          updatedPlanned[existingIdx] = plannedItem;
        } else {
          updatedPlanned.push(plannedItem);
        }
      }

      return {
        ...prev,
        creditCards: updatedCards,
        plannedItems: updatedPlanned,
      };
    });
  };

  const updateCreditCard = (id: string, updated: Partial<CreditCard>) => {
    setState(prev => {
      const cards = prev.creditCards || [];
      const cardIndex = cards.findIndex(c => c.id === id);
      if (cardIndex === -1) return prev;

      const currentCard = cards[cardIndex];
      const mergedDebt = updated.currentDebt !== undefined ? updated.currentDebt : currentCard.currentDebt;
      const isCardPaidOff = mergedDebt <= 0;

      const mergedCard: CreditCard = {
        ...currentCard,
        ...updated,
        cardMask: updated.cardMask ? updated.cardMask.replace(/^•*/, '•') : currentCard.cardMask,
        currentDebt: mergedDebt,
        isPaidOff: isCardPaidOff,
        lastUpdated: new Date().toISOString(),
      };

      const updatedCards = [...cards];
      updatedCards[cardIndex] = mergedCard;

      let updatedPlanned = [...prev.plannedItems];
      const linkedPlanIdx = updatedPlanned.findIndex(p => p.creditCardId === id || p.id === `plan_cc_${id}`);

      if (mergedCard.strategy === 'optimizer' || mergedCard.isPaidOff) {
        // Если стратегия стала 'optimizer' или долг закрыт — удаляем связанную плановую статью
        if (linkedPlanIdx >= 0) {
          updatedPlanned.splice(linkedPlanIdx, 1);
        }
      } else if (mergedCard.strategy === 'debt') {
        const paymentAmount = mergedCard.monthlyPayment || 0;
        if (paymentAmount > 0) {
          const plannedItem: PlannedItem = {
            id: `plan_cc_${id}`,
            title: `Кредитная карта ${mergedCard.bankName} (${mergedCard.cardMask})`,
            amount: paymentAmount,
            category: 'обязательные',
            isPaid: linkedPlanIdx >= 0 ? updatedPlanned[linkedPlanIdx].isPaid : false,
            type: 'credit_card',
            creditCardId: id,
            period: linkedPlanIdx >= 0 ? (updatedPlanned[linkedPlanIdx].period || 'current') : 'current',
            notes: `Ежемесячный платёж по кредитной карте ${mergedCard.bankName}`,
          };

          if (linkedPlanIdx >= 0) {
            updatedPlanned[linkedPlanIdx] = {
              ...updatedPlanned[linkedPlanIdx],
              ...plannedItem,
            };
          } else {
            updatedPlanned.push(plannedItem);
          }
        } else if (linkedPlanIdx >= 0) {
          updatedPlanned.splice(linkedPlanIdx, 1);
        }
      }

      return {
        ...prev,
        creditCards: updatedCards,
        plannedItems: updatedPlanned,
      };
    });
  };

  const removeCreditCard = (id: string) => {
    setState(prev => ({
      ...prev,
      creditCards: (prev.creditCards || []).filter(c => c.id !== id),
      plannedItems: prev.plannedItems.filter(p => p.creditCardId !== id && p.id !== `plan_cc_${id}`),
    }));
  };

  const updateCreditCardDebt = (id: string, newDebt: number) => {
    const validDebt = Math.max(0, newDebt);
    setState(prev => {
      const cards = prev.creditCards || [];
      const cardIndex = cards.findIndex(c => c.id === id);
      if (cardIndex === -1) return prev;

      const card = cards[cardIndex];
      const isPaidOff = validDebt <= 0;
      const updatedCard: CreditCard = {
        ...card,
        currentDebt: validDebt,
        isPaidOff: isPaidOff,
        lastUpdated: new Date().toISOString(),
      };

      const updatedCards = [...cards];
      updatedCards[cardIndex] = updatedCard;

      let updatedPlanned = [...prev.plannedItems];
      if (isPaidOff && card.strategy === 'debt') {
        const linkedPlanIdx = updatedPlanned.findIndex(p => p.creditCardId === id || p.id === `plan_cc_${id}`);
        if (linkedPlanIdx >= 0) {
          updatedPlanned[linkedPlanIdx] = {
            ...updatedPlanned[linkedPlanIdx],
            isPaid: true,
          };
        }
      }

      return {
        ...prev,
        creditCards: updatedCards,
        plannedItems: updatedPlanned,
      };
    });
  };

  const refreshCreditCardGracePeriod = (id: string, newGraceDate?: string) => {
    setState(prev => {
      const cards = prev.creditCards || [];
      const cardIndex = cards.findIndex(c => c.id === id);
      if (cardIndex === -1) return prev;

      const card = cards[cardIndex];
      let finalDate = newGraceDate;
      if (!finalDate) {
        const base = card.gracePeriodEndDate ? new Date(card.gracePeriodEndDate) : new Date();
        base.setDate(base.getDate() + 30);
        finalDate = base.toISOString().split('T')[0];
      }

      const updatedCards = [...cards];
      updatedCards[cardIndex] = {
        ...card,
        gracePeriodEndDate: finalDate,
        lastUpdated: new Date().toISOString(),
      };

      return {
        ...prev,
        creditCards: updatedCards,
      };
    });
  };

  // ==========================================
  // REGULAR EXPENSES AI ACTIONS
  // ==========================================
  const analyzeRegularExpenses = (): SuggestedRegularExpense[] => {
    const transactions = state.pendingBankTransactions || [];
    return analyzeBankTransactionsForRegularExpenses(transactions, state.ignoredMerchants || []);
  };

  const applySuggestedPlans = (suggestions: SuggestedRegularExpense[]) => {
    setState(prev => {
      const existingTitles = new Set((prev.plannedItems || []).map(p => p.title.toLowerCase().trim()));
      const newPlans: PlannedItem[] = [];

      suggestions.forEach(s => {
        if (existingTitles.has(s.title.toLowerCase().trim())) {
          return;
        }

        const finalAmount = s.isFixed ? s.amount : (s.predictedAmount || s.amount);
        newPlans.push({
          id: `plan_auto_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          title: s.title,
          amount: finalAmount,
          spentAmount: 0,
          isProgressTracked: s.category === 'авто',
          category: s.category || 'обязательные',
          isPaid: false,
          notes: s.isFixed 
            ? `Автоанализ: фиксированный платёж (${s.typicalDay}-е число)` 
            : `Автоанализ: прогноз с учетом тренда (${s.typicalDay}-е число)`,
          type: 'regular',
          isAutoGenerated: true,
          autoRenew: s.autoRenew !== false,
          sourceMerchant: s.merchant,
          typicalDay: s.typicalDay,
        });
      });

      return {
        ...prev,
        plannedItems: [...prev.plannedItems, ...newPlans],
        regularExpensesAnalyzed: true,
      };
    });
  };

  const setRegularExpensesAnalyzed = (status: boolean = true) => {
    setState(prev => ({
      ...prev,
      regularExpensesAnalyzed: status,
    }));
  };

  const ignoreMerchant = (merchant: string) => {
    if (!merchant) return;
    setState(prev => {
      const currentIgnored = prev.ignoredMerchants || [];
      if (currentIgnored.includes(merchant)) return prev;
      return {
        ...prev,
        ignoredMerchants: [...currentIgnored, merchant],
      };
    });
  };

  const togglePlannedItemAutoRenew = (id: string) => {
    setState(prev => ({
      ...prev,
      plannedItems: (prev.plannedItems || []).map(p => 
        p.id === id ? { ...p, autoRenew: !p.autoRenew } : p
      )
    }));
  };

  const getPaymentDateAdvice = (): PaymentDateOptimizationAdvice => {
    const suggestions = analyzeRegularExpenses();
    return analyzePaymentDates(suggestions, state.salaryDateDay || 5);
  };

  // ==========================================
  // FOOD & GROCERIES MANAGEMENT ACTIONS
  // ==========================================
  const totalFoodSpentThisPeriod = useMemo(() => {
    return calculateTotalFoodSpentInPeriod(
      state.days || [],
      state.periodStartDate,
      state.periodEndDate
    );
  }, [state.days, state.periodStartDate, state.periodEndDate]);

  const setFoodControl = (config: FoodControlState) => {
    setState(prev => {
      const basketTotal = config.mode === 'simple' ? 0 : calculateBasketTotal(config.basketItems || []);
      const updatedControl: FoodControlState = {
        ...config,
        basketTotal,
        lastUpdated: new Date().toISOString(),
        priceHistory: config.priceHistory && config.priceHistory.length > 0 
          ? config.priceHistory 
          : generateDefaultFoodPriceHistory(basketTotal),
      };
      return {
        ...prev,
        foodControl: updatedControl,
      };
    });
  };

  const setFoodMode = (mode: FoodControlMode) => {
    setState(prev => {
      const current = prev.foodControl || { mode: 'basket', basketItems: [], monthlyLimit: 20000 };
      const updatedControl: FoodControlState = {
        ...current,
        mode,
        lastUpdated: new Date().toISOString(),
      };
      return {
        ...prev,
        foodControl: updatedControl,
      };
    });
  };

  const updateBasketItem = (id: string, updated: Partial<FoodItem>) => {
    setState(prev => {
      const current = prev.foodControl || { mode: 'basket', basketItems: [], monthlyLimit: 20000 };
      const items = (current.basketItems || []).map(i => i.id === id ? { ...i, ...updated, lastUpdated: new Date().toISOString() } : i);
      const basketTotal = calculateBasketTotal(items);
      return {
        ...prev,
        foodControl: {
          ...current,
          basketItems: items,
          basketTotal,
          lastUpdated: new Date().toISOString(),
        },
      };
    });
  };

  const addBasketItem = (item: Omit<FoodItem, 'id' | 'lastUpdated'>) => {
    setState(prev => {
      const current = prev.foodControl || { mode: 'basket', basketItems: [], monthlyLimit: 20000 };
      const newItem: FoodItem = {
        ...item,
        id: `food-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        lastUpdated: new Date().toISOString(),
      };
      const items = [newItem, ...(current.basketItems || [])];
      const basketTotal = calculateBasketTotal(items);
      return {
        ...prev,
        foodControl: {
          ...current,
          basketItems: items,
          basketTotal,
          lastUpdated: new Date().toISOString(),
        },
      };
    });
  };

  const removeBasketItem = (id: string) => {
    setState(prev => {
      const current = prev.foodControl || { mode: 'basket', basketItems: [], monthlyLimit: 20000 };
      const items = (current.basketItems || []).filter(i => i.id !== id);
      const basketTotal = calculateBasketTotal(items);
      return {
        ...prev,
        foodControl: {
          ...current,
          basketItems: items,
          basketTotal,
          lastUpdated: new Date().toISOString(),
        },
      };
    });
  };

  const updateFoodLimit = (limit: number) => {
    setState(prev => {
      const current = prev.foodControl || { mode: 'simple', basketItems: [], monthlyLimit: 20000 };
      return {
        ...prev,
        foodControl: {
          ...current,
          monthlyLimit: limit,
          lastUpdated: new Date().toISOString(),
        },
      };
    });
  };

  const syncFoodPlanWithBudget = () => {
    setState(prev => {
      const food = prev.foodControl;
      if (!food) return prev;

      // Удаляем старые связанные продуктовые статьи
      const filteredPlanned = (prev.plannedItems || []).filter(
        p => p.type !== 'food' && p.type !== 'food_basket' && p.type !== 'food_discretionary' && !p.title.toLowerCase().includes('продукты (корзина)') && !p.title.toLowerCase().includes('продукты (лимит)')
      );

      const totalSpent = calculateTotalFoodSpentInPeriod(prev.days || [], prev.periodStartDate, prev.periodEndDate);
      const newPlans: PlannedItem[] = [];

      if (food.mode === 'simple') {
        const amount = food.monthlyLimit || 20000;
        newPlans.push({
          id: `plan_food_simple_${Date.now()}`,
          title: 'Продукты питания',
          amount,
          spentAmount: totalSpent,
          isProgressTracked: true,
          category: 'покупки',
          isPaid: false,
          notes: 'Базовый лимит на покупку продуктов',
          type: 'food',
          period: 'current',
          autoRenew: true,
        });
      } else if (food.mode === 'basket') {
        const basketTotal = food.basketTotal || calculateBasketTotal(food.basketItems || []);
        newPlans.push({
          id: `plan_food_basket_${Date.now()}`,
          title: 'Потребительская корзина',
          amount: basketTotal,
          spentAmount: totalSpent,
          isProgressTracked: true,
          category: 'покупки',
          isPaid: false,
          notes: `Базовые продукты (${food.basketItems?.length || 0} позиций)`,
          type: 'food_basket',
          period: 'current',
          autoRenew: true,
        });
      } else if (food.mode === 'hybrid') {
        const basketTotal = food.basketTotal || calculateBasketTotal(food.basketItems || []);
        const discLimit = food.monthlyLimit || 3000;
        
        const basketSpent = Math.min(basketTotal, Math.round(totalSpent * 0.8));
        const discSpent = Math.max(0, totalSpent - basketSpent);

        newPlans.push({
          id: `plan_food_hybrid_basket_${Date.now()}`,
          title: 'Базовые продукты (Корзина)',
          amount: basketTotal,
          spentAmount: basketSpent,
          isProgressTracked: true,
          category: 'покупки',
          isPaid: false,
          notes: `Потребительская корзина (${food.basketItems?.length || 0} позиций)`,
          type: 'food_basket',
          period: 'current',
          autoRenew: true,
        });

        newPlans.push({
          id: `plan_food_hybrid_disc_${Date.now()}`,
          title: 'Прочие продукты (Дискреционные)',
          amount: discLimit,
          spentAmount: discSpent,
          isProgressTracked: true,
          category: 'покупки',
          isPaid: false,
          notes: 'Сладости, напитки, снэки и спонтанные покупки',
          type: 'food_discretionary',
          period: 'current',
          autoRenew: true,
        });
      }

      return {
        ...prev,
        plannedItems: [...filteredPlanned, ...newPlans],
      };
    });
  };

  // User profile & preferences
  const updateUserProfile = (settings: { userName?: string; currency?: string; includeAdvanceInBudget?: boolean }) => {
    setState(prev => ({
      ...prev,
      ...settings,
    }));
  };

  // Financial profile update
  const updateFinancialProfileState = (settings: {
    salaryDateDay: number;
    advanceDateDay?: number;
    currentSalary?: number;
    hasAdvance?: boolean;
    cushionNormMode?: 'percent' | 'fixed';
    cushionNormPercent?: number;
    cushionNormFixedAmount?: number;
    includeAdvanceInBudget?: boolean;
    advanceTreatment?: 'include' | 'separate';
  }) => {
    setState(prev => {
      const newSalary = settings.currentSalary !== undefined ? settings.currentSalary : prev.currentSalary;
      const newSalaryDay = settings.salaryDateDay || prev.salaryDateDay || 5;
      const newAdvanceDay = settings.advanceDateDay !== undefined ? settings.advanceDateDay : (prev.advanceDateDay || 20);
      const newNormMode = settings.cushionNormMode || prev.cushionNormMode || 'percent';
      const newNormPct = settings.cushionNormPercent !== undefined ? settings.cushionNormPercent : (prev.cushionNormPercent ?? 10);
      const newNormFixed = settings.cushionNormFixedAmount !== undefined ? settings.cushionNormFixedAmount : (prev.cushionNormFixedAmount ?? 8265);
      
      const newNormContribution = calculateMonthlyCushionNorm(newSalary, newNormMode, newNormPct, newNormFixed);

      const updatedSchedule = generateDynamicCushionSchedule({
        currentSalary: newSalary,
        isDepositMade: prev.isCushionDepositDoneThisMonth ?? true,
        actualDepositAmount: prev.actualCushionDepositThisMonth ?? newNormContribution,
        bankAccumulated: prev.cushionAccumulated,
        startMonth: 8,
        startYear: 2026,
        normMode: newNormMode,
        normPercent: newNormPct,
        normFixedAmount: newNormFixed,
      });

      // Update financial profile sub-object if present
      const updatedProfile: FinancialProfile | undefined = prev.financialProfile ? {
        ...prev.financialProfile,
        mainSalaryDate: newSalaryDay,
        advanceDate: settings.hasAdvance ? newAdvanceDay : undefined,
        fixedPartAmount: newSalary,
        advanceTreatment: settings.advanceTreatment || (settings.includeAdvanceInBudget ? 'include' : 'separate'),
        periodStartDay: newSalaryDay,
      } : undefined;

      return {
        ...prev,
        salaryDateDay: newSalaryDay,
        advanceDateDay: newAdvanceDay,
        currentSalary: newSalary,
        safetyCushionDeposit: newNormContribution,
        cushionMonthlyContribution: newNormContribution,
        cushionNormMode: newNormMode,
        cushionNormPercent: newNormPct,
        cushionNormFixedAmount: newNormFixed,
        includeAdvanceInBudget: settings.includeAdvanceInBudget ?? prev.includeAdvanceInBudget,
        cushionSchedule: updatedSchedule,
        financialProfile: updatedProfile,
      };
    });
  };

  // Import JSON state
  const importBudgetState = (newState: BudgetState): { success: boolean; message: string } => {
    try {
      setState(newState);
      setSelectedDate(newState.todayDate || INITIAL_BUDGET_STATE.todayDate);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      if (user) {
        const userDocRef = doc(db, 'users', user.uid, 'budgetData', 'state');
        safeSetDoc(userDocRef, { ...newState, updatedAt: new Date().toISOString() }, { merge: true });
      }
      return { success: true, message: 'Данные успешно импортированы' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Ошибка при импорте данных' };
    }
  };

  // <-- ДОБАВЛЕНО: функция инициализации из профиля
  const initializeBudgetFromProfile = (newProfile: FinancialProfile) => {
    setState(prev => {
      const newState = buildInitialStateFromProfile(newProfile, prev);
      const combined = {
        ...newState,
        creditCards: prev.creditCards && prev.creditCards.length > 0 ? prev.creditCards : newState.creditCards,
        plannedItems: prev.plannedItems && prev.plannedItems.length > 0 ? prev.plannedItems : newState.plannedItems,
        regularExpensesAnalyzed: prev.regularExpensesAnalyzed ?? false,
        ignoredMerchants: prev.ignoredMerchants ?? [],
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(combined));
      if (user) {
        const userDocRef = doc(db, 'users', user.uid, 'budgetData', 'state');
        safeSetDoc(userDocRef, { ...combined, updatedAt: new Date().toISOString() }, { merge: true });
      }
      return combined;
    });
  };

  const resetToDefaults = () => {
    setState(INITIAL_BUDGET_STATE);
    setSelectedDate(INITIAL_BUDGET_STATE.todayDate);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <BudgetContext.Provider
      value={{
        state,
        activeTab,
        setActiveTab,
        selectedDate,
        setSelectedDate,
        isMobileFrame,
        toggleMobileFrame,
        theme,
        setTheme,
        toggleTheme,
        syncStatus,
        totalPlannedSum,
        freeDiscretionaryBudget,
        baseDailyNorm,
        daysToSalary,
        cleanRemainderToday,
        todayAllowedSpend,
        todayRemainingAfterSpend,
        todaySpent,
        todayRemainingForecast,
        avgSpendPerDay,
        medianSpendPerDay,
        cushionProgressPercent,
        unconfirmedCountToday,
        totalUnconfirmedCount,
        
        // Period & Salary Rollover
        rollingPeriods,
        currentPeriodTemplate,
        selectedPeriodId,
        setSelectedPeriodId,
        activeViewingPeriod,
        setPeriodByTemplate,
        salarySchedule,
        periodEndingRemainderInfo,

        // Banking state
        totalCheckingBankBalance,
        totalSavingsBankBalance,
        bankDiscrepancyAmount,
        pendingBankTransactionsCount,
        isBankSyncing,

        // Incomes & Inflow Analysis
        incomes,
        pendingBankIncomes,
        pendingBankIncomesCount,
        pendingBankIncomesTotal,
        totalIncludedAdditionalIncomes,

        // Advance & Correction metrics
        isAdvanceDateReached,
        unreachedPlannedExpenses,
        calculatedBudgetCorrection,
        isBalanceSynced,

        // Core actions
        addExpenseToDate,
        updateExpense,
        deleteExpenseFromDate,
        toggleExpenseConfirmed,
        confirmAllExpensesForDate,
        togglePlannedItemPaid,
        addPlannedItem,
        updatePlannedItem,
        deletePlannedItem,
        updatePlannedItemProgress,
        addSpentToPlannedItem,
        movePlannedToWishlist,
        transferPlannedItemPeriod,
        applyBudgetCorrection,
        applyBalanceSync,
        updateAdvanceSettings,

        // Wishlist
        toggleWishlistPurchased,
        addWishlistItem,
        updateWishlistItem,
        deleteWishlistItem,
        clearPurchasedWishlist,
        moveWishlistToPlanned,

        // Cushion & Mandatory expenses
        depositToCushion,
        withdrawFromCushion,
        updateCushionAccumulated,
        updateCashSavings,
        updateCushionMonthlyContribution,
        updateCurrentSalary,
        setCushionDepositStatus,
        updateActualCushionDepositThisMonth,
        updateCushionNorm,
        updateMandatoryExpense,
        addMandatoryExpense,
        deleteMandatoryExpense,
        setMandatoryExpensesMode,

        updateBudgetSettings,
        startNewPeriod,
        receiveSalary,
        ensureDaysForMonth,
        resetToDefaults,

        // Income Actions
        acceptBankIncomeToBudget,
        rejectBankIncome,
        addManualIncome,
        toggleIncomeBudgetInclusion,
        deleteIncome,
        editIncome,

        // Banking actions
        approveBankTransaction,
        rejectBankTransaction,
        confirmPlannedBankTransaction,
        approveAllPendingBankTransactions,
        rejectAllPendingBankTransactions,
        confirmPendingIncome,
        syncBankAccounts,
        parseAndImportBankSnippet,
        reconcileCushionWithBank,
        applyBalanceCorrection,
        updateBankAccountBalance,
        addBankAccount,
        removeBankAccount,

        // Credit Cards actions
        addCreditCard,
        updateCreditCard,
        removeCreditCard,
        updateCreditCardDebt,
        refreshCreditCardGracePeriod,

        // Regular Expenses AI actions
        analyzeRegularExpenses,
        applySuggestedPlans,
        setRegularExpensesAnalyzed,
        ignoreMerchant,
        togglePlannedItemAutoRenew,
        getPaymentDateAdvice,

        // Food & Groceries Management actions
        setFoodControl,
        setFoodMode,
        updateBasketItem,
        addBasketItem,
        removeBasketItem,
        updateFoodLimit,
        syncFoodPlanWithBudget,
        totalFoodSpentThisPeriod,

        // Marketplace sync actions
        connectMarketplace,
        disconnectMarketplace,
        syncMarketplaceOrders,
        cancelMarketplaceOrder,
        receiveMarketplaceOrder,
        recordMarketplaceWalletTopup,

        // Profile & Data Management actions
        updateUserProfile,
        updateFinancialProfileState,
        importBudgetState,

        // <-- ДОБАВЛЕНО
        initializeBudgetFromProfile,
      }}
    >
      {children}
    </BudgetContext.Provider>
  );
};

export const useBudget = (): BudgetContextType => {
  const context = useContext(BudgetContext);
  if (!context) {
    throw new Error('useBudget must be used within a BudgetProvider');
  }
  return context;
};

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

export { getTodayDateString };