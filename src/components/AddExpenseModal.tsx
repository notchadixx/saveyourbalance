import React, { useState } from 'react';
import { useBudget } from '../context/BudgetContext';
import { X } from 'lucide-react';
import { ExpenseCategory } from '../types';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ isOpen, onClose }) => {
  const { state, selectedDate, addExpenseToDate } = useBudget();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryType, setCategoryType] = useState<ExpenseCategory>('продукты');
  const [storeName, setStoreName] = useState('');
  const [date, setDate] = useState(selectedDate || state.todayDate);

  if (!isOpen) return null;

  const categories: Array<{ id: ExpenseCategory; label: string; icon: string }> = [
    { id: 'продукты', label: 'Продукты', icon: '🛒' },
    { id: 'еда_вне_дома', label: 'Кафе / Кофе', icon: '☕' },
    { id: 'авто', label: 'Авто / Бензин', icon: '⛽' },
    { id: 'транспорт', label: 'Транспорт', icon: '🚌' },
    { id: 'покупки', label: 'Покупки', icon: '🛍️' },
    { id: 'развлечения', label: 'Отдых', icon: '🎬' },
    { id: 'здоровье', label: 'Аптека', icon: '💊' },
    { id: 'дом', label: 'Дом / Быт', icon: '🏡' },
    { id: 'прочее', label: 'Прочее', icon: '📝' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount.replace(/\s+/g, '').replace(',', '.'));
    if (isNaN(numAmount) || numAmount <= 0) return;

    addExpenseToDate(date, {
      title: title.trim() || 'Расход',
      amount: numAmount,
      category: storeName.trim() || categories.find(c => c.id === categoryType)?.label || 'Прочее',
      categoryType: categoryType,
    });

    setTitle('');
    setAmount('');
    setStoreName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div 
        className="bg-[var(--color-bg-card)] w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-[var(--color-border)] animate-in fade-in slide-in-from-bottom-6 duration-200 max-h-[92vh] overflow-y-auto flex flex-col"
      >
        <div className="flex justify-between items-center pb-3 border-b border-[var(--color-border)]">
          <h3 className="text-base font-bold text-[var(--color-text-main)]">
            Новый расход
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[var(--color-bg-card-subtle)] text-[var(--color-text-muted)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
          {/* Amount input */}
          <div>
            <label className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">
              Сумма расхода (₽)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                required
                autoFocus
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full text-2xl font-extrabold text-[var(--color-text-main)] bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl font-bold text-[var(--color-text-muted)]">
                ₽
              </span>
            </div>
          </div>

          {/* Quick preset buttons */}
          <div className="flex gap-1.5">
            {[155, 300, 500, 1000, 1500].map(val => (
              <button
                type="button"
                key={val}
                onClick={() => setAmount(val.toString())}
                className="flex-1 py-1.5 rounded-lg bg-[var(--color-bg-card-muted)] hover:bg-[var(--color-border-strong)] text-xs font-semibold text-[var(--color-text-main)] transition-all border border-[var(--color-border-subtle)]"
              >
                +{val} ₽
              </button>
            ))}
          </div>

          {/* Title & Store */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">
                Наименование
              </label>
              <input
                type="text"
                placeholder="Напр. Продукты"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xs font-semibold text-[var(--color-text-main)] bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">
                Магазин / Место
              </label>
              <input
                type="text"
                placeholder="Напр. Магнит"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full text-xs font-semibold text-[var(--color-text-main)] bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              />
            </div>
          </div>

          {/* Date Selector */}
          <div>
            <label className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">
              Дата списания
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full text-xs font-semibold text-[var(--color-text-main)] bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            />
          </div>

          {/* Category Selector Chips */}
          <div>
            <label className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1.5">
              Категория
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {categories.map(cat => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setCategoryType(cat.id)}
                  className={`py-2 px-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 justify-center transition-all ${
                    categoryType === cat.id
                      ? 'bg-[#041627] dark:bg-[#10b981] text-white dark:text-[#041627] shadow-xs'
                      : 'bg-[var(--color-bg-card-subtle)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)]'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span className="truncate">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-3.5 bg-[#006d37] dark:bg-[#10b981] hover:bg-[#005228] dark:hover:bg-[#059669] text-white dark:text-[#041627] rounded-xl font-bold text-sm shadow-md active:scale-98 transition-all mt-2"
          >
            Сохранить расход
          </button>
        </form>
      </div>
    </div>
  );
};
