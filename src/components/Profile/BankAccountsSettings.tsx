import React, { useState } from 'react';
import { useBudget, formatRubles } from '../../context/BudgetContext';
import { 
  Landmark, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  CreditCard, 
  PiggyBank, 
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import { BankAccount, BankId } from '../../types';
import { BankSyncModal } from '../BankSyncModal';

interface BankAccountsSettingsProps {
  onBack: () => void;
  showToast: (msg: string) => void;
}

export const BankAccountsSettings: React.FC<BankAccountsSettingsProps> = ({ onBack, showToast }) => {
  const { 
    state, 
    syncBankAccounts, 
    isBankSyncing, 
    updateBankAccountBalance, 
    removeBankAccount,
    totalCheckingBankBalance,
    totalSavingsBankBalance
  } = useBudget();

  const [isBankSyncModalOpen, setIsBankSyncModalOpen] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editBalance, setEditBalance] = useState('');

  const accounts = state.bankAccounts || [];

  const handleStartEdit = (account: BankAccount) => {
    setEditingAccountId(account.id);
    setEditBalance(String(account.balance));
  };

  const handleSaveEdit = (id: string) => {
    const b = parseFloat(editBalance);
    if (!isNaN(b)) {
      updateBankAccountBalance(id, b);
      showToast('Баланс счета обновлен');
    }
    setEditingAccountId(null);
  };

  const handleSyncAll = async () => {
    await syncBankAccounts();
    showToast('Счета успешно синхронизированы с банками');
  };

  return (
    <div className="space-y-5">
      {/* Header Summary */}
      <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 border border-[var(--color-border)] shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase block">
              Текущие счета (дебет):
            </span>
            <span className="text-xl font-extrabold text-[var(--color-text-main)] block">
              {formatRubles(totalCheckingBankBalance)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncAll}
              disabled={isBankSyncing}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center gap-1.5 hover:bg-blue-500/20 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isBankSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Синхронизировать</span>
            </button>

            <button
              onClick={() => setIsBankSyncModalOpen(true)}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-500/20 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Подключить банк</span>
            </button>
          </div>
        </div>

        {totalSavingsBankBalance > 0 && (
          <div className="pt-2 border-t border-[var(--color-border-subtle)] flex items-center justify-between text-xs">
            <span className="text-[var(--color-text-muted)]">Накопительные счета & подушка:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {formatRubles(totalSavingsBankBalance)}
            </span>
          </div>
        )}
      </div>

      {/* List of Connected Accounts */}
      <div className="space-y-3">
        {accounts.length === 0 ? (
          <div className="bg-[var(--color-bg-card)] rounded-2xl p-6 border border-[var(--color-border)] text-center text-xs text-[var(--color-text-muted)]">
            Нет подключенных банковских счетов. Нажмите «Подключить банк».
          </div>
        ) : (
          accounts.map((acc) => {
            const isEditing = editingAccountId === acc.id;

            return (
              <div
                key={acc.id}
                className="bg-[var(--color-bg-card)] rounded-2xl p-4 border border-[var(--color-border)] shadow-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                      {acc.accountType === 'savings' ? <PiggyBank className="w-5 h-5" /> : <Landmark className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[var(--color-text-main)]">
                          {acc.accountName || acc.bankName}
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {acc.accountNumberMask}
                        </span>
                      </div>
                      <span className="text-[10px] text-[var(--color-text-muted)]">
                        {acc.bankName} • {acc.accountType === 'savings' ? 'Накопительный счет' : 'Дебетовая карта'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleStartEdit(acc)}
                      className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-card-subtle)]"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Отключить счет «${acc.accountName || acc.bankName}»?`)) {
                          removeBankAccount(acc.id);
                          showToast('Счет отключен');
                        }
                      }}
                      className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-500/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border-subtle)]">
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {acc.lastSyncedAt ? `Обновлено: ${new Date(acc.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Ручной ввод'}
                  </span>

                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={editBalance}
                        onChange={(e) => setEditBalance(e.target.value)}
                        className="w-28 px-2 py-1 rounded-lg bg-[var(--color-bg-card-subtle)] border text-xs font-bold"
                        placeholder="Баланс"
                      />
                      <button
                        onClick={() => handleSaveEdit(acc.id)}
                        className="p-1 rounded-lg bg-emerald-500/20 text-emerald-600"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-sm font-extrabold text-[var(--color-text-main)]">
                      {formatRubles(acc.balance)}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Full Bank Sync Modal */}
      <BankSyncModal
        isOpen={isBankSyncModalOpen}
        onClose={() => setIsBankSyncModalOpen(false)}
      />
    </div>
  );
};
