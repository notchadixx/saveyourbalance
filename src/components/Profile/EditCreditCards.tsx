import React, { useState } from 'react';
import { useBudget, formatRubles } from '../../context/BudgetContext';
import { 
  CreditCard as CreditCardIcon, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  ShieldCheck, 
  TrendingDown, 
  Calendar,
  AlertTriangle,
  X
} from 'lucide-react';
import { CreditCard, CreditCardStrategy } from '../../types';

interface EditCreditCardsProps {
  onBack: () => void;
  showToast: (msg: string) => void;
}

export const EditCreditCards: React.FC<EditCreditCardsProps> = ({ onBack, showToast }) => {
  const { 
    state, 
    addCreditCard, 
    updateCreditCard, 
    removeCreditCard 
  } = useBudget();

  const creditCards = state.creditCards || [];

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);

  // Form fields
  const [bankName, setBankName] = useState('');
  const [cardMask, setCardMask] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [currentDebt, setCurrentDebt] = useState('');
  const [graceDate, setGraceDate] = useState('2026-09-20');
  const [strategy, setStrategy] = useState<CreditCardStrategy>('debt');
  const [monthlyPayment, setMonthlyPayment] = useState('');

  const openAddModal = () => {
    setEditingCard(null);
    setBankName('Т-Банк Platinum');
    setCardMask('•4589');
    setCreditLimit('150000');
    setCurrentDebt('42000');
    setGraceDate('2026-09-20');
    setStrategy('debt');
    setMonthlyPayment('7000');
    setIsModalOpen(true);
  };

  const openEditModal = (card: CreditCard) => {
    setEditingCard(card);
    setBankName(card.bankName);
    setCardMask(card.cardMask);
    setCreditLimit(String(card.creditLimit));
    setCurrentDebt(String(card.currentDebt));
    setGraceDate(card.gracePeriodEndDate || '2026-09-20');
    setStrategy(card.strategy);
    setMonthlyPayment(String(card.monthlyPayment || ''));
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName.trim()) return;

    const numLimit = parseFloat(creditLimit) || 0;
    const numDebt = parseFloat(currentDebt) || 0;
    const numPayment = strategy === 'debt' ? (parseFloat(monthlyPayment) || Math.round(numDebt / 6)) : 0;

    if (editingCard) {
      updateCreditCard(editingCard.id, {
        bankName: bankName.trim(),
        cardMask: cardMask.trim(),
        creditLimit: numLimit,
        currentDebt: numDebt,
        gracePeriodEndDate: graceDate,
        strategy,
        monthlyPayment: numPayment,
      });
      showToast(`Карта «${bankName}» обновлена`);
    } else {
      addCreditCard({
        bankName: bankName.trim(),
        cardMask: cardMask.trim() || '•0000',
        creditLimit: numLimit,
        currentDebt: numDebt,
        initialDebt: numDebt,
        gracePeriodEndDate: graceDate,
        strategy,
        monthlyPayment: numPayment,
      });
      showToast(`Кредитная карта «${bankName}» добавлена`);
    }

    setIsModalOpen(false);
  };

  const totalDebt = creditCards.reduce((acc, c) => acc + (c.currentDebt || 0), 0);
  const totalLimit = creditCards.reduce((acc, c) => acc + (c.creditLimit || 0), 0);

  return (
    <div className="space-y-5">
      {/* Summary Header */}
      <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 border border-[var(--color-border)] shadow-xs flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase block">
            Суммарная задолженность
          </span>
          <span className="text-xl font-extrabold text-[var(--color-text-main)] block mt-0.5">
            {formatRubles(totalDebt)}
          </span>
          <span className="text-[11px] text-[var(--color-text-muted)]">
            из {formatRubles(totalLimit)} общего лимита ({creditCards.length} карт)
          </span>
        </div>

        <button
          onClick={openAddModal}
          className="p-2 sm:px-3 sm:py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-bold flex items-center gap-1.5 hover:bg-purple-500/20 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Добавить карту</span>
        </button>
      </div>

      {/* Credit Cards List */}
      <div className="space-y-3">
        {creditCards.length === 0 ? (
          <div className="bg-[var(--color-bg-card)] rounded-2xl p-6 border border-[var(--color-border)] text-center text-xs text-[var(--color-text-muted)]">
            Нет добавленных кредитных карт. Нажмите «Добавить карту».
          </div>
        ) : (
          creditCards.map((card) => {
            const isDebtStrategy = card.strategy === 'debt';
            const progress = card.creditLimit > 0 ? Math.min(100, Math.round((card.currentDebt / card.creditLimit) * 100)) : 0;

            return (
              <div
                key={card.id}
                className="bg-[var(--color-bg-card)] rounded-2xl p-4 border border-[var(--color-border)] shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                      <CreditCardIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[var(--color-text-main)]">
                          {card.bankName}
                        </span>
                        <span className="text-xs font-semibold text-[var(--color-text-muted)]">
                          {card.cardMask}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border inline-block mt-0.5 ${
                        isDebtStrategy
                          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                      }`}>
                        {isDebtStrategy ? '📉 Долговая стратегия' : '⚡ Грейс-оптимизатор'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(card)}
                      className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-card-subtle)]"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Удалить кредитную карту «${card.bankName}»?`)) {
                          removeCreditCard(card.id);
                          showToast('Карта удалена');
                        }
                      }}
                      className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--color-text-muted)]">Задолженность:</span>
                    <span className="font-extrabold text-[var(--color-text-main)]">
                      {formatRubles(card.currentDebt)} / {formatRubles(card.creditLimit)}
                    </span>
                  </div>
                  <div className="w-full bg-[var(--color-bg-card-subtle)] h-2 rounded-full overflow-hidden border border-[var(--color-border-subtle)]">
                    <div
                      className={`h-full rounded-full transition-all ${
                        progress > 80 ? 'bg-rose-500' : progress > 50 ? 'bg-amber-500' : 'bg-purple-500'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Additional Details */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-[var(--color-border-subtle)]">
                  <div>
                    <span className="text-[10px] text-[var(--color-text-muted)] block">
                      Грейс-период до:
                    </span>
                    <span className="font-semibold text-[var(--color-text-main)]">
                      {card.gracePeriodEndDate || '—'}
                    </span>
                  </div>
                  {isDebtStrategy && (
                    <div>
                      <span className="text-[10px] text-[var(--color-text-muted)] block">
                        Ежемесячный платёж:
                      </span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">
                        {formatRubles(card.monthlyPayment || 0)}/мес
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Card Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] shadow-xl w-full max-w-md p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--color-text-main)]">
                {editingCard ? 'Редактировать карту' : 'Новая кредитная карта'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                  Название банка / карты
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Т-Банк Platinum"
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)] text-xs font-bold text-[var(--color-text-main)]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                    Маска карты
                  </label>
                  <input
                    type="text"
                    value={cardMask}
                    onChange={(e) => setCardMask(e.target.value)}
                    placeholder="•4589"
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)] text-xs font-bold text-[var(--color-text-main)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                    Кредитный лимит (₽)
                  </label>
                  <input
                    type="number"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                    placeholder="150000"
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)] text-xs font-bold text-[var(--color-text-main)]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                    Текущий долг (₽)
                  </label>
                  <input
                    type="number"
                    value={currentDebt}
                    onChange={(e) => setCurrentDebt(e.target.value)}
                    placeholder="42000"
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)] text-xs font-bold text-[var(--color-text-main)]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                    Конец грейса
                  </label>
                  <input
                    type="date"
                    value={graceDate}
                    onChange={(e) => setGraceDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)] text-xs font-bold text-[var(--color-text-main)]"
                  />
                </div>
              </div>

              {/* Strategy selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)]">
                  Стратегия управления картой
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStrategy('debt')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      strategy === 'debt'
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-800 dark:text-amber-200'
                        : 'bg-[var(--color-bg-card-subtle)] border-[var(--color-border-subtle)] text-[var(--color-text-muted)]'
                    }`}
                  >
                    Долговая
                  </button>
                  <button
                    type="button"
                    onClick={() => setStrategy('optimizer')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      strategy === 'optimizer'
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-800 dark:text-emerald-200'
                        : 'bg-[var(--color-bg-card-subtle)] border-[var(--color-border-subtle)] text-[var(--color-text-muted)]'
                    }`}
                  >
                    Оптимизатор
                  </button>
                </div>
              </div>

              {strategy === 'debt' && (
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                    Ежемесячный платёж для погашения (₽/мес)
                  </label>
                  <input
                    type="number"
                    value={monthlyPayment}
                    onChange={(e) => setMonthlyPayment(e.target.value)}
                    placeholder="7000"
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)] text-xs font-bold text-[var(--color-text-main)]"
                  />
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
                    Будет автоматически включен в плановые статьи бюджета
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold text-[var(--color-text-muted)]"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs"
                >
                  {editingCard ? 'Сохранить изменения' : 'Добавить карту'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
