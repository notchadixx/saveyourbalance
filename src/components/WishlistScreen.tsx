import React, { useState } from 'react';
import { useBudget, formatRubles } from '../context/BudgetContext';
import { 
  ExternalLink, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Trash2, 
  Copy, 
  Check, 
  LayoutList, 
  Table as TableIcon,
  Search,
  Edit2,
  X,
  CalendarPlus
} from 'lucide-react';
import { motion } from 'motion/react';
import { Marketplace } from '../types';

interface WishlistScreenProps {
  onOpenAddWishlist: () => void;
}

export const WishlistScreen: React.FC<WishlistScreenProps> = ({ onOpenAddWishlist }) => {
  const { 
    state, 
    toggleWishlistPurchased, 
    deleteWishlistItem, 
    updateWishlistItem, 
    clearPurchasedWishlist,
    moveWishlistToPlanned 
  } = useBudget();

  const [selectedMarketplace, setSelectedMarketplace] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Inline edit state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editMarketplace, setEditMarketplace] = useState<Marketplace>('other');
  const [editArticle, setEditArticle] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const totalWishlistSum = state.wishlist
    .filter(item => !item.isPurchased)
    .reduce((sum, item) => sum + item.price, 0);

  const purchasedCount = state.wishlist.filter(item => item.isPurchased).length;

  const filteredItems = state.wishlist.filter(item => {
    const matchesStore = selectedMarketplace === 'all' || item.marketplace === selectedMarketplace;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.articleId && item.articleId.includes(searchQuery));
    return matchesStore && matchesSearch;
  });

  const handleStartEdit = (item: typeof state.wishlist[0]) => {
    setEditingItemId(item.id);
    setEditTitle(item.title);
    setEditPrice(item.price.toString());
    setEditMarketplace(item.marketplace);
    setEditArticle(item.articleId || '');
    setEditUrl(item.url || '');
    setEditNotes(item.notes || '');
  };

  const handleSaveEdit = (itemId: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const parsedPrice = parseFloat(editPrice.replace(/\s+/g, '').replace(',', '.'));
    if (isNaN(parsedPrice) || parsedPrice <= 0) return;

    updateWishlistItem(itemId, {
      title: editTitle.trim() || 'Товар',
      price: parsedPrice,
      marketplace: editMarketplace,
      articleId: editArticle.trim() || undefined,
      url: editUrl.trim() || undefined,
      notes: editNotes.trim() || undefined,
    });

    setEditingItemId(null);
  };

  const getMarketplaceBadge = (marketplace: Marketplace) => {
    switch (marketplace) {
      case 'dns':
        return <span className="bg-orange-500/15 text-orange-600 dark:text-orange-400 font-bold px-2 py-0.5 rounded-md text-[10px] border border-orange-500/20">DNS</span>;
      case 'ozon':
        return <span className="bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold px-2 py-0.5 rounded-md text-[10px] border border-blue-500/20">OZON</span>;
      case 'wildberries':
        return <span className="bg-purple-500/15 text-purple-600 dark:text-purple-400 font-bold px-2 py-0.5 rounded-md text-[10px] border border-purple-500/20">Wildberries</span>;
      case 'sunlight':
        return <span className="bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold px-2 py-0.5 rounded-md text-[10px] border border-rose-500/20">SUNLIGHT</span>;
      default:
        return <span className="bg-[var(--color-bg-card-muted)] text-[var(--color-text-secondary)] font-bold px-2 py-0.5 rounded-md text-[10px] border border-[var(--color-border-subtle)]">Магазин</span>;
    }
  };

  const handleCopyArticle = (article: string, id: string) => {
    navigator.clipboard.writeText(article);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col gap-4 pb-28 pt-2">
      {/* 1. Top Summary Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[var(--color-bg-card)] rounded-2xl p-5 shadow-xs border border-[var(--color-border)]"
      >
        <div className="flex justify-between items-start mb-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-[#006d37] dark:bg-[#10b981] text-white dark:text-[#041627] flex items-center justify-center font-bold text-xs">
                #1
              </div>
              <h2 className="text-lg font-bold text-[var(--color-text-main)]">Вишлист</h2>
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">
              Список желаемых покупок с мониторингом цен
            </p>
          </div>

          <div className="flex gap-1 bg-[var(--color-bg-card-muted)] p-1 rounded-xl border border-[var(--color-border-subtle)]">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'cards' ? 'bg-[var(--color-bg-card)] text-[var(--color-text-main)] shadow-xs' : 'text-[var(--color-text-muted)]'
              }`}
              title="Карточки"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'table' ? 'bg-[var(--color-bg-card)] text-[var(--color-text-main)] shadow-xs' : 'text-[var(--color-text-muted)]'
              }`}
              title="Таблица"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[var(--color-border)] mt-3 items-center">
          <div>
            <span className="text-xs text-[var(--color-text-muted)] block font-medium">К покупке на сумму</span>
            <span className="text-xl font-extrabold text-[var(--color-accent)]">
              {formatRubles(totalWishlistSum)}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs text-[var(--color-text-muted)] block font-medium">Куплено</span>
            <span className="text-xl font-extrabold text-[var(--color-text-main)]">
              {purchasedCount} / {state.wishlist.length}
            </span>
          </div>
        </div>

        {purchasedCount > 0 && (
          <div className="pt-3 border-t border-[var(--color-border)] mt-3 flex justify-end">
            <button
              onClick={() => {
                if (window.confirm ? window.confirm('Удалить все купленные (достигнутые) цели из вишлиста?') : true) {
                  clearPurchasedWishlist();
                }
              }}
              className="text-xs font-bold text-[var(--color-danger)] hover:text-red-700 dark:hover:text-red-400 bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/30 hover:border-[var(--color-danger)] px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Очистить все достигнутые цели ({purchasedCount})</span>
            </button>
          </div>
        )}
      </motion.div>

      {/* 2. Search & Marketplace Filters */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Поиск по названию или артикулу..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-[var(--color-text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            />
          </div>

          <button
            onClick={onOpenAddWishlist}
            className="flex items-center gap-1 bg-[#041627] dark:bg-[#10b981] text-white dark:text-[#041627] hover:bg-[#1a2b3c] dark:hover:bg-[#059669] text-xs font-bold px-3 py-2 rounded-xl shadow-xs transition-all whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Добавить</span>
          </button>
        </div>

        {/* Marketplace filters */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {[
            { id: 'all', label: 'Все магазины' },
            { id: 'dns', label: 'DNS' },
            { id: 'ozon', label: 'OZON' },
            { id: 'wildberries', label: 'Wildberries' },
            { id: 'sunlight', label: 'Sunlight' },
          ].map(store => (
            <button
              key={store.id}
              onClick={() => setSelectedMarketplace(store.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedMarketplace === store.id
                  ? 'bg-[#041627] dark:bg-[#10b981] text-white dark:text-[#041627] shadow-xs'
                  : 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)]'
              }`}
            >
              {store.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Items View: Modern Cards VS Table View */}
      {viewMode === 'cards' ? (
        <div className="flex flex-col gap-2.5">
          {filteredItems.map((item) => {
            if (editingItemId === item.id) {
              return (
                <motion.form
                  key={item.id}
                  layout
                  onSubmit={(e) => handleSaveEdit(item.id, e)}
                  className="bg-[var(--color-bg-card)] rounded-2xl p-4 border-2 border-[var(--color-accent)]/50 shadow-xs flex flex-col gap-3"
                >
                  <div className="flex justify-between items-center pb-1 border-b border-[var(--color-border)]">
                    <span className="text-xs font-bold text-[var(--color-text-main)] flex items-center gap-1.5">
                      <Edit2 className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                      Редактирование желания
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingItemId(null)}
                      className="text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block mb-1">
                        Название товара
                      </label>
                      <input
                        type="text"
                        required
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full h-8 px-2.5 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-lg text-xs font-bold text-[var(--color-text-main)]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block mb-1">
                        Цена, ₽
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        className="w-full h-8 px-2.5 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-lg text-xs font-bold text-[var(--color-text-main)]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block mb-1">
                        Магазин
                      </label>
                      <select
                        value={editMarketplace}
                        onChange={(e) => setEditMarketplace(e.target.value as any)}
                        className="w-full h-8 px-2 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-lg text-xs font-semibold text-[var(--color-text-main)]"
                      >
                        <option value="ozon">OZON</option>
                        <option value="wildberries">Wildberries</option>
                        <option value="dns">DNS</option>
                        <option value="sunlight">SUNLIGHT</option>
                        <option value="other">Другой магазин</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block mb-1">
                        Артикул
                      </label>
                      <input
                        type="text"
                        value={editArticle}
                        onChange={(e) => setEditArticle(e.target.value)}
                        className="w-full h-8 px-2.5 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-lg text-xs font-medium text-[var(--color-text-main)]"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block mb-1">
                        Ссылка на товар
                      </label>
                      <input
                        type="url"
                        value={editUrl}
                        onChange={(e) => setEditUrl(e.target.value)}
                        className="w-full h-8 px-2.5 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-lg text-xs font-medium text-[var(--color-text-main)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block mb-1">
                      Примечание
                    </label>
                    <input
                      type="text"
                      placeholder="Заметки или пожелания..."
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      className="w-full h-8 px-2.5 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-lg text-xs font-medium text-[var(--color-text-main)]"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-[var(--color-border-subtle)]">
                    <button
                      type="button"
                      onClick={() => moveWishlistToPlanned(item.id)}
                      className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <CalendarPlus className="w-3.5 h-3.5" />
                      <span>В планируемые расходы</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingItemId(null)}
                        className="px-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]/50 rounded-xl transition-colors"
                      >
                        Отмена
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-[#006d37] dark:bg-[#10b981] dark:text-[#041627] hover:bg-[#005228] text-white text-xs font-bold rounded-xl shadow-xs active:scale-95 transition-all flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Сохранить</span>
                      </button>
                    </div>
                  </div>
                </motion.form>
              );
            }

            return (
              <motion.div
                key={item.id}
                layout
                className={`bg-[var(--color-bg-card)] rounded-2xl p-4 border transition-all flex flex-col gap-3 group ${
                  item.isPurchased 
                    ? 'border-[var(--color-border)] opacity-75' 
                    : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)] shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleWishlistPurchased(item.id)}
                      className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                        item.isPurchased ? 'text-[var(--color-accent)]' : 'text-[var(--color-border-strong)] hover:text-[var(--color-text-main)]'
                      }`}
                      title={item.isPurchased ? 'Куплено' : 'Не куплено'}
                    >
                      {item.isPurchased ? (
                        <CheckCircle2 className="w-5 h-5 fill-[var(--color-accent-light)] text-[#00210c] dark:text-[#041627]" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {getMarketplaceBadge(item.marketplace)}
                        {item.articleId && (
                          <button
                            onClick={() => handleCopyArticle(item.articleId!, item.id)}
                            className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] bg-[var(--color-bg-card-subtle)] px-2 py-0.5 rounded-md flex items-center gap-1 font-mono border border-[var(--color-border-subtle)]"
                            title="Скопировать артикул"
                          >
                            {copiedId === item.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            арт. {item.articleId}
                          </button>
                        )}
                      </div>
                      <h4 className={`text-sm font-bold ${item.isPurchased ? 'text-[var(--color-text-muted)] line-through' : 'text-[var(--color-text-main)]'}`}>
                        {item.title}
                      </h4>
                      {item.notes && (
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{item.notes}</p>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className={`text-base font-extrabold ${item.isPurchased ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-accent)]'}`}>
                      {formatRubles(item.price)}
                    </span>
                    <div className="text-[10px] text-[var(--color-text-muted)]">Цена (алгоритм)</div>
                  </div>
                </div>

                {/* Action buttons bar */}
                <div className="flex items-center justify-between pt-2.5 border-t border-[var(--color-border-subtle)] text-xs flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    {item.url ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-blue-500 hover:text-blue-400 flex items-center gap-1"
                      >
                        <span>В магазин</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : null}

                    <button
                      onClick={() => handleStartEdit(item)}
                      className="text-[11px] font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Изменить</span>
                    </button>

                    <button
                      onClick={() => moveWishlistToPlanned(item.id)}
                      className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
                      title="Перенести в планируемые расходы"
                    >
                      <CalendarPlus className="w-3 h-3" />
                      <span>В план</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleWishlistPurchased(item.id)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all ${
                        item.isPurchased
                          ? 'bg-[var(--color-bg-card-muted)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]'
                          : 'bg-[var(--color-accent-badge-bg)] text-[var(--color-accent-badge-text)] border border-[var(--color-accent-badge-border)] hover:opacity-90'
                      }`}
                    >
                      {item.isPurchased ? 'Куплено ✓' : 'Куплено'}
                    </button>

                    <button
                      onClick={() => deleteWishlistItem(item.id)}
                      className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors"
                      title="Удалить из вишлиста"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        /* Exact Spreadsheet Table View */
        <div className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#006d37] dark:bg-[#152e22] text-white border-b border-[#005228] dark:border-[#1d4231]">
                  <th className="py-2.5 px-3 font-semibold border-r border-[#005228]/50">Номенклатура</th>
                  <th className="py-2.5 px-3 font-semibold border-r border-[#005228]/50">Ссылка</th>
                  <th className="py-2.5 px-3 font-semibold border-r border-[#005228]/50">Артикул (nmId)</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Цена (алгоритм)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-subtle)]">
                {filteredItems.map((item, idx) => (
                  <tr key={item.id} className={idx % 2 === 0 ? 'bg-[var(--color-bg-card)]' : 'bg-[var(--color-bg-card-subtle)]'}>
                    <td className="py-2.5 px-3 font-medium text-[var(--color-text-main)] border-r border-[var(--color-border-subtle)]">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => toggleWishlistPurchased(item.id)}
                          className={item.isPurchased ? 'text-[var(--color-accent)]' : 'text-gray-400'}
                        >
                          {item.isPurchased ? '✓' : '○'}
                        </button>
                        <span className={item.isPurchased ? 'line-through text-[var(--color-text-muted)]' : ''}>
                          {item.title}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 border-r border-[var(--color-border-subtle)] max-w-[150px] truncate text-blue-500">
                      <a href={item.url} target="_blank" rel="noreferrer" className="underline truncate block">
                        {item.url}
                      </a>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[var(--color-text-secondary)] border-r border-[var(--color-border-subtle)]">
                      {item.articleId || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-[var(--color-accent)] bg-[var(--color-accent-badge-bg)]/20">
                      {formatRubles(item.price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
