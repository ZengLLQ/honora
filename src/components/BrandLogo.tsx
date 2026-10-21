import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'hero';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ className = '', size = 'md' }) => {
  const sizeConfig = {
    sm: {
      container: 'w-6 h-6 border',
      center: 'w-1.5 h-1.5',
      corner: 'w-1 h-1 -top-[1px] -left-[1px]',
      cornerBtm: 'w-1 h-1 -bottom-[1px] -right-[1px]',
      cornerBorder: 'border-t border-l',
      cornerBorderBtm: 'border-b border-r',
    },
    md: {
      container: 'w-7 h-7 border',
      center: 'w-2 h-2',
      corner: 'w-1.5 h-1.5 -top-[1px] -left-[1px]',
      cornerBtm: 'w-1.5 h-1.5 -bottom-[1px] -right-[1px]',
      cornerBorder: 'border-t border-l',
      cornerBorderBtm: 'border-b border-r',
    },
    lg: {
      container: 'w-9 h-9 sm:w-10 sm:h-10 border sm:border-2',
      center: 'w-2.5 h-2.5 sm:w-3 sm:h-3',
      corner: 'w-2 h-2 sm:w-2.5 sm:h-2.5 -top-[1px] sm:-top-[2px] -left-[1px] sm:-left-[2px]',
      cornerBtm: 'w-2 h-2 sm:w-2.5 sm:h-2.5 -bottom-[1px] sm:-bottom-[2px] -right-[1px] sm:-right-[2px]',
      cornerBorder: 'border-t sm:border-t-2 border-l sm:border-l-2',
      cornerBorderBtm: 'border-b sm:border-b-2 border-r sm:border-r-2',
    },
    hero: {
      container: 'w-9 h-9 sm:w-12 sm:h-12 lg:w-14 lg:h-14 border sm:border-2',
      center: 'w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4',
      corner: 'w-2 h-2 sm:w-2.5 sm:h-2.5 lg:w-3.5 lg:h-3.5 -top-[1px] sm:-top-[2px] -left-[1px] sm:-left-[2px]',
      cornerBtm: 'w-2 h-2 sm:w-2.5 sm:h-2.5 lg:w-3.5 lg:h-3.5 -bottom-[1px] sm:-bottom-[2px] -right-[1px] sm:-right-[2px]',
      cornerBorder: 'border-t sm:border-t-2 border-l sm:border-l-2',
      cornerBorderBtm: 'border-b sm:border-b-2 border-r sm:border-r-2',
    },
  }[size];

  return (
    <div
      data-testid="brand-logo"
      className={`relative ${sizeConfig.container} border-heron-border bg-heron-surface flex items-center justify-center shrink-0 shadow-sm ${className}`}
    >
      <div className={`${sizeConfig.center} bg-heron-brand`} />
      <div className={`absolute ${sizeConfig.corner} ${sizeConfig.cornerBorder} border-heron-primary`} />
      <div className={`absolute ${sizeConfig.cornerBtm} ${sizeConfig.cornerBorderBtm} border-heron-primary`} />
    </div>
  );
};
