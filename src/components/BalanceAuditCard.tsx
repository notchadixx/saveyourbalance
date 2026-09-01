import React, { useState, useRef, useEffect } from 'react';
import { useBudget, formatRubles } from '../context/BudgetContext';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles,
  RefreshCw,
  HelpCircle,
  X,
  CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BalanceAuditCardProps {
  onOpenBankModal?: () => void;
}

export const BalanceAuditCard: React.FC<BalanceAuditCardProps> = ({ onOpenBankModal }) => {
  const { 
    totalCheckingBankBalance, 
    calculatedBudgetCorrection,
    applyBudgetCorrection,
    syncBankAccounts,
    isBankSyncing,
    state
  } = useBudget();

  const [showTooltip, setShowTooltip] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Determine if there is a real discrepancy with bank cards
  const hasDiscrepancy = Math.abs(calculatedBudgetCorrection) >= 1;
  const absCorrection = Math.abs(calculatedBudgetCorrection);

  // Find active correction amount from planned items (if already saved)
  const existingCorrectionItem = (state.plannedItems || []).find(
    i => i.title.toLowerCase() === 'корректировка' || i.title.toLowerCase().includes('корректировка бюджета')
  );
  const currentSavedCorrection = existingCorrectionItem ? existingCorrectionItem.amount : 0;

  // Handle single-click synchronization
  const handleSync = () => {
    const res = applyBudgetCorrection('planned');
    setSuccessToast(res.message || 'Счета успешно синхронизированы!');
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Close tooltip on click outside or escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setShowTooltip(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowTooltip(false);
    };

    if (showTooltip) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showTooltip]);

  return (
    <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 shadow-xs border border-[var(--color-border)] flex flex-col gap-3 relative">
      {/* 1. Header: Title + Info Tooltip Icon + Bank Sync */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-1.5 relative">
          <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
            КОРРЕКТИРОВКА
          </span>

          {/* Info Button with Tooltip Trigger */}
          <button
            type="button"
            onClick={() => setShowTooltip(!showTooltip)}
            className="p-1 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-bg-card-subtle)] transition-colors"
            title="Что такое корректировка?"
            aria-label="Справка по корректировке"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => syncBankAccounts()}
            disabled={isBankSyncing}
            className="flex items-center gap-1 text-[11px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors active:scale-95"
            title="Обновить баланс карт"
          >
            <RefreshCw className={`w-3 h-3 ${isBankSyncing ? 'animate-spin text-blue-500' : ''}`} />
            <span className="hidden sm:inline">Карты: {formatRubles(totalCheckingBankBalance, { showCents: false })}</span>
          </button>
        </div>
      </div>

      {/* 2. Tooltip Popover (Explanatory Floating Card) */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="p-3.5 rounded-xl bg-[var(--color-bg-card-muted)] border border-[var(--color-border-strong)] shadow-lg text-xs flex flex-col gap-2 relative z-20"
          >
            <div className="flex justify-between items-start">
              <span className="font-bold text-[var(--color-text-main)] text-xs">
                О функции «Корректировка»
              </span>
              <button
                onClick={() => setShowTooltip(false)}
                className="p-1 -mr-1 -mt-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] rounded-lg"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-[11.5px] leading-relaxed text-[var(--color-text-secondary)]">
              Корректировка вносится в случае, если пользователь не учёл или не заметил какой-либо расход, а также в случае, если пришёл аванс, отличающийся от планируемого.
            </p>
            <p className="text-[11.5px] leading-relaxed text-[var(--color-text-secondary)]">
              При расхождении приходит уведомление, с помощью которого можно сделать синхронизацию одной кнопкой.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Main Counter */}
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-2xl font-extrabold text-[var(--color-text-main)] tracking-tight">
            {hasDiscrepancy 
              ? formatRubles(absCorrection, { showCents: false })
              : (currentSavedCorrection > 0 ? formatRubles(currentSavedCorrection, { showCents: false }) : '0 ₽')}
          </div>
          <span className="text-[11px] text-[var(--color-text-muted)] font-medium">
            {hasDiscrepancy ? 'Требуется синхронизация с балансом карты' : 'Расхождений с картами нет'}
          </span>
        </div>

        {!hasDiscrepancy && (
          <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>В балансе</span>
          </div>
        )}
      </div>

      {/* 4. Notification Banner: Discrepancy Alert OR 'Расхождений не выявлено' */}
      <AnimatePresence mode="wait">
        {hasDiscrepancy ? (
          <motion.div
            key="discrepancy-banner"
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 4 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.2 }}
            className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 overflow-hidden"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-[var(--color-text-main)] block truncate">
                  Выявлено расхождение с балансом карты
                </span>
                <span className="text-[11px] text-[var(--color-text-muted)] block truncate">
                  Разница: {formatRubles(absCorrection)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSync}
              className="py-2 px-3.5 rounded-xl bg-[#006d37] dark:bg-[#10b981] hover:bg-[#005228] dark:hover:bg-[#059669] text-white dark:text-[#041627] font-bold text-xs shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Синхронизировать</span>
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="synced-banner"
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 4 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.2 }}
            className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-2 overflow-hidden"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 block truncate">
                  Расхождений не выявлено
                </span>
                <span className="text-[11px] text-[var(--color-text-muted)] block truncate">
                  Чистый остаток соответствует балансу по карте
                </span>
              </div>
            </div>

            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/25 px-2.5 py-1 rounded-full whitespace-nowrap shrink-0">
              В балансе
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Success Toast (brief confirmation after clicking Sync) */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{successToast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
