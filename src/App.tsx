import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { BudgetProvider, useBudget } from './context/BudgetContext';
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
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isAddWishlistOpen, setIsAddWishlistOpen] = useState(false);
  const [isAddPlannedOpen, setIsAddPlannedOpen] = useState(false);

  return (
    <DeviceFrame>
      <TopBar 
        onOpenAddExpense={() => setIsAddExpenseOpen(true)}
      />

      <main className="w-full">
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

      {/* Modals */}
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
      <BudgetProvider>
        <AppContent />
      </BudgetProvider>
    </AuthProvider>
  );
}
