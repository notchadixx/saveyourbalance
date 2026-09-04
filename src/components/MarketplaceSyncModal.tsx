import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ShoppingBag, 
  Package, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Plus, 
  ArrowRight, 
  Wallet,
  ExternalLink,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { useBudget, formatRubles } from '../context/BudgetContext';
import { MarketplaceOrder } from '../types';

interface MarketplaceSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MarketplaceSyncModal: React.FC<MarketplaceSyncModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { 
    state, 
    connectMarketplace, 
    disconnectMarketplace, 
    syncMarketplaceOrders,
    cancelMarketplaceOrder,
    receiveMarketplaceOrder,
    recordMarketplaceWalletTopup
  } = useBudget();

  const [topupAmount, setTopupAmount] = useState<string>('1500');
  const [topupMarketplace, setTopupMarketplace] = useState<'wildberries' | 'ozon'>('wildberries');
  const [isTopupOpen, setIsTopupOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const sync = state.marketplaceSync || {
    isWildberriesConnected: false,
    isOzonConnected: false,
    orders: []
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleToggleMarketplace = (m: 'wildberries' | 'ozon') => {
    const isConnected = m === 'wildberries' ? sync.isWildberriesConnected : sync.isOzonConnected;
    if (isConnected) {
      disconnectMarketplace(m);
      showToast(`Синхронизация с ${m === 'wildberries' ? 'Wildberries' : 'OZON'} отключена`);
    } else {
      connectMarketplace(m);
      showToast(`Синхронизация с ${m === 'wildberries' ? 'Wildberries' : 'OZON'} подключена. Плановая статья создана!`);
    }
  };

  const handleCancelOrder = (order: MarketplaceOrder) => {
    cancelMarketplaceOrder(order.id);
    showToast(`Заказ «${order.title}» отменен. План ${order.marketplace === 'wildberries' ? 'Wildberries' : 'OZON'} уменьшен на ${formatRubles(order.price)}.`);
  };

  const handleReceiveOrder = (order: MarketplaceOrder) => {
    receiveMarketplaceOrder(order.id);
    showToast(`Товар получен! ${formatRubles(order.price)} учтено в шкале факта ${order.marketplace === 'wildberries' ? 'Wildberries' : 'OZON'}.`);
  };

  const handleTopupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(topupAmount.replace(/\s+/g, '').replace(',', '.'));
    if (isNaN(amount) || amount <= 0) return;

    recordMarketplaceWalletTopup(topupMarketplace, amount);
    setIsTopupOpen(false);
    showToast(`Пополнение ${topupMarketplace === 'wildberries' ? 'WB Кошелька' : 'OZON Банка'} на ${formatRubles(amount)} зафиксировано в шкале расхода!`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-[var(--color-bg-card)] rounded-2xl w-full max-w-lg border border-[var(--color-border)] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--color-border)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[var(--color-text-main)]">
                Интеграция с Wildberries и OZON
              </h2>
              <p className="text-xs text-[var(--color-text-muted)]">
                Автоматический учёт заказов, отмен и пополнений в планах
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] rounded-lg hover:bg-[var(--color-bg-card-subtle)] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notification Toast */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-emerald-500/15 border-b border-emerald-500/30 px-4 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex flex-col gap-4 text-xs">
          {/* Marketplace toggle cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Wildberries */}
            <div className={`p-3.5 rounded-xl border transition-all ${
              sync.isWildberriesConnected 
                ? 'border-purple-500/40 bg-purple-500/5' 
                : 'border-[var(--color-border)] bg-[var(--color-bg-card-subtle)] opacity-80'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-purple-600 text-white font-black text-[10px] flex items-center justify-center">
                    WB
                  </span>
                  <span className="font-extrabold text-sm text-[var(--color-text-main)]">
                    Wildberries
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleMarketplace('wildberries')}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                    sync.isWildberriesConnected
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-purple-500'
                  }`}
                >
                  {sync.isWildberriesConnected ? 'Подключен ✓' : 'Подключить'}
                </button>
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                Синхронизация заказов, статусов доставки и автосоздание плана «Wildberries».
              </p>
            </div>

            {/* OZON */}
            <div className={`p-3.5 rounded-xl border transition-all ${
              sync.isOzonConnected 
                ? 'border-blue-500/40 bg-blue-500/5' 
                : 'border-[var(--color-border)] bg-[var(--color-bg-card-subtle)] opacity-80'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-black text-[10px] flex items-center justify-center">
                    OZ
                  </span>
                  <span className="font-extrabold text-sm text-[var(--color-text-main)]">
                    OZON
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleMarketplace('ozon')}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                    sync.isOzonConnected
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-blue-500'
                  }`}
                >
                  {sync.isOzonConnected ? 'Подключен ✓' : 'Подключить'}
                </button>
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                Интеграция с Ozon Банком, пополнениями и выкупленными доставками.
              </p>
            </div>
          </div>

          {/* Logic rules explain banner */}
          <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-3 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="font-bold">Правила финансового учёта маркетплейсов:</span>
              <ul className="list-disc pl-4 space-y-0.5 text-[10px] leading-relaxed">
                <li>Если статьи «Wildberries» или «OZON» ещё нет в плане — приложение создаст её автоматически.</li>
                <li><strong>Отказ от товара:</strong> плановая сумма в разделе «План» автоматически снижается на сумму отмены.</li>
                <li><strong>Покупка или пополнение WB Кошелька:</strong> фактическая шкала увеличивается на сумму операции без списания из дневного лимита.</li>
              </ul>
            </div>
          </div>

          {/* Wallet topup quick action */}
          <div className="bg-[var(--color-bg-card-subtle)] p-3 rounded-xl border border-[var(--color-border-subtle)] flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[var(--color-text-main)] flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                Быстрое пополнение WB Кошелька / OZON Баланса
              </span>
              <button
                type="button"
                onClick={() => setIsTopupOpen(!isTopupOpen)}
                className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
              >
                {isTopupOpen ? 'Скрыть' : 'Внести пополнение'}
              </button>
            </div>

            {isTopupOpen && (
              <form onSubmit={handleTopupSubmit} className="pt-2 flex flex-col sm:flex-row gap-2">
                <select
                  value={topupMarketplace}
                  onChange={(e) => setTopupMarketplace(e.target.value as any)}
                  className="h-8 px-2 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-lg text-xs font-semibold text-[var(--color-text-main)]"
                >
                  <option value="wildberries">Wildberries (WB Кошелёк)</option>
                  <option value="ozon">OZON (Ozon Банк)</option>
                </select>
                <input
                  type="number"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  placeholder="1500"
                  className="h-8 px-2.5 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-lg text-xs font-bold text-[var(--color-text-main)] flex-1"
                />
                <button
                  type="submit"
                  className="h-8 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0"
                >
                  Учесть в шкале
                </button>
              </form>
            )}
          </div>

          {/* Orders list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-extrabold text-xs text-[var(--color-text-main)] uppercase tracking-wider">
                Текущие заказы и доставки ({sync.orders.length})
              </span>
              <button
                type="button"
                onClick={() => {
                  syncMarketplaceOrders();
                  showToast('Данные заказов синхронизированы');
                }}
                className="text-[11px] font-bold text-[var(--color-accent)] flex items-center gap-1 hover:underline cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                Синхронизировать
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {sync.orders.map((order) => {
                const isWb = order.marketplace === 'wildberries';
                const isOrdered = order.status === 'ordered';
                const isDelivered = order.status === 'delivered';
                const isCancelled = order.status === 'cancelled';

                return (
                  <div
                    key={order.id}
                    className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all ${
                      isCancelled 
                        ? 'border-[var(--color-border-subtle)] bg-[var(--color-bg-card-subtle)] opacity-50' 
                        : 'border-[var(--color-border)] bg-[var(--color-bg-card)]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        isWb ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'
                      }`}>
                        {isWb ? 'WB' : 'OZ'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-[var(--color-text-main)] truncate max-w-[200px] sm:max-w-[240px]">
                            {order.title}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                            isDelivered 
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : isOrdered
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                              : 'bg-gray-500/10 text-gray-500 border border-gray-500/20 line-through'
                          }`}>
                            {isDelivered ? 'Выкуплен' : isOrdered ? 'В пути' : 'Отменен'}
                          </span>
                        </div>
                        <span className="text-[10px] text-[var(--color-text-muted)] block">
                          Заказ от {order.orderDate} {order.deliveryDate ? `• Доставка: ${order.deliveryDate}` : ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <span className={`text-xs font-extrabold ${isCancelled ? 'line-through text-[var(--color-text-muted)]' : 'text-[var(--color-text-main)]'}`}>
                        {formatRubles(order.price)}
                      </span>

                      {isOrdered && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleReceiveOrder(order)}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg cursor-pointer transition-colors"
                            title="Отметить как выкупленный (наполняет шкалу расхода)"
                          >
                            Выкуплен
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCancelOrder(order)}
                            className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-bold text-[10px] rounded-lg cursor-pointer transition-colors"
                            title="Отказаться от товара (уменьшает плановую сумму)"
                          >
                            Отмена
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-bg-card-subtle)] flex items-center justify-between">
          <span className="text-[11px] text-[var(--color-text-muted)]">
            Синхронизация происходит в фоновом режиме
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[var(--color-accent)] text-white font-bold rounded-xl text-xs hover:opacity-90 cursor-pointer"
          >
            Готово
          </button>
        </div>
      </motion.div>
    </div>
  );
};
