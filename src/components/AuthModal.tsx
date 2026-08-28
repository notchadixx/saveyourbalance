import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useBudget } from '../context/BudgetContext';
import { 
  X, 
  LogOut, 
  Cloud, 
  CloudCheck, 
  AlertCircle, 
  Loader2, 
  Database,
  Check
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { user, loading, error, signInWithGoogle, signOut, clearError } = useAuth();
  const { syncStatus } = useBudget();

  if (!isOpen) return null;

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-[var(--color-bg-card)] w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-[var(--color-border)] animate-in fade-in slide-in-from-bottom-6 duration-200">
        <div className="flex justify-between items-center pb-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[var(--color-accent-badge-bg)] text-[var(--color-accent)] flex items-center justify-center font-bold">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--color-text-main)]">
                {user ? 'Профиль и Синхронизация' : 'Вход в аккаунт'}
              </h3>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                Firebase Firestore + Google Auth
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              clearError();
              onClose();
            }}
            className="p-1.5 rounded-full hover:bg-[var(--color-bg-card-subtle)] text-[var(--color-text-muted)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-xl bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/30 text-xs text-[var(--color-danger)] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        <div className="my-4 flex flex-col gap-4">
          {user ? (
            /* Logged in state */
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border)]">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Пользователь'}
                    className="w-12 h-12 rounded-full border border-[var(--color-border-strong)] object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#006d37] text-white flex items-center justify-center font-bold text-lg">
                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-[var(--color-text-main)] truncate">
                    {user.displayName || 'Авторизованный пользователь'}
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)] truncate">
                    {user.email}
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-[var(--color-accent)]">
                    <Check className="w-3 h-3" />
                    <span>Google аккаунт подключен</span>
                  </div>
                </div>
              </div>

              {/* Cloud Sync Details */}
              <div className="p-3.5 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)] flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--color-text-main)] flex items-center gap-1.5">
                    <Cloud className="w-4 h-4 text-blue-500" />
                    Статус Firestore:
                  </span>
                  <span className={`font-bold px-2 py-0.5 rounded-md text-[11px] ${
                    syncStatus === 'synced' 
                      ? 'bg-[var(--color-accent-badge-bg)] text-[var(--color-accent-badge-text)] border border-[var(--color-accent-badge-border)]' 
                      : syncStatus === 'saving'
                      ? 'bg-blue-500/10 text-blue-500'
                      : 'bg-amber-500/10 text-amber-500'
                  }`}>
                    {syncStatus === 'synced' ? 'Синхронизировано ✓' : syncStatus === 'saving' ? 'Сохранение...' : 'Автономный режим'}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  Все ваши расходы, лимиты, вишлист и подушка безопасности сохраняются в облачной базе данных Firestore.
                </p>
              </div>

              {/* Sign out button */}
              <button
                onClick={handleSignOut}
                className="w-full py-3 bg-[var(--color-bg-card-subtle)] hover:bg-[var(--color-danger-bg)] text-[var(--color-text-main)] hover:text-[var(--color-danger)] border border-[var(--color-border)] rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Выйти из аккаунта</span>
              </button>
            </div>
          ) : (
            /* Guest / Not logged in state */
            <div className="flex flex-col gap-4">
              <div className="text-center py-3">
                <div className="w-14 h-14 rounded-2xl bg-[var(--color-accent-badge-bg)] text-[var(--color-accent)] flex items-center justify-center mx-auto mb-3 border border-[var(--color-accent-badge-border)]">
                  <Cloud className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-[var(--color-text-main)]">
                  Облачное хранение бюджета
                </h4>
                <p className="text-xs text-[var(--color-text-muted)] max-w-xs mx-auto mt-1">
                  Войдите с помощью Google, чтобы ваши данные автоматически синхронизировались в базе данных Firestore на всех устройствах.
                </p>
              </div>

              {/* Google Sign-in button */}
              <button
                onClick={handleSignIn}
                disabled={loading}
                className="w-full py-3.5 px-4 bg-[#041627] dark:bg-[#10b981] text-white dark:text-[#041627] hover:bg-[#1a2b3c] dark:hover:bg-[#059669] rounded-xl font-bold text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                )}
                <span>Войти через Google</span>
              </button>

              <div className="p-3 rounded-xl bg-[var(--color-bg-card-subtle)] border border-[var(--color-border-subtle)] text-[11px] text-[var(--color-text-secondary)] text-center">
                🔒 Авторизация защищена Firebase Auth. Ваши персональные данные в безопасности.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
