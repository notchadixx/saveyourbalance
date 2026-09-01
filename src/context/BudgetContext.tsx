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
  IncomeSourceType
} from '../types';
import { INITIAL_BUDGET_STATE } from '../mockData';
import { useAuth } from './AuthContext';
import { db, doc, setDoc, onSnapshot } from '../lib/firebase';
import { getSalaryDateInfo, SalaryScheduleInfo, generateMonthDays } from '../utils/salaryUtils';
import { 
  PeriodTemplate, 
  generateRollingPeriodTemplates, 
  generatePeriodTemplateForMonth, 
  findPeriodTemplateForDate 
} from '../utils/periodUtils';

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
const THEME_STORAGE_KEY = 'limit_dnya_theme_mode';

const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

export const BudgetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
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
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // ensure bank and income properties exist
        if (!parsed.bankAccounts) parsed.bankAccounts = INITIAL_BUDGET_STATE.bankAccounts;
        if (!parsed.pendingBankTransactions) parsed.pendingBankTransactions = INITIAL_BUDGET_STATE.pendingBankTransactions;
        if (!parsed.incomes) parsed.incomes = INITIAL_BUDGET_STATE.incomes || [];
        return parsed;
      }
    } catch {
      // Fallback
    }
    return INITIAL_BUDGET_STATE;
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('today');
  const [selectedDate, setSelectedDate] = useState<string>(state.todayDate);
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
        setDoc(userDocRef, state, { merge: true })
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
          await setDoc(userDocRef, {
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
  const freeDiscretionaryBudget = useMemo(() => {
    return Math.max(0, state.total30DaysBudget - totalPlannedSum - state.safetyCushionDeposit);
  }, [state.total30DaysBudget, totalPlannedSum, state.safetyCushionDeposit]);

  // 3. E1 "Итого в день" (Базовая норма) = D1 / 30
  const baseDailyNorm = useMemo(() => {
    return freeDiscretionaryBudget > 0 ? (freeDiscretionaryBudget / 30) : 1155.51;
  }, [freeDiscretionaryBudget]);

  // 4. Days index & D3 "Дней до зарплаты"
  const todayIdx = useMemo(() => {
    const idx = (state.days || []).findIndex(d => d.date === state.todayDate);
    return idx >= 0 ? idx : 21;
  }, [state.days, state.todayDate]);

  // Total days in period
  const daysToSalary = useMemo(() => {
    const daysLen = (state.days || []).length;
    const remaining = daysLen - 1 - todayIdx;
    return remaining > 0 ? remaining : 9;
  }, [state.days, todayIdx]);

  // 5. Total spent from start up to today
  const totalPastAndTodaySpent = useMemo(() => {
    return (state.days || [])
      .filter((_, idx) => idx <= todayIdx)
      .reduce((sum, d) => sum + d.spent, 0);
  }, [state.days, todayIdx]);

  // 6. D5 "Чистый остаток на сегодня" = D1 - SUM(H_start : H_today)
  const cleanRemainderToday = useMemo(() => {
    return Math.max(0, freeDiscretionaryBudget - totalPastAndTodaySpent);
  }, [freeDiscretionaryBudget, totalPastAndTodaySpent]);

  // 7. E3 "Общий допустимый расход на сегодня" = D5 / D3 (текущий остаток, деленный на количество дней до зарплаты, гарантированно не 0)
  const todayAllowedSpend = useMemo(() => {
    const daysCount = Math.max(1, daysToSalary);
    const calculated = cleanRemainderToday / daysCount;
    if (calculated > 0) return calculated;
    return baseDailyNorm > 0 ? baseDailyNorm : 1155.51;
  }, [cleanRemainderToday, daysToSalary, baseDailyNorm]);

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

  // 8. Cumulative deviation & J33 "Предварительный остаток"
  const todayRemainingForecast = useMemo(() => {
    let accumulated = 0;
    const daysList = state.days || [];
    for (let i = 0; i <= todayIdx && i < daysList.length; i++) {
      const d = daysList[i];
      accumulated += (baseDailyNorm - d.spent);
    }
    return Math.max(0, accumulated);
  }, [state.days, todayIdx, baseDailyNorm]);

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
  const isAdvanceDateReached = useMemo(() => {
    try {
      const today = new Date(state.todayDate);
      const advDate = new Date(state.advancePaymentDate || '2026-08-20');
      return today.getTime() >= advDate.getTime();
    } catch {
      return true;
    }
  }, [state.todayDate, state.advancePaymentDate]);

  // 2. Unreached planned expenses (Недостигнутые запланированные расходы)
  // For progress-tracked items (e.g. "Бенз"): plan 18 000 ₽, spent 12 000 ₽ -> remaining 6 000 ₽
  // If overspent (e.g. spent 20 000 ₽ on plan 18 000 ₽) -> diff is -2 000 ₽ (перерасход),
  // so it correctly reflects in the correction formula.
  // For other items: if not paid yet, full amount is unreached
  const unreachedPlannedExpenses = useMemo(() => {
    return (state.plannedItems || []).reduce((sum, item) => {
      // Exclude existing 'Корректировка' item from unreached sum
      if (item.title.toLowerCase().includes('корректировка')) {
        return sum;
      }
      if (item.isProgressTracked || item.title.toLowerCase().includes('бенз')) {
        const spent = item.spentAmount ?? 0;
        const diff = item.amount - spent; // Can be negative on overspending!
        return sum + diff;
      } else {
        if (!item.isPaid) {
          return sum + item.amount;
        }
        return sum;
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

  // 1. Dynamic Rolling Period Templates (always includes 12+ months ahead)
  const rollingPeriods = useMemo(() => {
    const refDate = state.todayDate || '2026-08-26';
    const salaryDay = state.salaryDateDay || 5;
    const advanceDay = state.advanceDateDay || 20;
    return generateRollingPeriodTemplates(refDate, 4, 14, salaryDay, advanceDay);
  }, [state.todayDate, state.salaryDateDay, state.advanceDateDay]);

  // 2. Current period template matching state.todayDate
  const currentPeriodTemplate = useMemo(() => {
    const refDate = state.todayDate || '2026-08-26';
    const found = findPeriodTemplateForDate(refDate, rollingPeriods);
    if (found) return found;
    return generatePeriodTemplateForMonth(2026, 8, state.salaryDateDay || 5, state.advanceDateDay || 20, refDate);
  }, [state.todayDate, state.salaryDateDay, state.advanceDateDay, rollingPeriods]);

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
      const parts = (state.todayDate || '2026-08-26').split('-');
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

  // Start new budget period on salary day, rolling over unspent remainder + unrealized plans savings
  const startNewPeriod = (options?: { newSalary?: number; targetDate?: string; customRollover?: number }) => {
    const currentEndingInfo = periodEndingRemainderInfo;
    const rolloverAmount = options?.customRollover !== undefined 
      ? options.customRollover 
      : currentEndingInfo.totalEndingRemainder;

    const newSalary = options?.newSalary ?? state.currentSalary;
    const newCushion = Math.round(newSalary * 0.10); // 10%

    // Calculate current period month & next period
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
      state.advanceDateDay || 20,
      options?.targetDate
    );

    const newPeriodStartDate = options?.targetDate || nextTemplate.startDateStr;
    const newPeriodEndDate = nextTemplate.endDateStr;
    const newPeriodTitle = nextTemplate.formattedLabel;
    const newAdvancePaymentDate = nextTemplate.advanceDateStr;

    // Recalculate total 30-day budget = salary + rollover - cushion
    const newTotalBudget = Math.round((newSalary + rolloverAmount - newCushion) * 100) / 100;

    // Reset progress on recurring items like fuel ("Бенз")
    const updatedPlannedItems = (state.plannedItems || []).map(item => {
      if (item.isProgressTracked || item.title.toLowerCase().includes('бенз')) {
        return {
          ...item,
          spentAmount: 0,
          isPaid: false,
        };
      }
      return {
        ...item,
        isPaid: false,
      };
    });

    // Generate days for the new month
    const generatedDays = generateMonthDays(nextYear, nextMonth, 1155.51);

    setState(prev => {
      const existingDateMap = new Map<string, DayRecord>((prev.days || []).map(d => [d.date, d]));
      generatedDays.forEach(nd => {
        if (!existingDateMap.has(nd.date)) {
          existingDateMap.set(nd.date, nd as DayRecord);
        }
      });

      const updatedDays: DayRecord[] = Array.from(existingDateMap.values()).map(d => ({
        ...d,
        isToday: d.date === newPeriodStartDate,
        isPast: d.date < newPeriodStartDate,
      })).sort((a, b) => a.date.localeCompare(b.date));

      return {
        ...prev,
        periodTitle: newPeriodTitle,
        periodStartDate: newPeriodStartDate,
        periodEndDate: newPeriodEndDate,
        advancePaymentDate: newAdvancePaymentDate,
        isAdvanceReceived: false,
        todayDate: newPeriodStartDate,
        currentSalary: newSalary,
        previousMonthRemainder: rolloverAmount,
        safetyCushionDeposit: newCushion,
        total30DaysBudget: newTotalBudget,
        plannedItems: updatedPlannedItems,
        days: updatedDays,
      };
    });

    setSelectedDate(newPeriodStartDate);

    return {
      success: true,
      message: `Новый период (${newPeriodTitle}) успешно запущен! Переходящий остаток: ${formatRubles(rolloverAmount)}.`,
      rolloverAmount,
    };
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

      const isFuelOrProgress = plannedItem.isProgressTracked || plannedItem.title.toLowerCase().includes('бенз');

      const updatedPlannedItems = (prev.plannedItems || []).map(p => {
        if (p.id !== plannedItemId) return p;

        if (isFuelOrProgress) {
          const currentSpent = p.spentAmount || 0;
          const newSpent = currentSpent + tx.amount;
          return {
            ...p,
            spentAmount: newSpent,
            isPaid: newSpent >= p.amount,
          };
        } else {
          return {
            ...p,
            isPaid: true,
          };
        }
      });

      resultMessage = isFuelOrProgress
        ? `Сумма ${formatRubles(tx.amount)} добавлена к расходу «${plannedItem.title}». Дневной лимит не затронут.`
        : `Статья «${plannedItem.title}» отмечена как оплаченная. Дневной лимит не затронут.`;

      return {
        ...prev,
        plannedItems: updatedPlannedItems,
        pendingBankTransactions: (prev.pendingBankTransactions || []).filter(t => t.id !== transactionId),
      };
    });

    return { success: true, message: resultMessage };
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
