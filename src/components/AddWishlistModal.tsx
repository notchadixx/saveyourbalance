import React, { useState } from 'react';
import { useBudget } from '../context/BudgetContext';
import { X, Heart } from 'lucide-react';
import { Marketplace } from '../types';

interface AddWishlistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddWishlistModal: React.FC<AddWishlistModalProps> = ({ isOpen, onClose }) => {
  const { addWishlistItem } = useBudget();

  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [price, setPrice] = useState('');
  const [articleId, setArticleId] = useState('');
  const [marketplace, setMarketplace] = useState<Marketplace>('ozon');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [category] = useState('Гаджеты');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numPrice = parseFloat(price.replace(/\s+/g, '').replace(',', '.'));
    if (isNaN(numPrice) || numPrice <= 0 || !title.trim()) return;

    addWishlistItem({
      title: title.trim(),
      url: url.trim() || 'https://market.yandex.ru',
      price: numPrice,
      articleId: articleId.trim() || undefined,
      marketplace,
      priority,
      category,
      isPurchased: false,
    });

    setTitle('');
    setUrl('');
    setPrice('');
    setArticleId('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-[var(--color-bg-card)] w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-[var(--color-border)] animate-in fade-in slide-in-from-bottom-6 duration-200">
        <div className="flex justify-between items-center pb-3 border-b border-[var(--color-border)]">
          <h3 className="text-base font-bold text-[var(--color-text-main)] flex items-center gap-1.5">
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
            Добавить в вишлист
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[var(--color-bg-card-subtle)] text-[var(--color-text-muted)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 mt-4">
          <div>
            <label className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">
              Название товара / Номенклатура
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Напр. Смарт-часы Huawei GT 4"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs font-semibold text-[var(--color-text-main)] bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-[var(--color-accent)] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">
                Цена (₽)
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="12 799"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full text-xs font-extrabold text-[var(--color-text-main)] bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-[var(--color-accent)] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">
                Магазин
              </label>
              <select
                value={marketplace}
                onChange={(e) => setMarketplace(e.target.value as Marketplace)}
                className="w-full text-xs font-semibold text-[var(--color-text-main)] bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-[var(--color-accent)] focus:outline-none"
              >
                <option value="dns">DNS</option>
                <option value="ozon">OZON</option>
                <option value="wildberries">Wildberries</option>
                <option value="sunlight">SUNLIGHT</option>
                <option value="other">Другой магазин</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">
                Артикул (nmId / Код)
              </label>
              <input
                type="text"
                placeholder="Напр. 1768220048"
                value={articleId}
                onChange={(e) => setArticleId(e.target.value)}
                className="w-full text-xs font-mono text-[var(--color-text-main)] bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-[var(--color-accent)] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">
                Приоритет
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full text-xs font-semibold text-[var(--color-text-main)] bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-[var(--color-accent)] focus:outline-none"
              >
                <option value="high">Высокий 🔥</option>
                <option value="medium">Обычный ⚡</option>
                <option value="low">Низкий 💤</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">
              Ссылка на товар (URL)
            </label>
            <input
              type="url"
              placeholder="https://www.dns-shop.ru/product/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full text-xs font-semibold text-[var(--color-text-main)] bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-[var(--color-accent)] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-[#041627] dark:bg-[#10b981] hover:bg-[#1a2b3c] dark:hover:bg-[#059669] text-white dark:text-[#041627] rounded-xl font-bold text-sm shadow-md active:scale-98 transition-all mt-2"
          >
            Добавить в список желаний
          </button>
        </form>
      </div>
    </div>
  );
};
