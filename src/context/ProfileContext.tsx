import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { FinancialProfile, IncomeItem } from '../types';
import { analyzeIncomeProfile } from '../utils/profileAnalyzer';
import { useAuth } from './AuthContext';
import { db, doc, safeSetDoc, getDoc, onSnapshot } from '../lib/firebase';
import { CLOUD_SYNC_ENABLED } from '../config';

const PROFILE_STORAGE_KEY = 'financialProfile';
const ONBOARDING_STATUS_KEY = 'isOnboardingComplete';

interface ProfileContextType {
  profile: FinancialProfile | null;
  setProfile: (profile: FinancialProfile | null) => void;
  isOnboardingComplete: boolean;
  isProfileLoading: boolean;
  profileSyncTimedOut?: boolean;
  completeOnboarding: (customProfile?: FinancialProfile) => Promise<void>;
  resetOnboarding: () => Promise<void>;
  resetProfile: () => Promise<void>;
  autoDetectProfile: (incomeItems: IncomeItem[]) => FinancialProfile;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  // Быстрая инициализация из локального кэша для мгновенного первого рендера
  const [profile, setProfileState] = useState<FinancialProfile | null>(() => {
    try {
      const saved = localStorage.getItem(PROFILE_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean>(() => {
    try {
      const savedStatus = localStorage.getItem(ONBOARDING_STATUS_KEY);
      if (savedStatus !== null) {
        return savedStatus === 'true';
      }
      return Boolean(localStorage.getItem(PROFILE_STORAGE_KEY));
    } catch {
      return false;
    }
  });

  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(CLOUD_SYNC_ENABLED);

  // Флаги и рефы для предотвращения циклической записи при получении снапшотов
  const isRemoteUpdateRef = useRef(false);
  const profileRef = useRef<FinancialProfile | null>(profile);
  profileRef.current = profile;
  const isOnboardingCompleteRef = useRef<boolean>(isOnboardingComplete);
  isOnboardingCompleteRef.current = isOnboardingComplete;

  // Синхронизация профиля с Firestore при входе пользователя
  useEffect(() => {
    if (!CLOUD_SYNC_ENABLED || !user) {
      setIsProfileLoading(false);
      return;
    }

    setIsProfileLoading(true);
    const profileDocRef = doc(db, 'users', user.uid, 'budgetData', 'profile');

    const unsubscribe = onSnapshot(
      profileDocRef,
      async (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          let cloudProfile: FinancialProfile | null = null;
          let cloudIsComplete = false;

          if (data) {
            if (data.profile !== undefined) {
              cloudProfile = data.profile;
              cloudIsComplete = data.isOnboardingComplete ?? Boolean(cloudProfile);
            } else if (data.profileType) {
              // Документ сохранен напрямую как FinancialProfile
              cloudProfile = data as FinancialProfile;
              cloudIsComplete = true;
            } else if (data.isOnboardingComplete !== undefined) {
              cloudIsComplete = Boolean(data.isOnboardingComplete);
            }
          }

          isRemoteUpdateRef.current = true;
          setProfileState(cloudProfile);
          setIsOnboardingComplete(cloudIsComplete);
          setIsProfileLoading(false);

          try {
            if (cloudProfile) {
              localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(cloudProfile));
            } else {
              localStorage.removeItem(PROFILE_STORAGE_KEY);
            }
            localStorage.setItem(ONBOARDING_STATUS_KEY, String(cloudIsComplete));
          } catch {}
          return;
        }

        // Если документа budgetData/profile в облаке ещё нет:
        // 1. Проверяем локальные данные онбординга (например, пройденного до авторизации)
        if (profileRef.current && isOnboardingCompleteRef.current) {
          try {
            await safeSetDoc(profileDocRef, {
              profile: profileRef.current,
              isOnboardingComplete: true,
              updatedAt: new Date().toISOString(),
              userId: user.uid,
            }, { merge: true });
          } catch (err) {
            console.error('Failed to sync local profile to Firestore:', err);
          }
          setIsProfileLoading(false);
          return;
        }

        // 2. Проверяем обратную совместимость с общим состоянием бюджета users/{uid}/budgetData/state
        try {
          const stateDocRef = doc(db, 'users', user.uid, 'budgetData', 'state');
          const stateSnap = await getDoc(stateDocRef);
          if (stateSnap.exists()) {
            const stateData = stateSnap.data();
            if (stateData) {
              if (stateData.financialProfile) {
                const recoveredProfile = stateData.financialProfile as FinancialProfile;
                isRemoteUpdateRef.current = true;
                setProfileState(recoveredProfile);
                setIsOnboardingComplete(true);
                try {
                  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(recoveredProfile));
                  localStorage.setItem(ONBOARDING_STATUS_KEY, 'true');
                } catch {}

                await safeSetDoc(profileDocRef, {
                  profile: recoveredProfile,
                  isOnboardingComplete: true,
                  updatedAt: new Date().toISOString(),
                  userId: user.uid,
                }, { merge: true });

                setIsProfileLoading(false);
                return;
              } else if (stateData.days && stateData.days.length > 0) {
                // Если в облаке уже есть активный бюджет, онбординг считается пройденным
                isRemoteUpdateRef.current = true;
                setIsOnboardingComplete(true);
                try {
                  localStorage.setItem(ONBOARDING_STATUS_KEY, 'true');
                } catch {}

                await safeSetDoc(profileDocRef, {
                  profile: null,
                  isOnboardingComplete: true,
                  updatedAt: new Date().toISOString(),
                  userId: user.uid,
                }, { merge: true });

                setIsProfileLoading(false);
                return;
              }
            }
          }
        } catch {}

        setIsProfileLoading(false);
      },
      (err) => {
        console.error('Firestore profile snapshot error:', err);
        setIsProfileLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const setProfile = useCallback((newProfile: FinancialProfile | null) => {
    setProfileState(newProfile);
    try {
      if (newProfile) {
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(newProfile));
      } else {
        localStorage.removeItem(PROFILE_STORAGE_KEY);
      }
    } catch {}

    if (CLOUD_SYNC_ENABLED && user && !isRemoteUpdateRef.current) {
      const profileDocRef = doc(db, 'users', user.uid, 'budgetData', 'profile');
      safeSetDoc(profileDocRef, {
        profile: newProfile,
        isOnboardingComplete: isOnboardingCompleteRef.current,
        updatedAt: new Date().toISOString(),
        userId: user.uid,
      }, { merge: true }).catch(err => {
        console.error('Error saving profile to Firestore:', err);
      });
    }
  }, [user]);

  const completeOnboarding = useCallback(async (customProfile?: FinancialProfile) => {
    const profToSave = customProfile !== undefined ? customProfile : profileRef.current;
    setIsOnboardingComplete(true);

    try {
      localStorage.setItem(ONBOARDING_STATUS_KEY, 'true');
      if (profToSave) {
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profToSave));
      }
    } catch {}

    if (CLOUD_SYNC_ENABLED && user) {
      const profileDocRef = doc(db, 'users', user.uid, 'budgetData', 'profile');
      try {
        await safeSetDoc(profileDocRef, {
          profile: profToSave,
          isOnboardingComplete: true,
          updatedAt: new Date().toISOString(),
          userId: user.uid,
        }, { merge: true });
      } catch (err) {
        console.error('Error saving onboarding complete to Firestore:', err);
      }
    }
  }, [user]);

  const resetOnboarding = useCallback(async () => {
    setIsOnboardingComplete(false);
    try {
      localStorage.removeItem(PROFILE_STORAGE_KEY);
      localStorage.removeItem(ONBOARDING_STATUS_KEY);
    } catch {}

    if (CLOUD_SYNC_ENABLED && user) {
      const profileDocRef = doc(db, 'users', user.uid, 'budgetData', 'profile');
      try {
        await safeSetDoc(profileDocRef, {
          isOnboardingComplete: false,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      } catch (err) {
        console.error('Error resetting onboarding in Firestore:', err);
      }
    }
  }, [user]);

  const resetProfile = useCallback(async () => {
    setProfileState(null);
    setIsOnboardingComplete(false);
    try {
      localStorage.removeItem(PROFILE_STORAGE_KEY);
      localStorage.removeItem(ONBOARDING_STATUS_KEY);
    } catch {}

    if (CLOUD_SYNC_ENABLED && user) {
      const profileDocRef = doc(db, 'users', user.uid, 'budgetData', 'profile');
      try {
        await safeSetDoc(profileDocRef, {
          profile: null,
          isOnboardingComplete: false,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      } catch (err) {
        console.error('Error resetting profile in Firestore:', err);
      }
    }
  }, [user]);

  const autoDetectProfile = useCallback((incomeItems: IncomeItem[]): FinancialProfile => {
    const { suggestedProfile } = analyzeIncomeProfile(incomeItems);
    setProfile(suggestedProfile);
    return suggestedProfile;
  }, [setProfile]);

  return (
    <ProfileContext.Provider
      value={{
        profile,
        setProfile,
        isOnboardingComplete,
        isProfileLoading,
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