import React from 'react';
import { Download, Plus, Upload } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface HeaderProps {
  isTauri?: boolean;
  onNewPayment: () => void;
  onExport?: () => void;
  onImportClick?: () => void;
  isExporting?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  isTauri: _isTauri,
  onNewPayment,
  onExport,
  onImportClick,
  isExporting,
}) => {
  return (
    <header className="bg-heron-bg/90 backdrop-blur-md text-heron-primary border-b border-heron-border sticky top-0 z-40 transition-colors">
      <div className="max-w-page mx-auto px-6 lg:px-12 h-16 sm:h-20 flex items-center justify-between">
        {/* Brand / Application Identifier */}
        <div className="flex items-center gap-3">
          <BrandLogo size="md" />

          <div className="font-display font-bold text-base sm:text-lg tracking-tight text-heron-primary flex items-center gap-2 uppercase leading-none">
            <span className="font-bold tracking-widest text-heron-primary">HONORA</span>
          </div>
        </div>

        {/* Right side: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onExport && (
            <button
              onClick={onExport}
              disabled={isExporting}
              aria-label="EXPORT DATABASE"
              title="Export Database Backup (JSON)"
              className="btn-heron inline-flex items-center gap-1.5 sm:gap-2 bg-heron-surface hover:bg-heron-subtle text-heron-primary border border-heron-border hover:border-heron-secondary/40 text-xs font-sans font-semibold tracking-wider uppercase px-3 sm:px-4 py-2 sm:py-2.5 transition-all duration-200 active:scale-[0.98] cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-heron-secondary" />
              <span className="hidden sm:inline">EXPORT</span>
            </button>
          )}

          {onImportClick && (
            <button
              onClick={onImportClick}
              aria-label="IMPORT DATABASE"
              title="Import Database Backup (JSON)"
              className="btn-heron inline-flex items-center gap-1.5 sm:gap-2 bg-heron-surface hover:bg-heron-subtle text-heron-primary border border-heron-border hover:border-heron-secondary/40 text-xs font-sans font-semibold tracking-wider uppercase px-3 sm:px-4 py-2 sm:py-2.5 transition-all duration-200 active:scale-[0.98] cursor-pointer shadow-xs"
            >
              <Upload className="w-3.5 h-3.5 text-heron-secondary" />
              <span className="hidden sm:inline">IMPORT</span>
            </button>
          )}

          <button
            onClick={onNewPayment}
            aria-label="ADD PAYMENT"
            title="Record Payment"
            className="btn-heron group relative inline-flex items-center gap-2 bg-heron-primary hover:bg-heron-brand text-white text-xs font-sans font-semibold tracking-wider uppercase px-4 sm:px-5 py-2 sm:py-2.5 border border-heron-primary hover:border-heron-brand transition-all duration-200 active:scale-[0.98] cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 transition-transform group-hover:rotate-90 duration-200 text-white" />
            <span>ADD PAYMENT</span>
          </button>
        </div>
      </div>
    </header>
  );
};

