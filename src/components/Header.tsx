import React from 'react';
import { Plus, ShieldCheck, Laptop } from 'lucide-react';

interface HeaderProps {
  isTauri: boolean;
  onNewPayment: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isTauri, onNewPayment }) => {
  return (
    <header className="bg-nearblack text-ivory border-b border-editorial-borderDark sticky top-0 z-30 transition-colors">
      <div className="max-w-page mx-auto px-6 lg:px-12 h-20 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center gap-4">
          <div className="w-3 h-3 bg-lavender rounded-none rotate-45" />
          <div>
            <h1 className="font-display font-extrabold text-xl tracking-tight text-white flex items-center gap-2">
              TUTOR <span className="font-editorial italic font-normal text-lavender text-2xl">Payment</span> RECORDS
            </h1>
            <p className="text-[11px] font-mono tracking-widest text-editorial-muted uppercase">
              Financial Receipt Ledger
            </p>
          </div>
        </div>

        {/* Right side: Environment Badge & Primary Action */}
        <div className="flex items-center gap-4 sm:gap-6">
          <div
            className="hidden sm:flex items-center gap-2 px-3 py-1 bg-nearblack-surface border border-editorial-borderDark text-[11px] font-mono tracking-wider text-editorial-muted"
            title={isTauri ? 'Running as native Tauri desktop application' : 'Running as client-side persistent web application'}
          >
            {isTauri ? (
              <>
                <Laptop className="w-3.5 h-3.5 text-lavender" />
                <span>DESKTOP (TAURI 2)</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-status-success" />
                <span>WEB PERSISTENT (INDEXEDDB)</span>
              </>
            )}
            <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse ml-1" />
          </div>

          <button
            onClick={onNewPayment}
            className="flex items-center gap-2 bg-lavender hover:bg-lavender-hover text-nearblack font-semibold text-xs tracking-wider uppercase px-5 py-3 transition-colors duration-150 active:scale-[0.98] editorial-focus"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>
    </header>
  );
};
