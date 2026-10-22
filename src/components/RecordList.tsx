import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import type { PaymentRecord, RecordFilter } from '../types/payment';
import { RecordItem } from './RecordItem';

interface RecordListProps {
  records: PaymentRecord[];
  filter: RecordFilter;
  loading: boolean;
  onNewPayment: () => void;
  onViewReceipt: (record: PaymentRecord) => void;
  onEdit: (record: PaymentRecord) => void;
  onDelete: (record: PaymentRecord) => void;
  onClearFilter: () => void;
  onToggleStatus?: (record: PaymentRecord) => void;
  togglingIds?: Set<string>;
}

export const RecordList: React.FC<RecordListProps> = ({
  records,
  filter,
  loading,
  onNewPayment,
  onViewReceipt,
  onEdit,
  onDelete,
  onClearFilter,
  onToggleStatus,
  togglingIds,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const isFiltered = Boolean(
    filter.search?.trim() ||
    filter.month?.trim() ||
    filter.from_date?.trim() ||
    filter.to_date?.trim() ||
    filter.status?.trim()
  );

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block w-6 h-6 border-2 border-heron-brand border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-sans tracking-wider text-heron-tertiary uppercase font-medium">
          Loading...
        </p>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="py-20 px-6 text-center">
        <div className="max-w-md mx-auto">
          {/* Subtle architectural framing icon */}
          <div className="w-10 h-10 mx-auto mb-5 border border-heron-border bg-heron-surface flex items-center justify-center">
            <div className="w-2.5 h-2.5 bg-heron-brand" />
          </div>

          {isFiltered ? (
            <div>
              <h3 className="font-display font-bold text-lg text-heron-primary tracking-tight mb-2 uppercase">
                NO MATCHING RECORDS.
              </h3>
              <p className="text-xs text-heron-tertiary mb-6 font-sans">
                No payments found matching the selected criteria.
              </p>
              <button
                type="button"
                onClick={onClearFilter}
                className="btn-heron inline-flex items-center gap-2 px-5 py-2.5 text-xs font-sans font-medium tracking-wider uppercase bg-heron-surface hover:bg-heron-primary dark:hover:bg-heron-brand text-heron-primary hover:text-white border border-heron-border hover:border-heron-primary dark:hover:border-heron-brand transition-all duration-200 cursor-pointer shadow-sm"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div>
              <h3 className="font-display font-bold text-xl text-heron-primary tracking-tight mb-2 uppercase">
                NO PAYMENTS YET
              </h3>
              <p className="text-xs text-heron-tertiary mb-6 font-sans">
                Start by recording your first tutoring payment.
              </p>
              <button
                type="button"
                onClick={onNewPayment}
                aria-label="ADD PAYMENT"
                className="btn-heron inline-flex items-center gap-2 px-6 py-3 text-xs font-sans tracking-wider uppercase bg-heron-primary hover:bg-heron-brand dark:bg-heron-brand dark:hover:bg-heron-brand-hover text-white font-semibold border border-heron-primary hover:border-heron-brand dark:border-heron-brand transition-all duration-200 cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>ADD PAYMENT</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const activeHighlightId =
    selectedId && records.some((r) => r.id === selectedId) ? selectedId : null;

  return (
    <div className="bg-transparent">
      {/* Table Subhead Bar */}
      <div className="py-3 border-b border-heron-border bg-heron-subtle/40">
        <div className="max-w-page mx-auto px-6 lg:px-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-heron-brand" />
            <span className="text-xs font-sans font-bold tracking-wider text-heron-primary uppercase flex items-center gap-1.5">
              <span>PAYMENT</span>
              <span className="text-heron-tertiary font-normal">RECORDS</span>
            </span>
          </div>
          <div className="text-xs font-sans text-heron-tertiary tracking-wider font-medium">
            {records.length} {records.length === 1 ? 'RECORD' : 'RECORDS'}
          </div>
        </div>
      </div>

      {/* Table Column Headers (Desktop) */}
      <div className="hidden md:block border-b border-heron-border bg-heron-subtle/20 text-[10px] font-sans tracking-wider text-heron-tertiary uppercase font-medium">
        <div className="max-w-page mx-auto px-6 lg:px-12 py-2.5 flex items-center justify-between">
          <div className="w-5/12">Date & Student</div>
          <div className="w-3/12">Receipt</div>
          <div className="w-2/12 text-right">Amount</div>
          <div className="w-2/12 text-right">Actions</div>
        </div>
      </div>

      {/* Record Rows */}
      <div>
        {records.map((record) => (
          <RecordItem
            key={record.id}
            record={record}
            isHighlighted={record.id === activeHighlightId}
            onSelect={() => setSelectedId(record.id)}
            onViewReceipt={onViewReceipt}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleStatus={onToggleStatus}
            isToggling={togglingIds?.has(record.id)}
          />
        ))}
      </div>
    </div>
  );
};
