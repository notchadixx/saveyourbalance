import React, { createContext, useContext, useEffect, useState } from 'react';
import { CLOUD_SYNC_ENABLED } from '../config';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult, 
  fbSignOut, 
  onAuthStateChanged, 
  doc, 
  safeSetDoc, 
  serverTimestamp, 
  db,
  User 
} from '../lib/firebase';

interface FirebaseAuthErrorLike {
  code?: string;
  message?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  authTimedOut?: boolean;
  retryAuth?: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(CLOUD_SYNC_ENABLED);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If cloud sync is disabled, do not touch Firebase Auth at all
    if (!CLOUD_SYNC_ENABLED) {
      setLoading(false);
      return;
    }

    // Check redirect result if redirected
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          const u = result.user;
          try {
            await safeSetDoc(doc(db, 'users', u.uid), {
              uid: u.uid,
              email: u.email,
              displayName: u.displayName,
              photoURL: u.photoURL,
              lastLoginAt: serverTimestamp(),
            }, { merge: true });
          } catch (e) {
            console.error('Failed to sync redirect user profile to firestore:', e);
          }
        }
      })
      .catch((err) => {
        console.error('Redirect sign-in error:', err);
      });

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          await safeSetDoc(doc(db, 'users', currentUser.uid), {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
            lastSeenAt: serverTimestamp(),
          }, { merge: true });
        } catch (e) {
          console.error('Failed to sync user profile to firestore:', e);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (!CLOUD_SYNC_ENABLED) {
      return;
    }
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        try {
          await safeSetDoc(doc(db, 'users', result.user.uid), {
            uid: result.user.uid,
            email: result.user.email,
            displayName: result.user.displayName,
            photoURL: result.user.photoURL,
            lastLoginAt: serverTimestamp(),
          }, { merge: true });
        } catch (e) {
          console.error('Failed to sync signed-in user profile to firestore:', e);
        }
      }
    } catch (err: unknown) {
      const authErr = err as FirebaseAuthErrorLike;
      if (authErr.code === 'auth/popup-blocked' || authErr.code === 'auth/cancelled-popup-request') {
        try {
          await signInWithRedirect(auth, googleProvider);
        } catch (redirectErr: unknown) {
          const rErr = redirectErr as FirebaseAuthErrorLike;
          setError(rErr.message || 'Ошибка авторизации через Google');
        }
      } else if (authErr.code !== 'auth/popup-closed-by-user') {
        setError(authErr.message || 'Ошибка авторизации через Google');
      }
    }
  };

  const signOut = async () => {
    if (!CLOUD_SYNC_ENABLED) {
      setUser(null);
      return;
    }
    try {
      await fbSignOut(auth);
    } catch (err: unknown) {
      const authErr = err as FirebaseAuthErrorLike;
      setError(authErr.message || 'Ошибка при выходе из аккаунта');
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      error, 
      signInWithGoogle, 
      signOut, 
      logout: signOut, 
      clearError,
      authTimedOut: false,
      retryAuth: () => {}
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
