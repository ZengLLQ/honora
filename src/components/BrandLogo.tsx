import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'hero';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ className = '', size = 'md' }) => {
  const sizeConfig = {
    sm: {
      container: 'w-6 h-6',
      center: 'w-1.5 h-1.5',
      corner: 'w-1 h-1',
    },
    md: {
      container: 'w-7 h-7',
      center: 'w-2 h-2',
      corner: 'w-1.5 h-1.5',
    },
    lg: {
      container: 'w-9 h-9 sm:w-10 sm:h-10',
      center: 'w-2.5 h-2.5 sm:w-3 sm:h-3',
      corner: 'w-2 h-2 sm:w-2.5 sm:h-2.5',
    },
    hero: {
      container: 'w-9 h-9 sm:w-12 sm:h-12 lg:w-14 lg:h-14',
      center: 'w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4',
      corner: 'w-2 h-2 sm:w-2.5 sm:h-2.5 lg:w-3 lg:h-3',
    },
  }[size];

  return (
    <div
      data-testid="brand-logo"
      className={`relative ${sizeConfig.container} border border-heron-border bg-heron-surface flex items-center justify-center shrink-0 shadow-sm ${className}`}
    >
      <div className={`${sizeConfig.center} bg-heron-brand`} />
      <div className={`absolute -top-[1px] -left-[1px] ${sizeConfig.corner} border-t border-l border-heron-primary`} />
      <div className={`absolute -bottom-[1px] -right-[1px] ${sizeConfig.corner} border-b border-r border-heron-primary`} />
    </div>
  );
};
