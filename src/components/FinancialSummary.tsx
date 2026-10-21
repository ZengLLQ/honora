import React from 'react';
import type { PaymentSummary, RecordFilter } from '../types/payment';
import { formatIDR } from '../utils/formatters';

interface FinancialSummaryProps {
  summary: PaymentSummary;
  filter: RecordFilter;
}

export const FinancialSummary: React.FC<FinancialSummaryProps> = ({ summary, filter }) => {
  const isFiltered = Boolean(filter.search || filter.month || filter.from_date || filter.to_date);

  return (
    <section className="bg-ivory hairline-b py-8 lg:py-10">
      <div className="max-w-page mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 divide-y md:divide-y-0 md:divide-x divide-editorial-border">
          {/* Card 1: Total Recorded */}
          <div className="pt-2 md:pt-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono tracking-widest text-editorial-muted uppercase">
                TOTAL COLLECTED
              </span>
              <span className="text-[11px] font-mono tracking-wider text-nearblack/60">
                ALL TIME
              </span>
            </div>
            <div className="font-display font-extrabold text-3xl lg:text-4xl text-nearblack font-mono-num tracking-tight">
              {formatIDR(summary.total_amount_idr)}
            </div>
            <p className="mt-2 text-xs text-editorial-muted">
              Lifetime total across {summary.total_records} recorded payment{summary.total_records === 1 ? '' : 's'}.
            </p>
          </div>

          {/* Card 2: Filtered / Active Period Amount */}
          <div className="pt-6 md:pt-0 md:pl-12">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono tracking-widest text-editorial-muted uppercase">
                {isFiltered ? 'FILTERED PERIOD' : 'ACTIVE VIEW'}
              </span>
              {isFiltered && (
                <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono tracking-wider bg-lavender/15 text-lavender font-semibold">
                  FILTERED
                </span>
              )}
            </div>
            <div className="font-display font-extrabold text-3xl lg:text-4xl text-nearblack font-mono-num tracking-tight">
              {formatIDR(summary.filtered_amount_idr)}
            </div>
            <p className="mt-2 text-xs text-editorial-muted">
              {isFiltered
                ? `Representing ${summary.filtered_records} matching record${summary.filtered_records === 1 ? '' : 's'}.`
                : 'Showing complete unfiltered ledger summary.'}
            </p>
          </div>

          {/* Card 3: Transaction Volume & Average */}
          <div className="pt-6 md:pt-0 md:pl-12">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono tracking-widest text-editorial-muted uppercase">
                AVERAGE / RECORD
              </span>
              <span className="text-[11px] font-mono tracking-wider text-nearblack/60">
                {summary.filtered_records} RECORDS
              </span>
            </div>
            <div className="font-display font-extrabold text-3xl lg:text-4xl text-nearblack font-mono-num tracking-tight">
              {summary.filtered_records > 0
                ? formatIDR(Math.round(summary.filtered_amount_idr / summary.filtered_records))
                : 'Rp 0'}
            </div>
            <p className="mt-2 text-xs text-editorial-muted">
              Mean tuition fee per transfer in this selection.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
