import React, { useState } from 'react';
import { useBudget } from '../context/BudgetContext';
import { useAuth } from '../context/AuthContext';
import { ActiveTab } from '../types';
import { 
  Calendar, 
  CalendarDays, 
  Wallet, 
  Heart, 
  ShieldCheck, 
  BarChart3, 
  Smartphone, 
  Monitor, 
  Plus, 
  RotateCcw,
  Sun,
  Moon,
  Cloud,
  CloudCheck,
  User as UserIcon,
  LogIn,
  Landmark,
  Settings
} from 'lucide-react';
import { AuthModal } from './AuthModal';
import { BankSyncModal } from './BankSyncModal';
import { ProfileScreen } from './Profile/ProfileScreen';

interface NavigationProps {
  onOpenAddExpense?: () => void;
  onOpenSettings?: () => void;
}

export const TopBar: React.FC<NavigationProps> = ({ onOpenAddExpense, onOpenSettings }) => {
  const { 
    activeTab, 
    isMobileFrame, 
    toggleMobileFrame, 
    resetToDefaults, 
    theme, 
    toggleTheme,
    syncStatus,
    pendingBankTransactionsCount,
    state
  } = useBudget();

  const { user } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [isInternalProfileOpen, setIsInternalProfileOpen] = useState(false);

  const handleOpenSettings = () => {
    if (onOpenSettings) {
      onOpenSettings();
    } else {
      setIsInternalProfileOpen(true);
    }
  };

  const getTitle = () => {
    switch (activeTab) {
      case 'today':
        return 'Лимит Дня';
      case 'budget':
        return 'Бюджет';
      case 'analytics':
        return 'Аналитика';
      case 'planning':
        return 'Планирование';
      case 'wishlist':
        return 'Вишлист';
      case 'cushion':
        return 'Подушка безопасности';
      case 'confirm-expenses':
        return 'Подтверждение трат';
      default:
        return 'Лимит Дня';
    }
  };

  return (
    <>
      <header className="flex justify-between items-center w-full px-4 py-3 bg-[var(--color-bg-header)] border-b border-[var(--color-border)] sticky top-0 z-40 transition-colors duration-200">
        <div className="flex items-center gap-2 text-[var(--color-text-main)]">
          {activeTab === 'budget' ? (
            <Wallet className="w-5 h-5 text-[var(--color-text-main)]" />
          ) : activeTab === 'analytics' ? (
            <BarChart3 className="w-5 h-5 text-[var(--color-text-main)]" />
          ) : activeTab === 'wishlist' ? (
            <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
          ) : activeTab === 'cushion' ? (
            <ShieldCheck className="w-5 h-5 text-[var(--color-accent)]" />
          ) : activeTab === 'planning' ? (
            <CalendarDays className="w-5 h-5 text-[var(--color-text-main)]" />
          ) : (
            <Calendar className="w-5 h-5 text-[var(--color-text-main)]" />
          )}
          <h1 className="font-bold text-lg text-[var(--color-text-main)] tracking-tight">{getTitle()}</h1>
        </div>

        <div className="flex items-center gap-1.5">
          {/* User Auth & Cloud Sync Button */}
          <button
            onClick={() => setIsAuthModalOpen(true)}
            title={user ? `Аккаунт: ${user.email} (Firestore)` : 'Войти через Google'}
            className="p-1 sm:px-2 sm:py-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] hover:border-[var(--color-border-strong)] transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
          >
            {user ? (
              <>
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-5 h-5 rounded-full object-cover border border-[var(--color-border-strong)]"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-[#006d37] text-white flex items-center justify-center font-bold text-[10px]">
                    {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </div>
                )}
                <div className="hidden sm:flex items-center gap-1">
                  <span className="text-xs font-semibold max-w-[80px] truncate text-[var(--color-text-main)]">
                    {user.displayName?.split(' ')[0] || 'Профиль'}
                  </span>
                  <span className={`w-2 h-2 rounded-full ${syncStatus === 'synced' ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'}`} />
                </div>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 text-[var(--color-accent)]" />
                <span className="hidden sm:inline text-xs font-bold text-[var(--color-accent)]">Вход</span>
              </>
            )}
          </button>

          {/* Bank Synchronization Hub Button */}
          <button
            onClick={() => setIsBankModalOpen(true)}
            title={`Синхронизация банков (${state.bankAccounts?.length || 0} счетов)`}
            className="p-1.5 sm:px-2 sm:py-1 rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-all shadow-xs flex items-center gap-1 active:scale-95 relative"
          >
            <Landmark className="w-4 h-4" />
            <span className="hidden sm:inline text-xs font-bold">Банки</span>
            {pendingBankTransactionsCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-blue-500 absolute -top-0.5 -right-0.5 animate-pulse" />
            )}
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
            aria-label="Переключить тему оформления"
            className="p-1.5 sm:px-2 sm:py-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] hover:border-[var(--color-border-strong)] transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 fill-amber-400/20" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-500" />
            )}
          </button>

          {/* Toggle Frame View on Desktop */}
          <button
            onClick={toggleMobileFrame}
            title={isMobileFrame ? 'Переключить на широкий экран' : 'Переключить на мобильный фрейм'}
            className="hidden md:flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] hover:border-[var(--color-border-strong)] transition-all shadow-xs active:scale-95"
          >
            {isMobileFrame ? (
              <Monitor className="w-3.5 h-3.5 text-blue-500" />
            ) : (
              <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
            )}
          </button>

          {/* Reset Demo Data Button */}
          <button
            onClick={() => {
              if (window.confirm('Сбросить данные к исходным из скриншотов?')) {
                resetToDefaults();
              }
            }}
            title="Сбросить к исходным данным"
            className="p-1.5 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-card-subtle)] transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Settings / Profile Screen Trigger */}
          <button
            onClick={handleOpenSettings}
            title="Профиль и настройки"
            aria-label="Открыть настройки и профиль"
            className="p-1.5 sm:px-2 sm:py-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] hover:border-[var(--color-border-strong)] transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
          >
            <Settings className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="hidden lg:inline text-xs font-bold">Настройки</span>
          </button>

          {/* Quick Add Expense */}
          {onOpenAddExpense && (
            <button
              onClick={onOpenAddExpense}
              className="flex items-center gap-1 bg-[#041627] dark:bg-[#10b981] dark:text-[#041627] hover:bg-[#1a2b3c] dark:hover:bg-[#059669] text-white text-xs font-semibold px-2.5 py-1.5 rounded-xl shadow-xs active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Расход</span>
            </button>
          )}
        </div>
      </header>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <BankSyncModal
        isOpen={isBankModalOpen}
        onClose={() => setIsBankModalOpen(false)}
      />

      <ProfileScreen
        isOpen={isInternalProfileOpen}
        onClose={() => setIsInternalProfileOpen(false)}
      />
    </>
  );
};

export const BottomNavBar: React.FC = () => {
  const { activeTab, setActiveTab, state } = useBudget();

  const unpurchasedWishlistCount = (state.wishlist || []).filter(w => !w.isPurchased).length;

  const tabs: Array<{ id: ActiveTab; label: string; icon: React.ReactNode; badge?: number }> = [
    {
      id: 'today',
      label: 'Сегодня',
      icon: <Calendar className="w-5 h-5" />,
    },
    {
      id: 'planning',
      label: 'Планы',
      icon: <CalendarDays className="w-5 h-5" />,
    },
    {
      id: 'budget',
      label: 'Бюджет',
      icon: <Wallet className="w-5 h-5" />,
    },
    {
      id: 'analytics',
      label: 'Анализ',
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      id: 'wishlist',
      label: 'Вишлист',
      icon: <Heart className="w-5 h-5" />,
      badge: unpurchasedWishlistCount,
    },
    {
      id: 'cushion',
      label: 'Подушка',
      icon: <ShieldCheck className="w-5 h-5" />,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 w-full max-w-md mx-auto bg-[var(--color-bg-card)] border-t border-[var(--color-border-strong)] z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.12)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.5)] transition-colors duration-200">
      {/* Accent top separator line */}
      <div className="w-full h-[1px] bg-[var(--color-border)]" />
      <div className="flex justify-around items-center px-1 pb-3 pt-1.5">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id || (tab.id === 'today' && activeTab === 'confirm-expenses');
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all relative ${
                isActive ? 'text-[var(--color-text-main)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)]'
              }`}
            >
              <div
                className={`flex h-7 w-12 items-center justify-center rounded-full transition-all relative ${
                  isActive 
                    ? 'bg-[var(--color-accent-light)] text-[#00210c] shadow-xs' 
                    : 'bg-transparent'
                }`}
              >
                {tab.icon}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[var(--color-danger)] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-[var(--color-bg-card)]">
                    {tab.badge}
                  </span>
                )}
              </div>
              <p
                className={`text-[9.5px] mt-0.5 tracking-tight transition-all font-semibold uppercase ${
                  isActive ? 'font-bold text-[var(--color-text-main)]' : 'text-[var(--color-text-muted)]'
                }`}
              >
                {tab.label}
              </p>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
