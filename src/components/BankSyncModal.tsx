import React, { useState } from 'react';
import { useBudget, formatRubles } from '../context/BudgetContext';
import { 
  X, 
  Landmark, 
  CreditCard, 
  PiggyBank, 
  RefreshCw, 
  Sparkles, 
  Check, 
  AlertCircle, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  Send,
  MessageSquare,
  Copy,
  FileSpreadsheet,
  CheckCircle2,
  Percent,
  SlidersHorizontal,
  Pencil
} from 'lucide-react';
import { BankAccount, BankId, ExpenseCategory } from '../types';
import { BalanceAuditCard } from './BalanceAuditCard';

interface BankSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const POPULAR_BANKS: Array<{ bankId: BankId; name: string; color: string; defaultRate?: number }> = [
  { bankId: 'tbank', name: 'Т-Банк (Тинькофф)', color: '#fed838' },
  { bankId: 'sber', name: 'СберБанк', color: '#21a038' },
  { bankId: 'alfa', name: 'Альфа-Банк', color: '#ef3124', defaultRate: 13.5 },
  { bankId: 'vtb', name: 'ВТБ', color: '#002882' },
  { bankId: 'raiffeisen', name: 'Райффайзенбанк', color: '#ffee00' },
  { bankId: 'gazprom', name: 'Газпромбанк', color: '#004682' },
];

export const BankSyncModal: React.FC<BankSyncModalProps> = ({ isOpen, onClose }) => {
  const { 
    state, 
    syncBankAccounts, 
    isBankSyncing, 
    totalCheckingBankBalance, 
    totalSavingsBankBalance,
    cleanRemainderToday,
    bankDiscrepancyAmount,
    reconcileCushionWithBank,
    parseAndImportBankSnippet,
    updateBankAccountBalance,
    addBankAccount,
    removeBankAccount,
    pendingBankTransactionsCount,
    setActiveTab
  } = useBudget();

  const [activeSubTab, setActiveSubTab] = useState<'accounts' | 'audit' | 'parser' | 'cushion'>('accounts');
  
  // Quick SMS/Push Parser Text state
  const [parserText, setParserText] = useState('');
  const [parseResult, setParseResult] = useState<{ success: boolean; message: string } | null>(null);

  // New Account State
  const [isAddingBank, setIsAddingBank] = useState(false);
  const [newBankId, setNewBankId] = useState<BankId>('tbank');
  const [newAccountType, setNewAccountType] = useState<'checking' | 'savings'>('checking');
  const [newAccountName, setNewAccountName] = useState('');
  const [newCardMask, setNewCardMask] = useState('•1234');
  const [newBalance, setNewBalance] = useState('');
  const [newInterestRate, setNewInterestRate] = useState('13.5');

  // Inline balance editing
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editingBalanceValue, setEditingBalanceValue] = useState<string>('');

  const handleStartEditBalance = (acc: BankAccount) => {
    setEditingAccountId(acc.id);
    setEditingBalanceValue(String(acc.balance));
  };

  const handleSaveEditBalance = (id: string) => {
    const val = parseFloat(editingBalanceValue);
    if (!isNaN(val)) {
      updateBankAccountBalance(id, val);
    }
    setEditingAccountId(null);
  };

  // Cushion reconcile message
  const [cushionReconcileMsg, setCushionReconcileMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleParseSnippet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parserText.trim()) return;

    const res = parseAndImportBankSnippet(parserText);
    setParseResult(res);
    if (res.success) {
      setParserText('');
    }
  };

  const handleApplyPresetSnippet = (preset: string) => {
    setParserText(preset);
  };

  const handleReconcileCushion = () => {
    const res = reconcileCushionWithBank();
    setCushionReconcileMsg(res.message);
    setTimeout(() => setCushionReconcileMsg(null), 4000);
  };

  const handleCreateBankAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const bankConfig = POPULAR_BANKS.find(b => b.bankId === newBankId) || POPULAR_BANKS[0];
    const parsedBal = parseFloat(newBalance.replace(/\s+/g, '').replace(',', '.')) || 0;
    const parsedRate = newAccountType === 'savings' ? (parseFloat(newInterestRate) || 12) : undefined;

    addBankAccount({
      bankId: newBankId,
      bankName: bankConfig.name.split(' ')[0],
      accountType: newAccountType,
      accountName: newAccountName.trim() || (newAccountType === 'checking' ? 'Дебетовая карта' : 'Накопительный счет'),
      accountNumberMask: newCardMask.startsWith('•') ? newCardMask : `•${newCardMask}`,
      balance: parsedBal,
      interestRate: parsedRate,
      lastSyncedAt: new Date().toISOString(),
      isConnected: true,
      color: bankConfig.color,
    });

    setIsAddingBank(false);
    setNewAccountName('');
    setNewBalance('');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-[var(--color-bg-card)] w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border border-[var(--color-border)] animate-in fade-in slide-in-from-bottom-6 duration-200 max-h-[92vh] overflow-y-auto flex flex-col gap-4">
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[var(--color-text-main)]">
                Синхронизация с банками
              </h3>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                Т-Банк, Сбер, Альфа-Банк, накопительные счета и авто-сверка
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[var(--color-bg-card-subtle)] text-[var(--color-text-muted)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs inside modal */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-[var(--color-bg-card-subtle)] rounded-xl text-xs font-semibold border border-[var(--color-border-subtle)]">
          <button
            onClick={() => setActiveSubTab('accounts')}
            className={`py-2 rounded-lg transition-all text-center ${
              activeSubTab === 'accounts' 
                ? 'bg-[var(--color-bg-card)] text-[var(--color-text-main)] shadow-xs font-bold' 
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
            }`}
          >
            Счета ({state.bankAccounts?.length || 0})
          </button>
          <button
            onClick={() => setActiveSubTab('audit')}
            className={`py-2 rounded-lg transition-all text-center relative ${
              activeSubTab === 'audit' 
                ? 'bg-[var(--color-bg-card)] text-[var(--color-text-main)] shadow-xs font-bold' 
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
            }`}
          >
            Сверка
            {Math.abs(bankDiscrepancyAmount) > 10 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 absolute top-1.5 right-2" />
            )}
          </button>
          <button
            onClick={() => setActiveSubTab('parser')}
            className={`py-2 rounded-lg transition-all text-center relative ${
              activeSubTab === 'parser' 
                ? 'bg-[var(--color-bg-card)] text-[var(--color-text-main)] shadow-xs font-bold' 
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
            }`}
          >
            Чек / SMS
            {pendingBankTransactionsCount > 0 && (
              <span className="ml-1 text-[9px] px-1 py-0.2 rounded-full bg-[var(--color-accent)] text-white dark:text-[#041627]">
                {pendingBankTransactionsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveSubTab('cushion')}
            className={`py-2 rounded-lg transition-all text-center ${
              activeSubTab === 'cushion' 
                ? 'bg-[var(--color-bg-card)] text-[var(--color-text-main)] shadow-xs font-bold' 
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
            }`}
          >
            Подушка
          </button>
        </div>

        {/* TAB 1: Connected Accounts */}
        {activeSubTab === 'accounts' && (
          <div className="flex flex-col gap-3">
            {/* Quick Live Refresh Bar */}
            <div className="flex justify-between items-center bg-[var(--color-bg-card-subtle)] p-3 rounded-2xl border border-[var(--color-border)]">
              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] block">
                  Всего на картах и счетах
                </span>
                <span className="text-base font-extrabold text-[var(--color-text-main)]">
                  {formatRubles(totalCheckingBankBalance + totalSavingsBankBalance)}
                </span>
              </div>

              <button
                onClick={() => syncBankAccounts()}
                disabled={isBankSyncing}
                className="py-2 px-3 bg-[#041627] dark:bg-[#10b981] text-white dark:text-[#041627] rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs active:scale-95 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isBankSyncing ? 'animate-spin' : ''}`} />
                <span>{isBankSyncing ? 'Синхронизация...' : 'Обновить всё'}</span>
              </button>
            </div>

            {/* List of Connected Accounts */}
            <div className="flex flex-col gap-2">
              {(state.bankAccounts || []).map(acc => {
                const isSavings = acc.accountType === 'savings';
                return (
                  <div
                    key={acc.id}
                    className="p-3.5 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)] flex items-center justify-between group shadow-2xs hover:border-[var(--color-border-strong)] transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-xs"
                        style={{ backgroundColor: acc.bankId === 'tbank' ? '#e5c010' : acc.bankId === 'sber' ? '#21a038' : acc.bankId === 'alfa' ? '#ef3124' : '#002882' }}
                      >
                        {isSavings ? <PiggyBank className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-[var(--color-text-main)]">
                            {acc.bankName}
                          </span>
                          <span className="text-xs text-[var(--color-text-muted)] font-mono">
                            {acc.accountNumberMask}
                          </span>
                          {isSavings && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-500 font-bold">
                              {acc.interestRate || 13.5}%
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--color-text-secondary)]">
                          {acc.accountName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {editingAccountId === acc.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="any"
                            value={editingBalanceValue}
                            onChange={(e) => setEditingBalanceValue(e.target.value)}
                            className="w-24 px-2 py-1 bg-[var(--color-bg-card)] border border-[var(--color-accent)] rounded-lg text-xs font-bold text-[var(--color-text-main)] focus:outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveEditBalance(acc.id)}
                            className="p-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                            title="Сохранить"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingAccountId(null)}
                            className="p-1 rounded-lg bg-[var(--color-bg-card-muted)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
                            title="Отмена"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="text-right">
                            <span className="text-sm font-extrabold text-[var(--color-text-main)]">
                              {formatRubles(acc.balance)}
                            </span>
                            <span className="block text-[10px] text-emerald-500 font-medium">
                              Синхронизировано ✓
                            </span>
                          </div>

                          <button
                            onClick={() => handleStartEditBalance(acc)}
                            className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-all cursor-pointer"
                            title="Изменить баланс вручную"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => removeBankAccount(acc.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-all cursor-pointer"
                            title="Удалить счет"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add bank button / form */}
            {!isAddingBank ? (
              <button
                onClick={() => setIsAddingBank(true)}
                className="w-full py-3 rounded-2xl border border-dashed border-[var(--color-border-strong)] hover:border-[var(--color-accent)] text-[var(--color-text-main)] text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>ПОДКЛЮЧИТЬ БАНК / КАРТУ</span>
              </button>
            ) : (
              <form onSubmit={handleCreateBankAccount} className="p-4 rounded-2xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border)] flex flex-col gap-3 animate-in fade-in">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-main)]">
                    Новый счет / карта
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsAddingBank(false)}
                    className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
                  >
                    Отмена
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block mb-1">Банк</label>
                    <select
                      value={newBankId}
                      onChange={(e) => setNewBankId(e.target.value as BankId)}
                      className="w-full text-xs font-semibold p-2 rounded-xl bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-main)]"
                    >
                      {POPULAR_BANKS.map(b => (
                        <option key={b.bankId} value={b.bankId}>{b.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block mb-1">Тип счета</label>
                    <select
                      value={newAccountType}
                      onChange={(e) => setNewAccountType(e.target.value as any)}
                      className="w-full text-xs font-semibold p-2 rounded-xl bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-main)]"
                    >
                      <option value="checking">Дебетовая карта / Расчетный</option>
                      <option value="savings">Накопительный счет (Подушка)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block mb-1">Маска карты / счета</label>
                    <input
                      type="text"
                      value={newCardMask}
                      onChange={(e) => setNewCardMask(e.target.value)}
                      placeholder="•4821"
                      className="w-full text-xs font-semibold p-2 rounded-xl bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-main)]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block mb-1">Текущий баланс (₽)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={newBalance}
                      onChange={(e) => setNewBalance(e.target.value)}
                      placeholder="25000"
                      className="w-full text-xs font-semibold p-2 rounded-xl bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-main)]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="py-2.5 bg-[#006d37] dark:bg-[#10b981] text-white dark:text-[#041627] rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  Добавить счет в мониторинг
                </button>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: Balance Audit & Discrepancy Correction */}
        {activeSubTab === 'audit' && (
          <div className="flex flex-col gap-3">
            <BalanceAuditCard onOpenBankModal={() => {}} />

            <div className="p-4 rounded-2xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] space-y-2">
              <span className="font-bold text-[var(--color-text-main)] block">
                Как работает автокоррекция баланса:
              </span>
              <p>
                1. Приложение суммирует доступный остаток на ваших подключенных картах (Т-Банк, Сбер).
              </p>
              <p>
                2. Сравнивает его с формульным остатком <strong>D5 (Чистый остаток на сегодня)</strong> из вашей таблицы бюджета.
              </p>
              <p>
                3. Если возникает разница (например, если вы сняли наличные, оплатили неучтенную мелочь или получили кэшбэк), приложение предлагает в 1 клик внести точную корректировку.
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: SMS & Push Parser */}
        {activeSubTab === 'parser' && (
          <div className="flex flex-col gap-3">
            <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-[var(--color-text-main)]">
              <span className="font-bold block mb-0.5">Вставьте текст SMS или Push-уведомления банка:</span>
              <span className="text-[11px] text-[var(--color-text-muted)]">
                Парсер автоматически определит сумму, банк, мерчанта, категорию и направит в «Подтверждение трат».
              </span>
            </div>

            <form onSubmit={handleParseSnippet} className="flex flex-col gap-2">
              <textarea
                value={parserText}
                onChange={(e) => setParserText(e.target.value)}
                placeholder="Пример: СберБанк: Покупка 450р Магнит. Баланс 6240р"
                rows={3}
                className="w-full text-xs font-medium p-3 rounded-2xl bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-main)] focus:ring-1 focus:ring-[var(--color-accent)] focus:outline-none"
              />

              <div className="flex justify-between items-center">
                <span className="text-[10px] text-[var(--color-text-muted)] font-medium">
                  Быстрые примеры для проверки:
                </span>
                <button
                  type="submit"
                  className="py-2 px-4 rounded-xl bg-[#041627] dark:bg-[#10b981] text-white dark:text-[#041627] font-bold text-xs shadow-xs active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Распознать чек</span>
                </button>
              </div>

              {/* Preset buttons */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  'СберБанк: Покупка 850р Перекресток. Баланс 5390р',
                  'Т-Банк. Оплата 1250.00 ₽, Surf Coffee. Карта •4821',
                  'Т-Банк: Перевод 2500р от Александра В. Баланс 34500р',
                  'СберБанк: Зачисление 4200р возврат долга. Баланс 18900р',
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPresetSnippet(preset)}
                    className="text-[10px] py-1 px-2 rounded-lg bg-[var(--color-bg-card-subtle)] hover:bg-[var(--color-bg-card-muted)] border border-[var(--color-border)] text-[var(--color-text-secondary)] truncate max-w-[200px]"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </form>

            {parseResult && (
              <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                parseResult.success 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300' 
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
              }`}>
                {parseResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{parseResult.message}</span>
              </div>
            )}

            {/* Jump to confirmation screen button */}
            <button
              onClick={() => {
                onClose();
                setActiveTab('confirm-expenses');
              }}
              className="w-full py-2.5 rounded-xl bg-[var(--color-accent-badge-bg)] text-[var(--color-accent)] font-bold text-xs border border-[var(--color-accent-badge-border)] text-center transition-colors hover:opacity-90"
            >
              Перейти в экран «Подтверждение трат» →
            </button>
          </div>
        )}

        {/* TAB 4: Safety Cushion Savings Sync */}
        {activeSubTab === 'cushion' && (
          <div className="flex flex-col gap-3">
            <div className="p-4 rounded-2xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border)] flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] block">
                    Накопительный счет в банке
                  </span>
                  <h4 className="text-base font-extrabold text-[var(--color-text-main)]">
                    Альфа-Счет (13.5% годовых) •3312
                  </h4>
                </div>
                <span className="text-base font-black text-rose-500">
                  {formatRubles(totalSavingsBankBalance)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[var(--color-border-subtle)]">
                <div>
                  <span className="text-[10px] text-[var(--color-text-muted)] block">В приложении (подушка)</span>
                  <span className="font-bold text-[var(--color-text-main)]">{formatRubles(state.cushionAccumulated)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--color-text-muted)] block">Капитализация процентов</span>
                  <span className="font-bold text-emerald-500">+4.53 ₽/мес</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleReconcileCushion}
              className="w-full py-3 rounded-xl bg-[#006d37] dark:bg-[#10b981] text-white dark:text-[#041627] font-bold text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>Сверить с накопительным счетом и учесть проценты</span>
            </button>

            {cushionReconcileMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{cushionReconcileMsg}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
