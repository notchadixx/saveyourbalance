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
  findPeriodTemplateForDate,
  calculateAdjustedPayoutDate
} from '../utils/periodUtils';
import { buildInitialStateFromProfile } from '../utils/profileBudgetBuilder'; // <-- ДОБАВЛЕНО
import { 
  calculatePlannedExpensesSum, 
  calculateFreeDiscretionaryBudget, 
  calculateDailyNorm 
} from '../utils/normCalculator';
import { 
  analyzeBankTransactionsForRegularExpenses, 
  analyzePaymentDates 
} from '../utils/regularExpenseAnalyzer';
import {
  calculateBasketTotal,
  calculateTotalFoodSpentInPeriod,
  generateDefaultFoodPriceHistory
} from '../utils/foodBasketUtils';

import { formatRubles } from '../utils/formatters';
import { useBankAccounts, parseBankNotificationSnippet } from './bankAccounts';

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
  hasCardBalance: boolean;
  realDiscretionaryRemainder: number;

  // Incomes & Inflow Analysis
  incomes: IncomeItem[];
  pendingBankIncomes: BankTransaction[];
  pendingBankIncomesCount: number;
  pendingBankIncomesTotal: number;
  totalIncludedAdditionalIncomes: number;

  // Advance & Correction metrics
  isAdvanceDateReached: boolean;
  effectiveAdvanceAmount: number;
  actualAdvanceDateStr: string;
  actualAdvanceDay: number;
  isAdvanceShifted: boolean;
  totalFundsWithAdvance: number;
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
  addPlannedItem: (item: Omit<PlannedItem, 'id'> & { id?: string }) => void;
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
  toggleCushionEnabled: (enabled: boolean) => void;
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
  setOverallCheckingCardBalance: (newBalance: number) => void;
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
  initializeBudgetFromProfile: (
    profile: FinancialProfile,
    cushionConfig?: {
      isCushionEnabled?: boolean;
      cushionNormMode?: 'percent' | 'fixed';
      cushionNormPercent?: number;
      cushionNormFixedAmount?: number;
      safetyCushionDeposit?: number;
    }
  ) => void;

  // Onboarding Guided Tour Action
  setOnboardingTourSeen: (seen: boolean) => void;
}

// Monthly cushion norm calculator
export function calculateMonthlyCushionNorm(
  salary: number,
  mode: 'percent' | 'fixed' = 'percent',
  percent: number = 10,
  fixedAmount: number = 0
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
    startMonth = new Date().getMonth() + 1,
    startYear = new Date().getFullYear(),
    rateInfo = '13.5%',
    normMode = 'percent',
    normPercent = 10,
    normFixedAmount = 0,
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

// Единая точка пересборки расписания подушки.
// Раньше этот же набор из 10-15 строк (чтение normMode/normPercent/normFixedAmount
// из state и повторный вызов generateDynamicCushionSchedule с зашитой датой
// "август 2026") был скопирован в 10 разных функциях ниже. Теперь это одно место:
// значения по умолчанию берутся из текущего state, а startMonth/startYear всегда
// берутся из реальной сегодняшней даты (не зашиты).
function rebuildCushionSchedule(
  prev: BudgetState,
  overrides: Partial<{
    currentSalary: number;
    isDepositMade: boolean;
    actualDepositAmount: number;
    bankAccumulated: number;
    normMode: 'percent' | 'fixed';
    normPercent: number;
    normFixedAmount: number;
  }> = {}
): CushionMonthPlan[] {
  const normMode = overrides.normMode ?? prev.cushionNormMode ?? 'percent';
  const normPercent = overrides.normPercent ?? prev.cushionNormPercent ?? 10;
  const normFixedAmount = overrides.normFixedAmount ?? prev.cushionNormFixedAmount ?? 0;
  const currentSalary = overrides.currentSalary ?? prev.currentSalary ?? 0;
  const isDepositMade = overrides.isDepositMade ?? prev.isCushionDepositDoneThisMonth ?? true;
  const actualDepositAmount =
    overrides.actualDepositAmount ??
    prev.actualCushionDepositThisMonth ??
    calculateMonthlyCushionNorm(currentSalary, normMode, normPercent, normFixedAmount);
  const bankAccumulated = overrides.bankAccumulated ?? prev.cushionAccumulated ?? 0;

  return generateDynamicCushionSchedule({
    currentSalary,
    isDepositMade,
    actualDepositAmount,
    bankAccumulated,
    normMode,
    normPercent,
    normFixedAmount,
  });
}

/**
 * Computes the clean unspent remainder from the last day of the previous period.
 */
export function calculateCleanRemainderFromPreviousPeriod(
  days: DayRecord[],
  prevPeriodStart?: string,
  prevPeriodEnd?: string,
  fallbackAmount: number = 0
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

  // Раньше здесь были зашиты "2026, 9" (сентябрь 2026) буквально — после того,
  // как реальная дата уходила за пределы сентября 2026, любой переход периода
  // через эту функцию заново "откатывал" период на сентябрь. Теперь год и
  // месяц вычисляются из фактической сегодняшней даты (actualToday).
  const todayParts = actualToday.split('-');
  const todayYear = parseInt(todayParts[0], 10) || 2026;
  const todayMonth = parseInt(todayParts[1], 10) || 9;

  // Determine current period template
  const newTemplate = generatePeriodTemplateForMonth(
    todayYear, 
    todayMonth, 
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
        0
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
      item.title.toLowerCase().includes('фитнес') ||
      item.title.toLowerCase().includes('интернет') ||
      item.title.toLowerCase().includes('связь') ||
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

  // 3. Daily norm calculation via unified calculator
  const newSalary = currentState.currentSalary || 0;
  const isCushionActive = currentState.isCushionEnabled !== false;
  const cushionPercent = currentState.cushionNormPercent || 10;
  const newCushion = !isCushionActive
    ? 0
    : (currentState.cushionNormMode === 'fixed'
        ? (currentState.cushionNormFixedAmount || 0)
        : Math.round(newSalary * (cushionPercent / 100))
      );
  const recurringPlansTotal = calculatePlannedExpensesSum(updatedPlannedItems);

  const expectedTotalFunds = rolloverAmount + (newSalary - newCushion);
  const expectedDiscretionary = calculateFreeDiscretionaryBudget(expectedTotalFunds, recurringPlansTotal, 0);
  const newDailyNorm = calculateDailyNorm(expectedDiscretionary, newTemplate.totalDays || 31);

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
  const newTemplateParts = newStartDate.split('-');
  const newTemplateYear = parseInt(newTemplateParts[0], 10) || todayYear;
  const newTemplateMonth = parseInt(newTemplateParts[1], 10) || todayMonth;
  const freshCushionSchedule = buildCushionSchedule(
    newSalary,
    false,
    0.00,
    currentState.cushionAccumulated || 0,
    newTemplateMonth,
    newTemplateYear,
    currentState.cushionNormMode || 'percent',
    currentState.cushionNormPercent ?? 10,
    currentState.cushionNormFixedAmount ?? 0
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
    // Это уже настоящий переход периода внутри приложения (а не первый запуск
    // после онбординга) — значит, начиная с этого периода сверка баланса
    // карты с моделью снова имеет смысл, и предупреждение "Корректировка"
    // может показываться как обычно.
    isFirstTrackedPeriod: false,
  };
}

const THEME_STORAGE_KEY = 'limit_dnya_theme_mode';

const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

export const BudgetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { profile, isOnboardingComplete } = useProfile(); // <-- ДОБАВЛЕНО
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'offline' | 'guest'>('guest');
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
        // Clean out legacy hardcoded stock plans (p1-p17) so only user-configured plans remain
        if (Array.isArray(parsed.plannedItems)) {
          parsed.plannedItems = parsed.plannedItems.filter((i: PlannedItem) => 
            !['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'p11', 'p12', 'p13', 'p14', 'p15', 'p16', 'p17'].includes(i.id)
          );
        }
        // ensure bank and income properties exist and purge legacy secondary checking accounts with 6240
        if (!parsed.bankAccounts) {
          parsed.bankAccounts = INITIAL_BUDGET_STATE.bankAccounts;
        } else if (Array.isArray(parsed.bankAccounts)) {
          parsed.bankAccounts = parsed.bankAccounts.filter(
            (acc: BankAccount) => acc.id !== 'bank-sber-card' && !(acc.accountType === 'checking' && acc.balance === 6240)
          );
          if (!parsed.bankAccounts.some((acc: BankAccount) => acc.accountType === 'checking')) {
            parsed.bankAccounts.unshift({
              id: 'bank-tbank-card',
              bankId: 'tbank',
              bankName: 'Основная карта',
              accountType: 'checking',
              accountName: 'Основная карта',
              accountNumberMask: '•4821',
              balance: 0,
              lastSyncedAt: new Date().toISOString(),
              isConnected: true,
              color: '#fed838',
            });
          }
        }
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
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
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

  // Автоматическая инициализация из профиля для гостевого режима, если нет сохранённого состояния
  useEffect(() => {
    if (profile && isOnboardingComplete) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved && !user) {
        const newState = buildInitialStateFromProfile(profile);
        setState(newState);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
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
    return calculatePlannedExpensesSum(state.plannedItems);
  }, [state.plannedItems]);

  // 2. D1 "Итого на прочее" = B1 (Общий бюджет) - SUM(B4:B20) (Плановые статьи) - B3 (Подушка)
  // When salary is not yet received, calculate expected month discretionary so baseDailyNorm reflects full month accurately
  const freeDiscretionaryBudget = useMemo(() => {
    const effectiveBudget = state.isSalaryReceived
      ? (state.total30DaysBudget || 0)
      : ((state.previousMonthRemainder || 0) + (state.currentSalary || 0));

    const currentNorm = calculateMonthlyCushionNorm(
      state.currentSalary || 0,
      state.cushionNormMode || 'percent',
      state.cushionNormPercent ?? 10,
      state.cushionNormFixedAmount ?? 0
    );

    const effectiveCushion = state.isCushionEnabled === false
      ? 0
      : (state.actualCushionDepositThisMonth !== undefined && state.actualCushionDepositThisMonth > 0
          ? state.actualCushionDepositThisMonth
          : (state.safetyCushionDeposit || currentNorm));

    return calculateFreeDiscretionaryBudget(effectiveBudget, totalPlannedSum, effectiveCushion);
  }, [state.isSalaryReceived, state.total30DaysBudget, totalPlannedSum, state.safetyCushionDeposit, state.currentSalary, state.cushionNormPercent, state.cushionNormMode, state.cushionNormFixedAmount, state.isCushionEnabled, state.actualCushionDepositThisMonth, state.previousMonthRemainder]);

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
    // Запасной вариант больше не зашивает "сентябрь 2026" — берёт год/месяц
    // из реальной сегодняшней даты, если по какой-то причине refDate не
    // попал ни в один из сгенерированных периодов.
    const refParts = refDate.split('-');
    const refYear = parseInt(refParts[0], 10) || 2026;
    const refMonth = parseInt(refParts[1], 10) || 9;
    return generatePeriodTemplateForMonth(refYear, refMonth, state.salaryDateDay || 5, state.advanceDateDay || 20, refDate);
  }, [state.todayDate, state.salaryDateDay, state.advanceDateDay, rollingPeriods]);

  // 2.5 Unreached planned expenses, card balance check, and real discretionary remainder
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

  const hasCardBalance = useMemo(() => {
    const checkingAccounts = (state.bankAccounts || []).filter(
      acc => (acc.accountType === 'checking' || !acc.accountType) && acc.isConnected !== false
    );
    return checkingAccounts.length > 0 || (state.bankAccounts || []).some(acc => acc.balance > 0);
  }, [state.bankAccounts]);

  const checkingCardBalance = useMemo(() => {
    return (state.bankAccounts || [])
      .filter(acc => (acc.accountType === 'checking' || !acc.accountType) && acc.isConnected !== false)
      .reduce((sum, acc) => sum + acc.balance, 0);
  }, [state.bankAccounts]);

  const effectiveCushionForDaily = useMemo(() => {
    if (state.isCushionEnabled === false) return 0;
    const currentNorm = calculateMonthlyCushionNorm(
      state.currentSalary || 0,
      state.cushionNormMode || 'percent',
      state.cushionNormPercent ?? 10,
      state.cushionNormFixedAmount ?? 0
    );
    return (state.actualCushionDepositThisMonth !== undefined && state.actualCushionDepositThisMonth > 0)
      ? state.actualCushionDepositThisMonth
      : (state.safetyCushionDeposit || currentNorm);
  }, [state.isCushionEnabled, state.currentSalary, state.cushionNormMode, state.cushionNormPercent, state.cushionNormFixedAmount, state.actualCushionDepositThisMonth, state.safetyCushionDeposit]);

  // Advance schedule, dates and working day shift calculations
  const advanceDay = state.advanceDateDay || 20;
  const advanceScheduleInfo = useMemo(() => {
    try {
      const todayStr = state.todayDate || getTodayDateString();
      const parts = todayStr.split('-').map(Number);
      const y = parts[0] || 2026;
      const m = parts[1] || 9;
      return calculateAdjustedPayoutDate(y, m, advanceDay, 'Аванс');
    } catch {
      return {
        date: new Date(),
        dateStr: '2026-09-18',
        year: 2026,
        month: 9,
        day: 18,
        dayOfWeekName: 'Пятница',
        isShifted: true,
        shiftReason: '20-е число перенесено'
      };
    }
  }, [state.todayDate, advanceDay]);

  const actualAdvanceDateStr = currentPeriodTemplate?.advanceDateStr || advanceScheduleInfo.dateStr;
  const actualAdvanceDay = currentPeriodTemplate?.actualAdvanceDay || advanceScheduleInfo.day;
  const isAdvanceShifted = currentPeriodTemplate?.isAdvanceShifted ?? advanceScheduleInfo.isShifted;

  // 1. Is advance date reached for the current period?
  const isAdvanceDateReached = useMemo(() => {
    try {
      if (state.isAdvanceReceived === true) return true;
      const todayStr = state.todayDate || getTodayDateString();
      return todayStr >= actualAdvanceDateStr;
    } catch {
      return true;
    }
  }, [state.isAdvanceReceived, state.todayDate, actualAdvanceDateStr]);

  // Advance amount: estimated before date arrives, actual once reached
  const effectiveAdvanceAmount = useMemo(() => {
    // Раньше здесь была зашита фиксированная заглушка 40000 ₽, которая
    // всплывала в онбординге у КАЖДОГО пользователя независимо от его
    // реальной зарплаты (и возвращалась даже после того, как
    // estimatedAdvanceAmount стал 0 по умолчанию, потому что "0 || 40000"
    // в JS даёт 40000). Теперь при отсутствии введённой пользователем
    // оценки считаем по проценту от зарплаты — это даёт более осмысленную
    // оценку, а не одно и то же число для всех.
    const estimatedAdv = state.estimatedAdvanceAmount && state.estimatedAdvanceAmount > 0
      ? state.estimatedAdvanceAmount
      : Math.round((state.currentSalary || 0) * ((state.estimatedAdvanceSharePercent ?? 38.27) / 100));
    if (isAdvanceDateReached) {
      return state.actualAdvanceAmount || estimatedAdv;
    }
    return estimatedAdv;
  }, [isAdvanceDateReached, state.actualAdvanceAmount, state.estimatedAdvanceAmount, state.currentSalary, state.estimatedAdvanceSharePercent]);

  // Total funds until period end:
  // If before advance: card balance + estimated advance
  // If advance reached: card balance
  const totalFundsWithAdvance = useMemo(() => {
    if (!isAdvanceDateReached) {
      return checkingCardBalance + effectiveAdvanceAmount;
    }
    return checkingCardBalance;
  }, [isAdvanceDateReached, checkingCardBalance, effectiveAdvanceAmount]);

  const realDiscretionaryRemainder = useMemo(() => {
    if (!hasCardBalance) return 0;
    const availableFunds = !isAdvanceDateReached 
      ? checkingCardBalance + effectiveAdvanceAmount 
      : checkingCardBalance;
    return Math.max(0, availableFunds - unreachedPlannedExpenses - effectiveCushionForDaily);
  }, [hasCardBalance, isAdvanceDateReached, checkingCardBalance, effectiveAdvanceAmount, unreachedPlannedExpenses, effectiveCushionForDaily]);

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

  // 3. E1 "Итого в день" (Базовая норма)
  // Calculated from real card balance minus unreached planned expenses minus cushion, divided by daysToSalary
  // If no card balance entered yet, returns 0 (UI will prompt to enter card balance)
  const baseDailyNorm = useMemo(() => {
    if (!hasCardBalance) return 0;
    const daysCount = Math.max(1, daysToSalary);
    return Math.round((realDiscretionaryRemainder / daysCount) * 100) / 100;
  }, [hasCardBalance, realDiscretionaryRemainder, daysToSalary]);

  // 7. E3 "Общий допустимый расход на сегодня"
  const todayAllowedSpend = useMemo(() => {
    if (!hasCardBalance) return 0;
    return baseDailyNorm;
  }, [hasCardBalance, baseDailyNorm]);

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

    const effectiveNorm = baseDailyNorm > 0 ? baseDailyNorm : (todayRec?.normLimit || 0);

    let accumulatedEconomy = pastDaysInPeriod.reduce((acc, d) => {
      const dayNorm = baseDailyNorm > 0 ? baseDailyNorm : (d.normLimit || 0);
      return acc + (dayNorm - d.spent);
    }, 0);

    if (todayRec) {
      accumulatedEconomy += (effectiveNorm - todayRec.spent);
    }

    return Math.round(accumulatedEconomy * 100) / 100;
  }, [state.days, state.periodStartDate, state.periodEndDate, state.todayDate, baseDailyNorm]);

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
  // BANK ACCOUNTS & TRANSACTIONS (extracted to src/context/bankAccounts.ts)
  // ==========================================
  const addExpenseToDateRef = useRef<(date: string, expense: Omit<ExpenseItem, 'id'>) => void>(() => {});
  const receiveSalaryRef = useRef<(amount?: number) => void>(() => {});

  const bankAccountsBridge = useBankAccounts({
    state,
    setState,
    cleanRemainderToday,
    addExpenseToDate: (d, e) => addExpenseToDateRef.current(d, e),
    receiveSalary: (amt) => receiveSalaryRef.current(amt),
  });

  const {
    totalCheckingBankBalance,
    totalSavingsBankBalance,
    bankDiscrepancyAmount,
    pendingBankTransactionsCount,
    pendingBankIncomes,
    pendingBankIncomesCount,
    pendingBankIncomesTotal,
    isBankSyncing,
    approveBankTransaction,
    rejectBankTransaction,
    confirmPlannedBankTransaction,
    approveAllPendingBankTransactions,
    rejectAllPendingBankTransactions,
    acceptBankIncomeToBudget,
    rejectBankIncome,
    confirmPendingIncome,
    syncBankAccounts,
    parseAndImportBankSnippet,
    reconcileCushionWithBank,
    applyBalanceCorrection,
    updateBankAccountBalance,
    setOverallCheckingCardBalance,
    addBankAccount,
    removeBankAccount,
  } = bankAccountsBridge;

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

  // Exact correction calculation according to user's updated formula:
  // a) До аванса: Корректировка = Чистый текущий остаток - (текущий баланс по карте + предполагаемый аванс - планируемые нереализованные расходы)
  // b) После аванса: Корректировка = Чистый текущий остаток - (текущий баланс по карте - планируемые нереализованные расходы)
  const calculatedBudgetCorrection = useMemo(() => {
    // В первый период после установки приложения сравнивать "теоретическую"
    // модель с реальным балансом карты не с чем — дни до установки никто не
    // отслеживал, поэтому любое "расхождение" в этот момент бессмысленно и
    // будет пугать пользователя без причины. Баланс карты на момент
    // онбординга принимается как точка отсчёта без сверки.
    if (state.isFirstTrackedPeriod) {
      return 0;
    }
    const adv = effectiveAdvanceAmount;
    if (!isAdvanceDateReached) {
      return cleanRemainderToday - (totalCheckingBankBalance + adv - unreachedPlannedExpenses);
    } else {
      return cleanRemainderToday - (totalCheckingBankBalance - unreachedPlannedExpenses);
    }
  }, [
    state.isFirstTrackedPeriod,
    isAdvanceDateReached,
    cleanRemainderToday,
    totalCheckingBankBalance,
    effectiveAdvanceAmount,
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

  // Раньше selectedPeriodId навсегда оставался на жёстко заданном '2026-08' —
  // все экраны, использующие activeViewingPeriod (включая "Анализ"), были
  // привязаны к августу 2026 и не переключались сами при смене периода.
  // Теперь при каждом реальном переходе в новый период (когда меняется
  // currentPeriodTemplate.id) выбранный период синхронизируется автоматически.
  // Если пользователь сам выбрал другой период через выпадающий список,
  // currentPeriodTemplate.id при этом не меняется — эффект не перезатирает
  // его ручной выбор.
  useEffect(() => {
    setSelectedPeriodId(currentPeriodTemplate.id);
  }, [currentPeriodTemplate.id]);

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
  addExpenseToDateRef.current = addExpenseToDate;

  const updateExpense = (date: string, expenseId: string, updated: Partial<ExpenseItem>) => {
    setState(prev => {
      const currentLimit = baseDailyNorm > 0 ? baseDailyNorm : 0;
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
      const currentLimit = baseDailyNorm > 0 ? baseDailyNorm : 0;
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

  const addPlannedItem = (item: Omit<PlannedItem, 'id'> & { id?: string }) => {
    const newItem: PlannedItem = {
      ...item,
      id: item.id || `p-${Date.now()}`,
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
        : `Корректировка до аванса (+${formatRubles(state.estimatedAdvanceAmount || 0)}, баланс карт: ${formatRubles(totalCheckingBankBalance)})`;

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
      const newSchedule = rebuildCushionSchedule(prev, {
        isDepositMade: true,
        actualDepositAmount: amount,
        bankAccumulated: newAccumulated,
      });

      return {
        ...prev,
        cushionAccumulated: newAccumulated,
        isCushionDepositDoneThisMonth: true,
        actualCushionDepositThisMonth: amount,
        safetyCushionDeposit: amount,
        cushionMonthlyContribution: amount,
        cushionSchedule: newSchedule,
      };
    });
  };

  const setCushionDepositStatus = (isDeposited: boolean, customAmount?: number) => {
    setState(prev => {
      const salary = prev.currentSalary || 0;
      const normMode = prev.cushionNormMode || 'percent';
      const normPercent = prev.cushionNormPercent ?? 10;
      const normFixedAmount = prev.cushionNormFixedAmount ?? 0;
      const normValue = calculateMonthlyCushionNorm(salary, normMode, normPercent, normFixedAmount);

      const depositAmount = isDeposited
        ? (customAmount !== undefined ? customAmount : (prev.actualCushionDepositThisMonth !== undefined && prev.actualCushionDepositThisMonth > 0 ? prev.actualCushionDepositThisMonth : normValue))
        : 0;

      const newSchedule = rebuildCushionSchedule(prev, {
        isDepositMade: isDeposited,
        actualDepositAmount: isDeposited ? depositAmount : normValue,
      });

      return {
        ...prev,
        isCushionDepositDoneThisMonth: isDeposited,
        actualCushionDepositThisMonth: isDeposited ? depositAmount : normValue,
        safetyCushionDeposit: isDeposited ? depositAmount : normValue,
        cushionMonthlyContribution: isDeposited ? depositAmount : normValue,
        cushionSchedule: newSchedule,
      };
    });
  };

  const updateActualCushionDepositThisMonth = (amount: number) => {
    setState(prev => {
      const cleanAmount = Math.max(0, amount);
      const newSchedule = rebuildCushionSchedule(prev, {
        actualDepositAmount: cleanAmount,
      });

      return {
        ...prev,
        actualCushionDepositThisMonth: cleanAmount,
        safetyCushionDeposit: cleanAmount,
        cushionMonthlyContribution: cleanAmount,
        cushionSchedule: newSchedule,
      };
    });
  };

  const updateCushionNorm = (mode: 'percent' | 'fixed', percent?: number, fixedAmount?: number) => {
    setState(prev => {
      const salary = prev.currentSalary || 0;
      const newPercent = percent !== undefined ? percent : (prev.cushionNormPercent ?? 10);
      const newFixed = fixedAmount !== undefined ? fixedAmount : (prev.cushionNormFixedAmount ?? 0);
      const newMonthlyNorm = calculateMonthlyCushionNorm(salary, mode, newPercent, newFixed);

      const newSchedule = rebuildCushionSchedule(prev, {
        normMode: mode,
        normPercent: newPercent,
        normFixedAmount: newFixed,
      });

      return {
        ...prev,
        isCushionEnabled: true,
        cushionNormMode: mode,
        cushionNormPercent: newPercent,
        cushionNormFixedAmount: newFixed,
        safetyCushionDeposit: newMonthlyNorm,
        cushionMonthlyContribution: newMonthlyNorm,
        cushionSchedule: newSchedule,
      };
    });
  };

  const toggleCushionEnabled = (enabled: boolean) => {
    setState(prev => {
      const salary = prev.currentSalary || 0;
      const mode = prev.cushionNormMode || 'percent';
      const pct = prev.cushionNormPercent ?? 10;
      const fixed = prev.cushionNormFixedAmount ?? 0;
      const monthlyNorm = enabled ? calculateMonthlyCushionNorm(salary, mode, pct, fixed) : 0;

      return {
        ...prev,
        isCushionEnabled: enabled,
        safetyCushionDeposit: monthlyNorm,
        cushionMonthlyContribution: monthlyNorm,
      };
    });
  };

  const updateCurrentSalary = (newSalary: number) => {
    setState(prev => {
      const normMode = prev.cushionNormMode || 'percent';
      const normPercent = prev.cushionNormPercent ?? 10;
      const normFixedAmount = prev.cushionNormFixedAmount ?? 0;
      const newCushionNorm = calculateMonthlyCushionNorm(newSalary, normMode, normPercent, normFixedAmount);

      const newSchedule = rebuildCushionSchedule(prev, {
        currentSalary: newSalary,
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
      const newSchedule = rebuildCushionSchedule(prev, {
        bankAccumulated: newAccumulated,
        actualDepositAmount: prev.actualCushionDepositThisMonth ?? 0,
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
      const newSchedule = rebuildCushionSchedule(prev, {
        bankAccumulated: newAccumulated,
        actualDepositAmount: prev.actualCushionDepositThisMonth ?? 0,
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
      const newSchedule = rebuildCushionSchedule(prev, {
        actualDepositAmount: newDeposit,
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
      const newSchedule = rebuildCushionSchedule(prev, {
        currentSalary: salary,
        actualDepositAmount: prev.actualCushionDepositThisMonth ?? cushionDeposit,
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
      const missingDays: DayRecord[] = [];
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
            normLimit: 0,
            deviation: 0,
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
        0
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
      const actualSalary = amount ?? prev.currentSalary ?? 0;
      const isCushionActive = prev.isCushionEnabled !== false;
      const cushionDeduction = !isCushionActive
        ? 0
        : (prev.cushionNormMode === 'fixed'
            ? (prev.cushionNormFixedAmount || 0)
            : Math.round(actualSalary * ((prev.cushionNormPercent ?? 10) / 100))
          );
      const updatedTotalBudget = Math.round(((prev.previousMonthRemainder || 0) + actualSalary - cushionDeduction) * 100) / 100;

      const salaryIncome: IncomeItem = {
        id: `inc-salary-${Date.now()}`,
        title: 'Зачисление зарплаты',
        amount: actualSalary,
        date: prev.todayDate,
        time: '10:00',
        sourceType: 'salary',
        sourceName: 'Зарплатный счет (Основная работа)',
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
            isDepositMade: isCushionActive,
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
        cushionAccumulated: isCushionActive ? newAccumulated : prev.cushionAccumulated,
        isCushionDepositDoneThisMonth: isCushionActive ? true : false,
        actualCushionDepositThisMonth: cushionDeduction,
        cushionSchedule: updatedCushionSchedule,
        incomes: [salaryIncome, ...(prev.incomes || [])],
      };
    });
  };
  receiveSalaryRef.current = receiveSalary;

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
        const planSum = activeOrders.reduce((sum, o) => sum + o.price, 0);
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
          isPaid: planSum > 0 && deliveredSum > 0 && Math.abs(deliveredSum - planSum) < 0.01,
          autoRenew: true,
          notes: `Учёт заказов ${targetTitle}`,
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
      // Find all potential regular candidate titles
      const allDetected = analyzeBankTransactionsForRegularExpenses(
        prev.pendingBankTransactions || [],
        prev.ignoredMerchants || []
      );
      const regularCandidateTitles = new Set([
        ...allDetected.map(s => s.title.toLowerCase().trim()),
        'фитнес-клуб',
        'интернет и тв',
        'жкх',
        'мобильная связь'
      ]);

      const selectedTitles = new Set(suggestions.map(s => s.title.toLowerCase().trim()));

      // Filter out auto-generated regular items or known regular candidates that are no longer selected
      const retainedPlans = (prev.plannedItems || []).filter(item => {
        const t = item.title.toLowerCase().trim();
        if (item.isAutoGenerated || item.type === 'regular') {
          return selectedTitles.has(t);
        }
        if (regularCandidateTitles.has(t)) {
          return selectedTitles.has(t);
        }
        return true;
      });

      // Раньше статья, совпавшая по названию с уже сохранённой, просто
      // "засчитывалась как есть" и пропускалась — из-за этого правки суммы
      // или дня платежа, сделанные пользователем на экране онбординга,
      // никогда не долетали до сохранённого плана. Теперь уже сохранённая
      // статья ОБНОВЛЯЕТСЯ актуальными значениями из suggestions, а не
      // просто подтверждается как "уже есть".
      const updatedRetained = retainedPlans.map(item => {
        const t = item.title.toLowerCase().trim();
        const match = suggestions.find(s => s.title.toLowerCase().trim() === t);
        if (!match) return item;
        const finalAmount = match.isFixed ? match.amount : (match.predictedAmount || match.amount);
        return {
          ...item,
          amount: finalAmount,
          typicalDay: match.typicalDay,
        };
      });

      const retainedTitles = new Set(updatedRetained.map(p => p.title.toLowerCase().trim()));
      const newPlans: PlannedItem[] = [];

      suggestions.forEach(s => {
        const t = s.title.toLowerCase().trim();
        if (retainedTitles.has(t)) {
          return;
        }

        const finalAmount = s.isFixed ? s.amount : (s.predictedAmount || s.amount);
        newPlans.push({
          id: `plan_auto_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          title: s.title,
          amount: finalAmount,
          spentAmount: 0,
          isProgressTracked: s.category === 'авто' || s.title.toLowerCase().includes('бенз'),
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
        plannedItems: [...updatedRetained, ...newPlans],
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
      const newNormFixed = settings.cushionNormFixedAmount !== undefined ? settings.cushionNormFixedAmount : (prev.cushionNormFixedAmount ?? 0);
      
      const newNormContribution = calculateMonthlyCushionNorm(newSalary, newNormMode, newNormPct, newNormFixed);

      const updatedSchedule = rebuildCushionSchedule(prev, {
        currentSalary: newSalary,
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
    } catch (e: unknown) {
      return { success: false, message: e instanceof Error ? e.message : 'Ошибка при импорте данных' };
    }
  };

  // <-- ДОБАВЛЕНО: функция инициализации из профиля
  const initializeBudgetFromProfile = (
    newProfile: FinancialProfile,
    cushionConfig?: {
      isCushionEnabled?: boolean;
      cushionNormMode?: 'percent' | 'fixed';
      cushionNormPercent?: number;
      cushionNormFixedAmount?: number;
      safetyCushionDeposit?: number;
    }
  ) => {
    setState(prev => {
      const mergedPrev = {
        ...prev,
        ...(cushionConfig || {}),
      };
      const newState = buildInitialStateFromProfile(newProfile, mergedPrev);
      const combined = {
        ...newState,
        creditCards: prev.creditCards && prev.creditCards.length > 0 ? prev.creditCards : newState.creditCards,
        plannedItems: prev.plannedItems && prev.plannedItems.length > 0 ? prev.plannedItems : newState.plannedItems,
        regularExpensesAnalyzed: prev.regularExpensesAnalyzed ?? false,
        ignoredMerchants: prev.ignoredMerchants ?? [],
        ...(cushionConfig !== undefined ? {
          isCushionEnabled: cushionConfig.isCushionEnabled,
          cushionNormMode: cushionConfig.cushionNormMode,
          cushionNormPercent: cushionConfig.cushionNormPercent,
          cushionNormFixedAmount: cushionConfig.cushionNormFixedAmount,
          safetyCushionDeposit: newState.safetyCushionDeposit,
        } : {}),
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

  const setOnboardingTourSeen = (seen: boolean) => {
    setState(prev => ({
      ...prev,
      hasSeenOnboardingTour: seen,
    }));
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
        hasCardBalance,
        realDiscretionaryRemainder,

        // Incomes & Inflow Analysis
        incomes,
        pendingBankIncomes,
        pendingBankIncomesCount,
        pendingBankIncomesTotal,
        totalIncludedAdditionalIncomes,

        // Advance & Correction metrics
        isAdvanceDateReached,
        effectiveAdvanceAmount,
        actualAdvanceDateStr,
        actualAdvanceDay,
        isAdvanceShifted,
        totalFundsWithAdvance,
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
        toggleCushionEnabled,
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
        setOverallCheckingCardBalance,
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
        setOnboardingTourSeen,
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

export { formatRubles } from '../utils/formatters';
export { parseBankNotificationSnippet } from './bankAccounts';

export { getTodayDateString };