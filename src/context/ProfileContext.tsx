import React, { createContext, useContext, useState, useEffect } from 'react';
import { FinancialProfile } from '../types';
import { analyzeIncomeProfile } from '../utils/profileAnalyzer';
import { useAuth } from './AuthContext';
// Предположим, у вас есть хук useBudget для доступа к доходам (или вы передадите их отдельно)
// Мы используем моковые доходы для демонстрации

interface ProfileContextType {
  profile: FinancialProfile | null;
  setProfile: (profile: FinancialProfile | null) => void;
  isOnboardingComplete: boolean;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  resetProfile: () => void;
  // Функция для автоматического анализа на основе списка доходов
  autoDetectProfile: (incomeItems: any[]) => FinancialProfile;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<FinancialProfile | null>(null);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);

  // При загрузке проверяем localStorage (для демонстрации)
  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem('financialProfile');
      if (savedProfile) {
        setProfile(JSON.parse(savedProfile));
        setIsOnboardingComplete(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const completeOnboarding = () => {
    setIsOnboardingComplete(true);
    if (profile) {
      localStorage.setItem('financialProfile', JSON.stringify(profile));
    }
  };

  const resetOnboarding = () => {
    setIsOnboardingComplete(false);
    localStorage.removeItem('financialProfile');
  };

  const resetProfile = () => {
    setProfile(null);
    setIsOnboardingComplete(false);
    localStorage.removeItem('financialProfile');
  };

  const autoDetectProfile = (incomeItems: any[]): FinancialProfile => {
    const { suggestedProfile } = analyzeIncomeProfile(incomeItems);
    setProfile(suggestedProfile);
    return suggestedProfile;
  };

  return (
    <ProfileContext.Provider
      value={{
        profile,
        setProfile: (p) => { 
          setProfile(p); 
          if (p) {
            localStorage.setItem('financialProfile', JSON.stringify(p));
          } else {
            localStorage.removeItem('financialProfile');
          }
        },
        isOnboardingComplete,
        completeOnboarding,
        resetOnboarding,
        resetProfile,
        autoDetectProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};