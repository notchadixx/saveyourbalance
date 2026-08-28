import React, { useState } from 'react';
import { useBudget } from '../context/BudgetContext';
import { X, CalendarDays } from 'lucide-react';
import { PlannedItem } from '../types';

interface AddPlannedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddPlannedModal: React.FC<AddPlannedModalProps> = ({ isOpen, onClose }) => {
  const { addPlannedItem } = useBudget();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<PlannedItem['category']>('покупки');
  const [notes, setNotes] = useState('');
  const [isProgressTracked, setIsProgressTracked] = useState(false);
  const [initialSpent, setInitialSpent] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount.replace(/\s+/g, '').replace(',', '.'));
    if (isNaN(numAmount) || numAmount <= 0 || !title.trim()) return;

    const numSpent = initialSpent ? parseFloat(initialSpent.replace(/\s+/g, '').replace(',', '.')) : 0;

    addPlannedItem({
      title: title.trim(),
      amount: numAmount,
      category,
      isPaid: false,
      notes: notes.trim() || undefined,
      isProgressTracked: isProgressTracked || title.toLowerCase().includes('бенз') || title.toLowerCase().includes('топлив'),
      spentAmount: !isNaN(numSpent) ? numSpent : 0,
    });

    setTitle('');
    setAmount('');
    setNotes('');
    setIsProgressTracked(false);
    setInitialSpent('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-[var(--color-bg-card)] w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-[var(--color-border)] animate-in fade-in slide-in-from-bottom-6 duration-200">
        <div className="flex justify-between items-center pb-3 border-b border-[var(--color-border)]">
          <h3 className="text-base font-bold text-[var(--color-text-main)] flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 text-[var(--color-accent)]" />
            Запланировать статью расхода
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[var(--color-bg-card-subtle)] text-[var(--color-text-muted)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 mt-4">
          <div>
            <label className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">
              Название статьи
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Напр. МФУ, Бензин, Подарок"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs font-semibold text-[var(--color-text-main)] bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-[var(--color-accent)] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">
                Сумма (₽)
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="5 000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full text-xs font-extrabold text-[var(--color-text-main)] bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-[var(--color-accent)] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">
                Категория
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full text-xs font-semibold text-[var(--color-text-main)] bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-[var(--color-accent)] focus:outline-none"
              >
                <option value="покупки">Покупки</option>
                <option value="авто">Автомобиль</option>
                <option value="игры_хобби">Игры & Хобби</option>
                <option value="обязательные">Обязательные</option>
                <option value="мероприятия">Мероприятия</option>
                <option value="прочее">Прочее</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">
              Примечание (необязательно)
            </label>
            <input
              type="text"
              placeholder="Напр. плановый бюджет"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs font-semibold text-[var(--color-text-main)] bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-[var(--color-accent)] focus:outline-none"
            />
          </div>

          <div className="p-3 rounded-xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)] flex flex-col gap-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[var(--color-text-main)]">
              <input
                type="checkbox"
                checked={isProgressTracked}
                onChange={(e) => setIsProgressTracked(e.target.checked)}
                className="w-4 h-4 rounded text-[var(--color-accent)] focus:ring-[var(--color-accent)] cursor-pointer"
              />
              <span>Регулярный расход с мини-шкалой (напр. Бензин)</span>
            </label>
            <p className="text-[10px] text-[var(--color-text-muted)]">
              Остаток лимита статьи будет автоматически учитываться при корректировке бюджета.
            </p>

            {isProgressTracked && (
              <div className="mt-1">
                <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block mb-1">
                  Уже потрачено из плана (₽)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={initialSpent}
                  onChange={(e) => setInitialSpent(e.target.value)}
                  className="w-full text-xs font-bold text-[var(--color-text-main)] bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-[var(--color-accent)] focus:outline-none"
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-[#006d37] dark:bg-[#10b981] hover:bg-[#005228] dark:hover:bg-[#059669] text-white dark:text-[#041627] rounded-xl font-bold text-sm shadow-md active:scale-98 transition-all mt-2"
          >
            Добавить в план
          </button>
        </form>
      </div>
    </div>
  );
};
