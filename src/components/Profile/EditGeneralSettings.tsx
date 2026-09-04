import React, { useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { useAuth } from '../../context/AuthContext';
import { User, DollarSign, Sun, Moon, Check, Sparkles } from 'lucide-react';

interface EditGeneralSettingsProps {
  onBack: () => void;
  showToast: (msg: string) => void;
}

export const EditGeneralSettings: React.FC<EditGeneralSettingsProps> = ({ onBack, showToast }) => {
  const { state, updateUserProfile, theme, setTheme } = useBudget();
  const { user } = useAuth();

  const [name, setName] = useState(state.userName || user?.displayName || '');
  const [currency, setCurrency] = useState(state.currency || 'RUB');
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark'>(theme);

  const currencies = [
    { code: 'RUB', symbol: '₽', label: 'Российский рубль (₽)' },
    { code: 'USD', symbol: '$', label: 'Доллар США ($)' },
    { code: 'EUR', symbol: '€', label: 'Евро (€)' },
    { code: 'KZT', symbol: '₸', label: 'Казахстанский тенге (₸)' },
    { code: 'BYN', symbol: 'Br', label: 'Белорусский рубль (Br)' },
  ];

  const handleSave = () => {
    updateUserProfile({
      userName: name.trim(),
      currency,
    });
    setTheme(selectedTheme);
    showToast('Основные настройки сохранены');
    onBack();
  };

  return (
    <div className="space-y-5">
      {/* User info card */}
      <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 border border-[var(--color-border)] shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg border border-blue-500/20">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={name || 'Avatar'}
                className="w-full h-full rounded-2xl object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              (name || 'Пользователь').charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--color-text-main)]">
              {name || 'Пользователь'}
            </h3>
            <p className="text-xs text-[var(--color-text-muted)]">
              {user ? user.email : 'Локальный профиль'}
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-1.5 uppercase">
            Имя пользователя
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Как к вам обращаться"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)] text-sm text-[var(--color-text-main)] focus:outline-hidden focus:border-[var(--color-accent)] font-medium"
            />
          </div>
        </div>
      </div>

      {/* Currency selection */}
      <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 border border-[var(--color-border)] shadow-xs space-y-3">
        <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase">
          Основная валюта
        </label>
        <div className="grid grid-cols-1 gap-2">
          {currencies.map((curr) => {
            const isSelected = currency === curr.code;
            return (
              <button
                key={curr.code}
                onClick={() => setCurrency(curr.code)}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-blue-500/10 border-blue-500/40 text-blue-700 dark:text-blue-300 font-bold'
                    : 'bg-[var(--color-bg-card-subtle)] border-[var(--color-border-subtle)] text-[var(--color-text-main)] hover:border-[var(--color-border)]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] flex items-center justify-center font-extrabold text-sm">
                    {curr.symbol}
                  </span>
                  <span className="text-xs">{curr.label}</span>
                </div>
                {isSelected && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Theme selection */}
      <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 border border-[var(--color-border)] shadow-xs space-y-3">
        <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase">
          Тема оформления
        </label>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => setSelectedTheme('light')}
            className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 transition-all ${
              selectedTheme === 'light'
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-800 dark:text-amber-200 font-bold'
                : 'bg-[var(--color-bg-card-subtle)] border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:border-[var(--color-border)]'
            }`}
          >
            <Sun className="w-5 h-5 text-amber-500" />
            <span className="text-xs">Светлая</span>
          </button>

          <button
            onClick={() => setSelectedTheme('dark')}
            className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 transition-all ${
              selectedTheme === 'dark'
                ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-700 dark:text-indigo-300 font-bold'
                : 'bg-[var(--color-bg-card-subtle)] border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:border-[var(--color-border)]'
            }`}
          >
            <Moon className="w-5 h-5 text-indigo-500" />
            <span className="text-xs">Тёмная</span>
          </button>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        className="w-full py-3 rounded-xl bg-[var(--color-accent)] hover:opacity-90 text-white font-bold text-sm shadow-sm transition-all active:scale-98"
      >
        Сохранить изменения
      </button>
    </div>
  );
};
