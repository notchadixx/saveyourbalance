import React from 'react';
import { ChevronRight } from 'lucide-react';

export interface ProfileGroupItemProps {
  id: string;
  icon: React.ReactNode;
  iconBgColor?: string;
  title: string;
  subtitle?: string;
  value?: string | number | React.ReactNode;
  badge?: string | number;
  badgeColor?: string;
  onClick: () => void;
  isDestructive?: boolean;
}

export const ProfileGroupItem: React.FC<ProfileGroupItemProps> = ({
  icon,
  iconBgColor = 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
  title,
  subtitle,
  value,
  badge,
  badgeColor = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  onClick,
  isDestructive = false,
}) => {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between p-3.5 sm:p-4 text-left hover:bg-[var(--color-bg-card-subtle)] active:bg-[var(--color-bg-card-subtle)] transition-colors first:rounded-t-2xl last:rounded-b-2xl ${
        isDestructive ? 'text-rose-600 dark:text-rose-400' : 'text-[var(--color-text-main)]'
      }`}
    >
      <div className="flex items-center gap-3.5 min-w-0 pr-2">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBgColor}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold truncate block">{title}</span>
            {badge !== undefined && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${badgeColor}`}>
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {value !== undefined && (
          <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
            {value}
          </span>
        )}
        <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
      </div>
    </button>
  );
};

export const ProfileGroupSection: React.FC<{
  title?: string;
  children: React.ReactNode;
  footerText?: string;
}> = ({ title, children, footerText }) => {
  return (
    <div className="space-y-1.5">
      {title && (
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] px-3">
          {title}
        </h4>
      )}
      <div className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] shadow-xs divide-y divide-[var(--color-border-subtle)] overflow-hidden">
        {children}
      </div>
      {footerText && (
        <p className="text-[11px] text-[var(--color-text-muted)] px-3">
          {footerText}
        </p>
      )}
    </div>
  );
};
