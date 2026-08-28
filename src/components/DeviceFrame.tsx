import React from 'react';
import { useBudget } from '../context/BudgetContext';

interface DeviceFrameProps {
  children: React.ReactNode;
}

export const DeviceFrame: React.FC<DeviceFrameProps> = ({ children }) => {
  const { isMobileFrame } = useBudget();

  if (!isMobileFrame) {
    return (
      <div className="w-full min-h-screen bg-[var(--color-bg-app)] flex justify-center transition-colors duration-200">
        <div className="w-full max-w-md min-h-screen bg-[var(--color-bg-app)] relative px-3 sm:px-4">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-device-frame)] py-6 px-4 flex flex-col items-center justify-center transition-colors duration-200">
      {/* Phone device mockup */}
      <div className="relative w-full max-w-[420px] h-[860px] bg-[var(--color-bg-app)] rounded-[48px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] border-[10px] border-[var(--color-device-bezel)] flex flex-col overflow-hidden ring-1 ring-white/10 transition-colors duration-200">
        {/* Dynamic Island / Top Speaker notch */}
        <div className="w-full bg-[var(--color-device-topbar)] pt-3 pb-1 px-7 flex justify-between items-center z-50 select-none border-b border-[var(--color-border-subtle)] transition-colors duration-200">
          <span className="text-[12px] font-bold text-[var(--color-text-main)] tracking-tight">18:15</span>
          <div className="w-24 h-4 bg-[var(--color-text-main)] opacity-90 rounded-full mx-auto" />
          <div className="flex items-center gap-1 text-[var(--color-text-main)] text-[11px] font-bold">
            <span>5G</span>
            <div className="w-5 h-2.5 border border-[var(--color-text-main)] rounded-[2px] p-[1px]">
              <div className="w-full h-full bg-[var(--color-text-main)] rounded-[1px]" />
            </div>
          </div>
        </div>

        {/* Scrollable Screen Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-3 relative bg-[var(--color-bg-app)]">
          {children}
        </div>

        {/* Bottom Home Indicator Bar */}
        <div className="w-full py-1.5 flex justify-center bg-[var(--color-device-topbar)] z-50 transition-colors duration-200">
          <div className="w-32 h-1 bg-[var(--color-text-muted)] opacity-60 rounded-full" />
        </div>
      </div>
    </div>
  );
};
