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
  ExpenseCategory 
} from '../types';
import { INITIAL_BUDGET_STATE } from '../mockData';
import { useAuth } from './AuthContext';
import { db, doc, setDoc, onSnapshot } from '../lib/firebase';
import { getSalaryDateInfo, SalaryScheduleInfo, generateMonthDays } from '../utils/salaryUtils';

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
  salarySchedule: SalaryScheduleInfo;
  periodEndingRemainderInfo: PeriodEndingRemainderInfo;

  // Banking integration metrics
  totalCheckingBankBalance: number;
  totalSavingsBankBalance: number;
  bankDiscrepancyAmount: number; // Total checking bank balance - cleanRemainderToday
  pendingBankTransactionsCount: number;
  isBankSyncing: boolean;

  // Advance & Correction metrics
  isAdvanceDateReached: boolean;
  unreachedPlannedExpenses: number; // Недостигнутые запланированные расходы (в т.ч. остаток лимита на бензин)
  calculatedBudgetCorrection: number; // Точная формула: (D5 - баланс_карт [ + аванс_если_до_20 ] - недостигнутый_план)

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
  applyBudgetCorrection: (target?: 'planned' | 'today') => { success: boolean; message: string; amount: number };
  updateAdvanceSettings: (estimatedAmount: number, advanceDateDay: number) => void;
  toggleWishlistPurchased: (id: string) => void;
  addWishlistItem: (item: Omit<WishlistItem, 'id'>) => void;
  deleteWishlistItem: (id: string) => void;
  depositToCushion: (amount: number) => void;
  updateBudgetSettings: (budget: number, rollover: number, cushionDeposit: number, salary: number) => void;
  startNewPeriod: (options?: { newSalary?: number; targetDate?: string; customRollover?: number }) => { success: boolean; message: string; rolloverAmount: number };
  ensureDaysForMonth: (year: number, month: number) => void;
  resetToDefaults: () => void;

  // Banking Actions
  approveBankTransaction: (transactionId: string) => void;
  rejectBankTransaction: (transactionId: string) => void;
  approveAllPendingBankTransactions: () => void;
  rejectAllPendingBankTransactions: () => void;
  syncBankAccounts: () => Promise<void>;
  parseAndImportBankSnippet: (snippet: string) => { success: boolean; message: string; transaction?: BankTransaction };
  reconcileCushionWithBank: (bankAccountId?: string) => { success: boolean; message: string; interestAdded: number };
  applyBalanceCorrection: (adjustmentAmount: number, mode: 'expense' | 'budget_adjust', reason?: string) => void;
  updateBankAccountBalance: (accountId: string, newBalance: number) => void;
  addBankAccount: (account: Omit<BankAccount, 'id'>) => void;
  removeBankAccount: (id: string) => void;
}

const STORAGE_KEY = 'limit_dnya_budget_state_v3';
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
        // ensure bank properties exist
        if (!parsed.bankAccounts) parsed.bankAccounts = INITIAL_BUDGET_STATE.bankAccounts;
        if (!parsed.pendingBankTransactions) parsed.pendingBankTransactions = INITIAL_BUDGET_STATE.pendingBankTransactions;
        return parsed;
      }
    } catch {
      // Fallback
    }
    return INITIAL_BUDGET_STATE;
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('today');
  const [selectedDate, setSelectedDate] = useState<string>(state.todayDate);
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

  // 1. Total planned items sum = SUM(B4:B20)
  const totalPlannedSum = useMemo(() => {
    return (state.plannedItems || []).reduce((acc, item) => acc + item.amount, 0);
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

  // 7. E3 "Общий допустимый расход на сегодня" = D5 / D3
  const todayAllowedSpend = useMemo(() => {
    if (daysToSalary <= 0) return cleanRemainderToday;
    return cleanRemainderToday / daysToSalary;
  }, [cleanRemainderToday, daysToSalary]);

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

  // 3. Exact correction calculation according to user's formula:
  // a) If advance date NOT reached:
  //    Correction = cleanRemainderToday - totalCheckingBankBalance + estimatedAdvanceAmount - unreachedPlannedExpenses
  // b) If advance date HAS reached:
  //    Correction = cleanRemainderToday - totalCheckingBankBalance - unreachedPlannedExpenses
  const calculatedBudgetCorrection = useMemo(() => {
    const estimatedAdv = state.estimatedAdvanceAmount || 40000;
    if (!isAdvanceDateReached) {
      return cleanRemainderToday - totalCheckingBankBalance + estimatedAdv - unreachedPlannedExpenses;
    } else {
      return cleanRemainderToday - totalCheckingBankBalance - unreachedPlannedExpenses;
    }
  }, [
    isAdvanceDateReached,
    cleanRemainderToday,
    totalCheckingBankBalance,
    state.estimatedAdvanceAmount,
    unreachedPlannedExpenses
  ]);

  // ==========================================
  // SALARY SCHEDULE & PERIOD ROLLOVER ENGINE
  // ==========================================

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
          return {
            ...d,
            expenses: updatedExpenses,
            spent: newSpent,
            deviation: d.normLimit - newSpent,
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
            deviation: d.normLimit - newSpent,
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
      const newDays = (prev.days || []).map(d => {
        if (d.date === date) {
          deletedExp = (d.expenses || []).find(e => e.id === expenseId);
          const updatedExpenses = (d.expenses || []).filter(e => e.id !== expenseId);
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

  // User's exact correction application
  const applyBudgetCorrection = (target: 'planned' | 'today' = 'planned') => {
    const correctionVal = calculatedBudgetCorrection;
    const absVal = Math.round(Math.abs(correctionVal) * 100) / 100;
    
    if (target === 'planned') {
      setState(prev => {
        const noteText = isAdvanceDateReached
          ? `Корректировка после аванса (20.08). Баланс карт: ${formatRubles(totalCheckingBankBalance)}, Недостигнутый план: ${formatRubles(unreachedPlannedExpenses)}`
          : `Корректировка до аванса (+${formatRubles(state.estimatedAdvanceAmount || 40000)}). Баланс карт: ${formatRubles(totalCheckingBankBalance)}, Недостигнутый план: ${formatRubles(unreachedPlannedExpenses)}`;
        
        const existingIndex = (prev.plannedItems || []).findIndex(
          i => i.title.toLowerCase() === 'корректировка' || i.title.toLowerCase().includes('корректировка бюджета')
        );

        let updatedPlanned = [...(prev.plannedItems || [])];
        if (existingIndex >= 0) {
          const currentAmt = updatedPlanned[existingIndex].amount || 0;
          const targetAmt = Math.max(0, Math.round((currentAmt + correctionVal) * 100) / 100);
          updatedPlanned[existingIndex] = {
            ...updatedPlanned[existingIndex],
            amount: targetAmt,
            isPaid: true,
            notes: noteText,
          };
        } else {
          updatedPlanned.push({
            id: `p-corr-${Date.now()}`,
            title: 'Корректировка',
            amount: absVal,
            category: 'прочее',
            isPaid: true,
            notes: noteText,
          });
        }

        return {
          ...prev,
          plannedItems: updatedPlanned,
        };
      });

      return {
        success: true,
        message: `Баланс синхронизирован! Корректировка учтена в бюджете.`,
        amount: correctionVal,
      };
    } else {
      addExpenseToDate(state.todayDate, {
        title: 'Корректировка бюджета',
        amount: absVal,
        category: 'Корректировка',
        categoryType: 'прочее',
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        isConfirmed: true,
        notes: isAdvanceDateReached ? 'Корректировка после аванса' : 'Корректировка с учетом аванса',
      });

      return {
        success: true,
        message: `Расход-корректировка на ${formatRubles(absVal)} записан в Сегодня!`,
        amount: correctionVal,
      };
    }
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

  const deleteWishlistItem = (id: string) => {
    setState(prev => ({
      ...prev,
      wishlist: (prev.wishlist || []).filter(i => i.id !== id),
    }));
  };

  const depositToCushion = (amount: number) => {
    setState(prev => ({
      ...prev,
      cushionAccumulated: prev.cushionAccumulated + amount,
    }));
  };

  const updateBudgetSettings = (budget: number, rollover: number, cushionDeposit: number, salary: number) => {
    setState(prev => ({
      ...prev,
      total30DaysBudget: budget,
      previousMonthRemainder: rollover,
      safetyCushionDeposit: cushionDeposit,
      currentSalary: salary,
    }));
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
            normLimit: 1155.51,
            deviation: 1155.51,
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

    const nextSalaryInfo = getSalaryDateInfo(nextYear, nextMonth, state.salaryDateDay || 5);
    
    let nextNextMonth = nextMonth + 1;
    let nextNextYear = nextYear;
    if (nextNextMonth > 12) {
      nextNextMonth = 1;
      nextNextYear += 1;
    }
    const nextNextSalaryInfo = getSalaryDateInfo(nextNextYear, nextNextMonth, state.salaryDateDay || 5);

    const newPeriodStartDate = options?.targetDate || nextSalaryInfo.salaryDateStr;
    const newPeriodEndDate = nextNextSalaryInfo.salaryDateStr;

    const formattedStart = `${nextSalaryInfo.actualSalaryDay.toString().padStart(2, '0')}.${nextMonth.toString().padStart(2, '0')}.${nextYear}`;
    const formattedEnd = `${nextNextSalaryInfo.actualSalaryDay.toString().padStart(2, '0')}.${nextNextMonth.toString().padStart(2, '0')}.${nextNextYear}`;
    const newPeriodTitle = `${formattedStart} — ${formattedEnd}`;

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

      const nextSalaryInfo = getSalaryDateInfo(nextYear, nextMonth, state.salaryDateDay || 5);
      const nextSalaryDateStr = nextSalaryInfo.salaryDateStr;

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

    if (/магнит|пятерочка|перекресток|лента|вкусвилл|ашан|дикси|супермаркет|продукты/i.test(text)) {
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
      type: 'expense',
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
        salarySchedule,
        periodEndingRemainderInfo,

        // Banking state
        totalCheckingBankBalance,
        totalSavingsBankBalance,
        bankDiscrepancyAmount,
        pendingBankTransactionsCount,
        isBankSyncing,

        // Advance & Correction metrics
        isAdvanceDateReached,
        unreachedPlannedExpenses,
        calculatedBudgetCorrection,

        // Core actions
        addExpenseToDate,
        updateExpense,
        deleteExpenseFromDate,
        toggleExpenseConfirmed,
        confirmAllExpensesForDate,
        togglePlannedItemPaid,
        addPlannedItem,
        deletePlannedItem,
        updatePlannedItemProgress,
        addSpentToPlannedItem,
        applyBudgetCorrection,
        updateAdvanceSettings,
        toggleWishlistPurchased,
        addWishlistItem,
        deleteWishlistItem,
        depositToCushion,
        updateBudgetSettings,
        startNewPeriod,
        ensureDaysForMonth,
        resetToDefaults,

        // Banking actions
        approveBankTransaction,
        rejectBankTransaction,
        approveAllPendingBankTransactions,
        rejectAllPendingBankTransactions,
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
