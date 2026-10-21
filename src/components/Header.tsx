import React from 'react';
import { Plus } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface HeaderProps {
  isTauri?: boolean;
  onNewPayment: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isTauri: _isTauri, onNewPayment }) => {
  return (
    <header className="bg-heron-bg/90 backdrop-blur-md text-heron-primary border-b border-heron-border sticky top-0 z-40 transition-colors">
      <div className="max-w-page mx-auto px-6 lg:px-12 h-16 sm:h-20 flex items-center justify-between">
        {/* Brand / Application Identifier */}
        <div className="flex items-center gap-3">
          <BrandLogo size="md" />

          <div className="font-display font-bold text-sm sm:text-base tracking-tight text-heron-primary flex items-center gap-1.5 uppercase leading-none">
            <span className="font-bold">TUTOR</span>
            <span className="text-heron-tertiary font-normal">PAYMENT</span>
            <span className="font-bold">RECORDS</span>
          </div>
        </div>

        {/* Right side: Primary Action */}
        <div className="flex items-center gap-4">
          <button
            onClick={onNewPayment}
            aria-label="ADD PAYMENT"
            title="Record Payment"
            className="btn-heron group relative inline-flex items-center gap-2 bg-heron-primary hover:bg-heron-brand text-white text-xs font-sans font-semibold tracking-wider uppercase px-4 sm:px-5 py-2.5 sm:py-3 border border-heron-primary hover:border-heron-brand transition-all duration-200 active:scale-[0.98] cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 transition-transform group-hover:rotate-90 duration-200 text-white" />
            <span>ADD PAYMENT</span>
          </button>
        </div>
      </div>
    </header>
  );
};
