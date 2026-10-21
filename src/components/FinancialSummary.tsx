import React from 'react';
import type { PaymentSummary, RecordFilter } from '../types/payment';
import { formatIDR } from '../utils/formatters';

interface FinancialSummaryProps {
  summary: PaymentSummary;
  filter: RecordFilter;
  verifiedCount?: number;
}

export const FinancialSummary: React.FC<FinancialSummaryProps> = ({
  summary,
  filter,
}) => {
  const isFiltered = Boolean(
    filter.search?.trim() ||
    filter.month?.trim() ||
    filter.from_date?.trim() ||
    filter.to_date?.trim() ||
    filter.status?.trim()
  );

  return (
    <section className="border-b border-heron-border bg-heron-surface">
      <div className="max-w-page mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-heron-border">
          {/* Metric 1: Total Payments Recorded */}
          <div className="py-6 sm:py-8 md:pr-8 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-sans tracking-wider text-heron-tertiary uppercase font-medium">
                TOTAL PAYMENTS
              </span>
              {isFiltered ? (
                <span className="px-2 py-0.5 text-[10px] font-sans tracking-wider bg-heron-primary text-white font-semibold uppercase">
                  FILTERED
                </span>
              ) : (
                <span className="text-[10px] font-sans tracking-wider text-heron-tertiary uppercase font-medium">
                  ALL TIME
                </span>
              )}
            </div>
            <div className="font-display font-bold text-3xl sm:text-4xl text-heron-primary font-mono-num tracking-tight">
              {isFiltered ? (
                <>
                  {summary.filtered_records}{' '}
                  <span className="text-xl sm:text-2xl text-heron-tertiary font-normal">
                    / {summary.total_records}
                  </span>
                </>
              ) : (
                summary.total_records
              )}
            </div>
          </div>

          {/* Metric 2: Total Amount Received */}
          <div className="py-6 sm:py-8 md:px-8 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-sans tracking-wider text-heron-tertiary uppercase font-medium">
                TOTAL RECEIVED
              </span>
              <span className="text-[10px] font-sans tracking-wider text-heron-tertiary uppercase font-medium">
                ALL TIME
              </span>
            </div>
            <div className="font-display font-bold text-3xl sm:text-4xl text-heron-primary font-mono-num tracking-tight">
              {formatIDR(summary.total_amount_idr)}
            </div>
          </div>

          {/* Metric 3: Total Amount Within Active Date Range */}
          <div className="py-6 sm:py-8 md:pl-8 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-sans tracking-wider text-heron-tertiary uppercase font-medium">
                ACTIVE DATE RANGE
              </span>
              {isFiltered ? (
                <span className="px-2 py-0.5 text-[10px] font-sans tracking-wider bg-heron-brand/10 text-heron-brand border border-heron-brand/30 font-semibold uppercase">
                  FILTERED
                </span>
              ) : (
                <span className="text-[10px] font-sans tracking-wider text-heron-tertiary uppercase font-medium">
                  ALL DATES
                </span>
              )}
            </div>
            <div className="font-display font-bold text-3xl sm:text-4xl text-heron-primary font-mono-num tracking-tight">
              {formatIDR(isFiltered ? summary.filtered_amount_idr : summary.total_amount_idr)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
