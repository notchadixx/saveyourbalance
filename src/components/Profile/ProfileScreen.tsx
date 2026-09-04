import React, { useState } from 'react';
import { useBudget, formatRubles } from '../../context/BudgetContext';
import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../context/ProfileContext';
import { 
  ArrowLeft, 
  X, 
  Settings, 
  User, 
  Calendar, 
  ShoppingBasket, 
  Repeat, 
  CreditCard, 
  Landmark, 
  Database, 
  Sliders, 
  LogOut, 
  Sparkles, 
  ChevronRight, 
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { ProfileGroupItem, ProfileGroupSection } from './ProfileGroup';
import { EditGeneralSettings } from './EditGeneralSettings';
import { EditFinancialProfile } from './EditFinancialProfile';
import { EditFoodSettings } from './EditFoodSettings';
import { EditRegularExpenses } from './EditRegularExpenses';
import { EditCreditCards } from './EditCreditCards';
import { BankAccountsSettings } from './BankAccountsSettings';
import { DataManagement } from './DataManagement';

export type ProfileSubView = 
  | 'main' 
  | 'general' 
  | 'financial' 
  | 'food' 
  | 'regular' 
  | 'creditCards' 
  | 'banks' 
  | 'data';

interface ProfileScreenProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: ProfileSubView;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ 
  isOpen, 
  onClose,
  initialView = 'main'
}) => {
  const { state, theme } = useBudget();
  const { user, logout } = useAuth();
  const { profile } = useProfile();

  // Stack navigation
  const [navStack, setNavStack] = useState<ProfileSubView[]>([initialView]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const currentView = navStack[navStack.length - 1] || 'main';

  const pushView = (view: ProfileSubView) => {
    setNavStack(prev => [...prev, view]);
  };

  const popView = () => {
    if (navStack.length > 1) {
      setNavStack(prev => prev.slice(0, prev.length - 1));
    } else {
      onClose();
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  if (!isOpen) return null;

  // Header Title mapping
  const viewTitles: Record<ProfileSubView, string> = {
    main: 'Профиль и настройки',
    general: 'Основные настройки',
    financial: 'Финансовый профиль',
    food: 'Управление продуктами',
    regular: 'Регулярные расходы',
    creditCards: 'Кредитные карты',
    banks: 'Банковские счета',
    data: 'Управление данными',
  };

  // Stats for badges and subtitles
  const foodModeLabel = state.foodControl?.mode === 'simple'
    ? 'Простой'
    : state.foodControl?.mode === 'hybrid'
    ? 'Гибридный'
    : 'Корзина';

  const regularItemsCount = (state.plannedItems || []).filter(
    i => i.type === 'regular' || i.autoRenew || i.category === 'обязательные'
  ).length;

  const cardsCount = state.creditCards?.length || 0;
  const totalDebt = (state.creditCards || []).reduce((sum, c) => sum + (c.currentDebt || 0), 0);
  const accountsCount = state.bankAccounts?.length || 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-[var(--color-bg-app)] text-[var(--color-text-main)] w-full max-w-xl h-full sm:h-[90vh] sm:max-h-[800px] rounded-2xl sm:rounded-3xl border border-[var(--color-border)] shadow-2xl flex flex-col overflow-hidden">
        
        {/* Top Header */}
        <div className="px-4 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-bg-card)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            {navStack.length > 1 ? (
              <button
                onClick={popView}
                className="p-1.5 -ml-1.5 rounded-xl hover:bg-[var(--color-bg-card-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] transition-colors flex items-center gap-1 text-xs font-bold"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Назад</span>
              </button>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <Settings className="w-4 h-4" />
              </div>
            )}
            
            <h2 className="text-base font-extrabold text-[var(--color-text-main)] truncate">
              {viewTitles[currentView]}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-card-subtle)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast Feedback */}
        {toastMessage && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-2 duration-150 shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
          {/* ROOT SCREEN */}
          {currentView === 'main' && (
            <div className="space-y-5">
              {/* User Identity Card */}
              <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 border border-[var(--color-border)] shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-extrabold text-base border border-blue-500/20">
                    {user?.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt="User Avatar"
                        className="w-full h-full rounded-2xl object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      (state.userName || user?.displayName || 'User').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--color-text-main)]">
                      {state.userName || user?.displayName || 'Пользователь бюджета'}
                    </h3>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      {user ? user.email : 'Локальный режим'}
                    </p>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                      Период: {state.periodStartDate} — {state.salaryDateDay}-е число
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => pushView('general')}
                  className="px-3 py-1.5 rounded-xl border border-[var(--color-border-subtle)] text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-card-subtle)] transition-all"
                >
                  Изменить
                </button>
              </div>

              {/* Group 1: Финансы и бюджет */}
              <ProfileGroupSection title="Финансы и бюджет">
                <ProfileGroupItem
                  id="financial"
                  icon={<Calendar className="w-4 h-4" />}
                  iconBgColor="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  title="Финансовый профиль"
                  subtitle={`Зарплата: ${formatRubles(state.currentSalary || 82650)} • ${state.salaryDateDay}-е число`}
                  value={`${state.salaryDateDay}-е число`}
                  onClick={() => pushView('financial')}
                />

                <ProfileGroupItem
                  id="food"
                  icon={<ShoppingBasket className="w-4 h-4" />}
                  iconBgColor="bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  title="Управление продуктами"
                  subtitle={`Режим: ${foodModeLabel} • ${state.foodControl?.basketItems?.length || 0} товаров`}
                  value={foodModeLabel}
                  onClick={() => pushView('food')}
                />

                <ProfileGroupItem
                  id="regular"
                  icon={<Repeat className="w-4 h-4" />}
                  iconBgColor="bg-blue-500/10 text-blue-600 dark:text-blue-400"
                  title="Регулярные расходы"
                  subtitle="ЖКХ, подписки, аренда, связь"
                  badge={regularItemsCount}
                  onClick={() => pushView('regular')}
                />
              </ProfileGroupSection>

              {/* Group 2: Карты и счета */}
              <ProfileGroupSection title="Счета и карты">
                <ProfileGroupItem
                  id="creditCards"
                  icon={<CreditCard className="w-4 h-4" />}
                  iconBgColor="bg-purple-500/10 text-purple-600 dark:text-purple-400"
                  title="Кредитные карты"
                  subtitle={cardsCount > 0 ? `Долг: ${formatRubles(totalDebt)}` : 'Нет активных карт'}
                  badge={cardsCount}
                  badgeColor="bg-purple-500/10 text-purple-600 border-purple-500/20"
                  onClick={() => pushView('creditCards')}
                />

                <ProfileGroupItem
                  id="banks"
                  icon={<Landmark className="w-4 h-4" />}
                  iconBgColor="bg-sky-500/10 text-sky-600 dark:text-sky-400"
                  title="Банковские счета"
                  subtitle="Синхронизация балансов и выписок"
                  badge={accountsCount}
                  badgeColor="bg-sky-500/10 text-sky-600 border-sky-500/20"
                  onClick={() => pushView('banks')}
                />
              </ProfileGroupSection>

              {/* Group 3: Система и данные */}
              <ProfileGroupSection title="Система и управление">
                <ProfileGroupItem
                  id="general"
                  icon={<Sliders className="w-4 h-4" />}
                  iconBgColor="bg-slate-500/10 text-slate-600 dark:text-slate-400"
                  title="Основные"
                  subtitle={`Валюта: ${state.currency || 'RUB'} • Тема: ${theme === 'dark' ? 'Тёмная' : 'Светлая'}`}
                  onClick={() => pushView('general')}
                />

                <ProfileGroupItem
                  id="data"
                  icon={<Database className="w-4 h-4" />}
                  iconBgColor="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                  title="Управление данными"
                  subtitle="Экспорт в JSON/CSV, импорт, сброс"
                  onClick={() => pushView('data')}
                />
              </ProfileGroupSection>

              {/* Auth Sign Out Button */}
              {user && (
                <button
                  onClick={() => {
                    logout();
                    showToast('Вы вышли из учетной записи');
                    onClose();
                  }}
                  className="w-full py-3 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)] text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-all flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Выйти из аккаунта</span>
                </button>
              )}
            </div>
          )}

          {/* SUB SCREENS */}
          {currentView === 'general' && (
            <EditGeneralSettings onBack={popView} showToast={showToast} />
          )}

          {currentView === 'financial' && (
            <EditFinancialProfile onBack={popView} showToast={showToast} />
          )}

          {currentView === 'food' && (
            <EditFoodSettings onBack={popView} showToast={showToast} />
          )}

          {currentView === 'regular' && (
            <EditRegularExpenses onBack={popView} showToast={showToast} />
          )}

          {currentView === 'creditCards' && (
            <EditCreditCards onBack={popView} showToast={showToast} />
          )}

          {currentView === 'banks' && (
            <BankAccountsSettings onBack={popView} showToast={showToast} />
          )}

          {currentView === 'data' && (
            <DataManagement onBack={popView} showToast={showToast} />
          )}
        </div>
      </div>
    </div>
  );
};
