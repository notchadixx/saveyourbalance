import React, { useState, useMemo, useCallback } from 'react';
import {
  BankAccount,
  BankTransaction,
  BudgetState,
  ExpenseCategory,
  ExpenseItem,
  IncomeItem,
} from '../types';
import { formatRubles } from '../utils/formatters';

export interface ParsedBankNotification {
  success: boolean;
  message: string;
  transaction?: BankTransaction;
  detectedBalance?: {
    bankAccountId: string;
    balance: number;
  };
}

/**
 * Smart SMS / Push text parser for Russian banks.
 * Extracts amounts, detects bank, category, merchant, and optional balance.
 */
export function parseBankNotificationSnippet(snippet: string, todayDate: string): ParsedBankNotification {
  if (!snippet || snippet.trim().length === 0) {
    return { success: false, message: 'Пустой текст уведомления' };
  }

  const text = snippet.trim();

  // Amount extraction: e.g. 450р, 1 250.00 ₽, Покупка 320.50 RUB
  const amountMatch =
    text.match(/(?:покупка|оплата|списание|перевод|чек|сумма)?\s*[:\-]?\s*([0-9\s]+(?:[.,][0-9]{1,2})?)\s*(?:₽|руб|р\b|rub)/i) ||
    text.match(/([0-9]+(?:[.,][0-9]{1,2})?)\s*(?:₽|руб|р\b)/i);

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
    date: todayDate,
    time: now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    status: 'pending',
    rawSnippet: snippet,
  };

  // If balance was in message, extract it
  let detectedBalance: { bankAccountId: string; balance: number } | undefined;
  const balanceMatch = text.match(/баланс[:\s]*([0-9\s]+(?:[.,][0-9]{1,2})?)/i);
  if (balanceMatch) {
    const parsedBal = parseFloat(balanceMatch[1].replace(/\s+/g, '').replace(',', '.'));
    if (!isNaN(parsedBal)) {
      detectedBalance = {
        bankAccountId,
        balance: parsedBal,
      };
    }
  }

  return {
    success: true,
    message: `Распознан чек на ${formatRubles(amount)} (${detectedBank}). Поступил в экран подтверждения.`,
    transaction: newTx,
    detectedBalance,
  };
}

export interface UseBankAccountsOptions {
  state: BudgetState;
  setState: React.Dispatch<React.SetStateAction<BudgetState>>;
  cleanRemainderToday: number;
  addExpenseToDate: (date: string, expense: Omit<ExpenseItem, 'id'>) => void;
  receiveSalary: (amount?: number) => void;
}

export function useBankAccounts({
  state,
  setState,
  cleanRemainderToday,
  addExpenseToDate,
  receiveSalary,
}: UseBankAccountsOptions) {
  const [isBankSyncing, setIsBankSyncing] = useState(false);

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

  // ==========================================
  // BANKING ACTIONS & SYNCHRONIZATION
  // ==========================================

  // 1. Approve bank transaction -> feeds into today's (or target date) expenses
  const approveBankTransaction = useCallback((transactionId: string) => {
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
  }, [setState, receiveSalary]);

  // 2. Reject / dismiss bank transaction
  const rejectBankTransaction = useCallback((transactionId: string) => {
    setState(prev => ({
      ...prev,
      pendingBankTransactions: (prev.pendingBankTransactions || []).filter(t => t.id !== transactionId),
    }));
  }, [setState]);

  // 2b. Confirm bank transaction as Planned Expense (does NOT deduct from 'Сегодня', updates PlannedItem)
  const confirmPlannedBankTransaction = useCallback((transactionId: string, plannedItemId: string): { success: boolean; message: string } => {
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
        isPaid = true;
        isProgressTracked = false;
        resultMessage = `Сумма ${formatRubles(tx.amount)} совпала с планом «${plannedItem.title}». Статья выполнена и отмечена как оплаченная ✓`;
      } else if (newSpent < planAmount) {
        isPaid = false;
        isProgressTracked = true;
        resultMessage = `Сумма ${formatRubles(tx.amount)} добавлена в шкалу расхода «${plannedItem.title}». Накоплено ${formatRubles(newSpent)} из ${formatRubles(planAmount)}.`;
      } else {
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
  }, [setState]);

  // 3. Approve all pending bank transactions
  const approveAllPendingBankTransactions = useCallback(() => {
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
  }, [setState]);

  const rejectAllPendingBankTransactions = useCallback(() => {
    setState(prev => ({
      ...prev,
      pendingBankTransactions: [],
    }));
  }, [setState]);

  // 4. Accept bank income into budget (increases total30DaysBudget and adds to incomes history)
  const acceptBankIncomeToBudget = useCallback((transactionId: string, customCategory?: string, customTitle?: string) => {
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
  }, [setState]);

  // 5. Reject incoming bank transaction (dismiss without adding to budget)
  const rejectBankIncome = useCallback((transactionId: string) => {
    setState(prev => ({
      ...prev,
      pendingBankTransactions: (prev.pendingBankTransactions || []).filter(t => t.id !== transactionId),
    }));
  }, [setState]);

  // 6. Confirm incoming transaction (legacy compatibility wrapper)
  const confirmPendingIncome = useCallback((transactionId: string, isIncome: boolean) => {
    if (isIncome) {
      acceptBankIncomeToBudget(transactionId);
    } else {
      rejectBankIncome(transactionId);
    }
  }, [acceptBankIncomeToBudget, rejectBankIncome]);

  // 7. Bank Accounts Timestamp Refresh
  const syncBankAccounts = useCallback(async () => {
    setIsBankSyncing(true);
    await new Promise(r => setTimeout(r, 600));

    setState(prev => {
      const nowIso = new Date().toISOString();
      const updatedAccounts = (prev.bankAccounts || []).map(acc => ({
        ...acc,
        lastSyncedAt: nowIso,
      }));

      return {
        ...prev,
        bankAccounts: updatedAccounts,
        lastBankSyncTimestamp: nowIso,
      };
    });

    setIsBankSyncing(false);
  }, [setState]);

  // 8. Smart SMS / Push text parser for Russian banks
  const parseAndImportBankSnippet = useCallback((snippet: string) => {
    const parseResult = parseBankNotificationSnippet(snippet, state.todayDate);
    if (!parseResult.success || !parseResult.transaction) {
      return { success: false, message: parseResult.message };
    }

    const { transaction: newTx, detectedBalance } = parseResult;

    if (detectedBalance) {
      setState(prev => ({
        ...prev,
        bankAccounts: (prev.bankAccounts || []).map(acc =>
          acc.id === detectedBalance.bankAccountId
            ? { ...acc, balance: detectedBalance.balance, lastSyncedAt: new Date().toISOString() }
            : acc
        ),
        pendingBankTransactions: [newTx, ...(prev.pendingBankTransactions || [])],
      }));
    } else {
      setState(prev => ({
        ...prev,
        pendingBankTransactions: [newTx, ...(prev.pendingBankTransactions || [])],
      }));
    }

    return {
      success: true,
      message: parseResult.message,
      transaction: newTx,
    };
  }, [state.todayDate, setState]);

  // 9. Reconcile Cushion with Savings Bank Account
  const reconcileCushionWithBank = useCallback((bankAccountId?: string) => {
    const savingsAcc = (state.bankAccounts || []).find(a =>
      bankAccountId ? a.id === bankAccountId : a.accountType === 'savings' && a.isConnected
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
            capitalization: diff > 0 ? item.capitalization + diff : item.capitalization,
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
      message:
        diff > 0
          ? `Сверка завершена. Зачислена капитализация процентов: +${formatRubles(diff)}`
          : `Баланс подушки синхронизирован с банком (${formatRubles(bankBalance)})`,
      interestAdded: Math.max(0, diff),
    };
  }, [state.bankAccounts, state.cushionAccumulated, setState]);

  // 10. Apply Balance Correction (Auto-align budget with actual bank balance)
  const applyBalanceCorrection = useCallback((adjustmentAmount: number, mode: 'expense' | 'budget_adjust', reason?: string) => {
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
  }, [addExpenseToDate, state.todayDate, setState]);

  // 11. Bank account management
  const updateBankAccountBalance = useCallback((accountId: string, newBalance: number) => {
    setState(prev => ({
      ...prev,
      bankAccounts: (prev.bankAccounts || []).map(acc =>
        acc.id === accountId ? { ...acc, balance: newBalance, lastSyncedAt: new Date().toISOString() } : acc
      ),
    }));
  }, [setState]);

  // Set overall checking balance directly so that totalCheckingBankBalance equals EXACTLY newBalance
  const setOverallCheckingCardBalance = useCallback((newBalance: number) => {
    setState(prev => {
      const accounts = prev.bankAccounts || [];
      const checkingIndices = accounts
        .map((acc, i) => (acc.accountType === 'checking' && acc.isConnected ? i : -1))
        .filter(i => i !== -1);

      if (checkingIndices.length === 0) {
        const newAcc: BankAccount = {
          id: 'bank-tbank-card',
          bankId: 'tbank',
          bankName: 'Основная карта',
          accountType: 'checking',
          accountName: 'Основная карта',
          accountNumberMask: '•4821',
          balance: newBalance,
          lastSyncedAt: new Date().toISOString(),
          isConnected: true,
          color: '#fed838',
        };
        return {
          ...prev,
          bankAccounts: [...accounts, newAcc],
        };
      }

      // Update primary checking account to EXACTLY newBalance, and zero out any other secondary checking accounts
      const updated = accounts.map((acc, index) => {
        if (index === checkingIndices[0]) {
          return { ...acc, balance: newBalance, lastSyncedAt: new Date().toISOString() };
        }
        if (acc.accountType === 'checking') {
          return { ...acc, balance: 0, lastSyncedAt: new Date().toISOString() };
        }
        return acc;
      });

      return {
        ...prev,
        bankAccounts: updated,
      };
    });
  }, [setState]);

  const addBankAccount = useCallback((account: Omit<BankAccount, 'id'>) => {
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
  }, [setState]);

  const removeBankAccount = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      bankAccounts: (prev.bankAccounts || []).filter(acc => acc.id !== id),
    }));
  }, [setState]);

  return {
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
  };
}
