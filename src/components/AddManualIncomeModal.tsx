import React, { useState, useEffect } from 'react';
import { useBudget, formatRubles } from '../context/BudgetContext';
import { 
  X, 
  Plus, 
  Coins, 
  Banknote, 
  CreditCard, 
  ArrowDownLeft, 
  Briefcase, 
  Gift, 
  Handshake, 
  Tag, 
  Sparkles,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { IncomeSourceType } from '../types';

interface AddManualIncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSource?: IncomeSourceType;
}

interface SourceOption {
  type: IncomeSourceType;
  label: string;
  icon: React.ReactNode;
  defaultName: string;
  defaultCategory: string;
}

const SOURCE_OPTIONS: SourceOption[] = [
  { 
    type: 'cash', 
    label: 'Наличные', 
    icon: <Banknote className="w-4 h-4 text-amber-500" />,
    defaultName: 'Наличные',
    defaultCategory: 'Наличные'
  },
  { 
    type: 'freelance', 
    label: 'Подработка', 
    icon: <Briefcase className="w-4 h-4 text-emerald-500" />,
    defaultName: 'Подработка / Фриланс',
    defaultCategory: 'Подработка'
  },
  { 
    type: 'debt_return', 
    label: 'Возврат долга', 
    icon: <Handshake className="w-4 h-4 text-blue-500" />,
    defaultName: 'Возврат долга',
    defaultCategory: 'Возврат долга'
  },
  { 
    type: 'sale', 
    label: 'Продажа', 
    icon: <Tag className="w-4 h-4 text-purple-500" />,
    defaultName: 'Продажа вещей (Авито и др.)',
    defaultCategory: 'Продажа'
  },
  { 
    type: 'gift', 
    label: 'Подарок', 
    icon: <Gift className="w-4 h-4 text-pink-500" />,
    defaultName: 'Подарок',
    defaultCategory: 'Подарок'
  },
  { 
    type: 'bonus', 
    label: 'Премия', 
    icon: <Sparkles className="w-4 h-4 text-amber-500" />,
    defaultName: 'Премия / Бонус',
    defaultCategory: 'Премия'
  },
  { 
    type: 'bank_card', 
    label: 'Карта', 
    icon: <CreditCard className="w-4 h-4 text-indigo-500" />,
    defaultName: 'Поступление на карту',
    defaultCategory: 'Перевод'
  },
  { 
    type: 'other', 
    label: 'Прочее', 
    icon: <Coins className="w-4 h-4 text-zinc-500" />,
    defaultName: 'Прочее поступление',
    defaultCategory: 'Прочее'
  },
];

const PRESET_AMOUNTS = [1000, 2000, 3000, 5000, 10000, 15000];

export const AddManualIncomeModal: React.FC<AddManualIncomeModalProps> = ({ 
  isOpen, 
  onClose,
  initialSource = 'cash'
}) => {
  const { state, addManualIncome } = useBudget();

  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [sourceType, setSourceType] = useState<IncomeSourceType>(initialSource);
  const [sourceName, setSourceName] = useState('Наличные');
  const [category, setCategory] = useState('Наличные');
  const [date, setDate] = useState(state.todayDate);
  const [time, setTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [isIncludedInBudget, setIsIncludedInBudget] = useState(true);
  const [notes, setNotes] = useState('');
  const [successNotice, setSuccessNotice] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setTitle('');
      const opt = SOURCE_OPTIONS.find(o => o.type === initialSource) || SOURCE_OPTIONS[0];
      setSourceType(opt.type);
      setSourceName(opt.defaultName);
      setCategory(opt.defaultCategory);
      setDate(state.todayDate);
      const now = new Date();
      setTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
      setIsIncludedInBudget(true);
      setNotes('');
      setSuccessNotice(false);
    }
  }, [isOpen, initialSource, state.todayDate]);

  if (!isOpen) return null;

  const handleSourceSelect = (opt: SourceOption) => {
    setSourceType(opt.type);
    setSourceName(opt.defaultName);
    setCategory(opt.defaultCategory);
    if (!title || SOURCE_OPTIONS.some(o => o.defaultName === title)) {
      setTitle(opt.defaultName);
    }
  };

  const parsedAmount = parseFloat(amount.replace(/\s+/g, '').replace(',', '.')) || 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedAmount <= 0) return;

    const finalTitle = title.trim() || sourceName || 'Дополнительное поступление';

    addManualIncome({
      title: finalTitle,
      amount: parsedAmount,
      date: date || state.todayDate,
      time: time || '12:00',
      sourceType,
      sourceName: sourceName || 'Наличные',
      category: category || 'Поступление',
      isIncludedInBudget,
      isManual: true,
      notes: notes.trim() || undefined,
    });

    setSuccessNotice(true);
    setTimeout(() => {
      setSuccessNotice(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-[var(--color-bg-card)] w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border border-[var(--color-border)] animate-in fade-in slide-in-from-bottom-6 duration-200 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--color-text-main)]">
                Внесение поступления
              </h3>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                Учёт наличных, переводов, подработок и премий в бюджете
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[var(--color-bg-card-subtle)] text-[var(--color-text-muted)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
          {/* Amount input */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                Сумма поступления (₽) *
              </label>
              {parsedAmount > 0 && isIncludedInBudget && (
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  +{formatRubles(parsedAmount, { showCents: false })} к бюджету
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-[var(--color-text-muted)]/40"
                placeholder="0.00"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-bold text-[var(--color-text-muted)]">
                ₽
              </span>
            </div>

            {/* Quick preset amount chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {PRESET_AMOUNTS.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAmount(p.toString())}
                  className="px-2.5 py-1 rounded-lg bg-[var(--color-bg-card-subtle)] hover:bg-[var(--color-bg-card-muted)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] text-xs font-semibold border border-[var(--color-border-subtle)] transition-all cursor-pointer"
                >
                  +{formatRubles(p, { showCents: false })}
                </button>
              ))}
            </div>
          </div>

          {/* Source Type Selector Grid */}
          <div>
            <label className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1.5">
              Источник поступления
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SOURCE_OPTIONS.map((opt) => {
                const isSelected = sourceType === opt.type;
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => handleSourceSelect(opt)}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/30'
                        : 'bg-[var(--color-bg-card-subtle)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-card-muted)] hover:text-[var(--color-text-main)]'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-lg bg-[var(--color-bg-card)] flex items-center justify-center flex-shrink-0 shadow-2xs">
                      {opt.icon}
                    </div>
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title / Description */}
          <div>
            <label className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">
              Название / От кого
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Возврат от Дмитрия, наличные за дизайн"
              className="w-full text-sm font-semibold text-[var(--color-text-main)] bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Date and Time Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">
                Дата
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-xs font-semibold text-[var(--color-text-main)] bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">
                Время
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full text-xs font-semibold text-[var(--color-text-main)] bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Include in Budget Toggle (Main requested feature) */}
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Суммировать с текущим бюджетом
              </span>
              <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5 leading-relaxed">
                Сумма сразу прибавится к общему бюджету периода, увеличит чистый остаток и допустимый дневной лимит расходов.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-0.5">
              <input
                type="checkbox"
                checked={isIncludedInBudget}
                onChange={(e) => setIsIncludedInBudget(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-300 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">
              Комментарий (необязательно)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Дополнительные детали"
              className="w-full text-xs font-normal text-[var(--color-text-main)] bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-[var(--color-bg-card-subtle)] hover:bg-[var(--color-bg-card-muted)] text-[var(--color-text-secondary)] font-bold rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={parsedAmount <= 0}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {successNotice ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Учтено!</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Внести поступление</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
