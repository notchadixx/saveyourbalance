import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { BudgetProvider, useBudget } from './context/BudgetContext';
import { ProfileProvider, useProfile } from './context/ProfileContext';
import { OnboardingFlow } from './components/Onboarding/OnboardingFlow';
import { TopBar, BottomNavBar } from './components/Navigation';
import { TodayScreen } from './components/TodayScreen';
import { BudgetScreen } from './components/BudgetScreen';
import { AnalyticsScreen } from './components/AnalyticsScreen';
import { PlanningScreen } from './components/PlanningScreen';
import { WishlistScreen } from './components/WishlistScreen';
import { CushionScreen } from './components/CushionScreen';
import { ConfirmExpensesScreen } from './components/ConfirmExpensesScreen';
import { AddExpenseModal } from './components/AddExpenseModal';
import { AddWishlistModal } from './components/AddWishlistModal';
import { AddPlannedModal } from './components/AddPlannedModal';
import { DeviceFrame } from './components/DeviceFrame';

function AppContent() {
  const { activeTab } = useBudget();
  const { isOnboardingComplete } = useProfile();
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isAddWishlistOpen, setIsAddWishlistOpen] = useState(false);
  const [isAddPlannedOpen, setIsAddPlannedOpen] = useState(false);

  // Если онбординг не пройден – показываем его
  if (!isOnboardingComplete) {
    return <OnboardingFlow />;
  }

  // Иначе показываем основное приложение
  return (
    <DeviceFrame>
      <TopBar 
        onOpenAddExpense={() => setIsAddExpenseOpen(true)}
      />

      <main className="w-full pb-28 sm:pb-32">
        {activeTab === 'today' && (
          <TodayScreen 
            onOpenAddExpense={() => setIsAddExpenseOpen(true)} 
          />
        )}
        {activeTab === 'confirm-expenses' && (
          <ConfirmExpensesScreen 
            onOpenAddExpense={() => setIsAddExpenseOpen(true)} 
          />
        )}
        {activeTab === 'budget' && (
          <BudgetScreen 
            onOpenAddExpense={() => setIsAddExpenseOpen(true)} 
          />
        )}
        {activeTab === 'analytics' && (
          <AnalyticsScreen />
        )}
        {activeTab === 'planning' && (
          <PlanningScreen 
            onOpenAddPlanned={() => setIsAddPlannedOpen(true)} 
          />
        )}
        {activeTab === 'wishlist' && (
          <WishlistScreen 
            onOpenAddWishlist={() => setIsAddWishlistOpen(true)} 
          />
        )}
        {activeTab === 'cushion' && (
          <CushionScreen 
            onOpenDepositModal={() => setIsAddExpenseOpen(true)} 
          />
        )}
      </main>

      <BottomNavBar />

      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
      />
      <AddWishlistModal
        isOpen={isAddWishlistOpen}
        onClose={() => setIsAddWishlistOpen(false)}
      />
      <AddPlannedModal
        isOpen={isAddPlannedOpen}
        onClose={() => setIsAddPlannedOpen(false)}
      />
    </DeviceFrame>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ProfileProvider>           {/* теперь ProfileProvider выше */}
        <BudgetProvider>
          <AppContent />
        </BudgetProvider>
      </ProfileProvider>
    </AuthProvider>
  );
}