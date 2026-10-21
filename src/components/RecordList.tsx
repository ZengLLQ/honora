import React from 'react';
import { Plus, Inbox } from 'lucide-react';
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
}) => {
  const isFiltered = Boolean(filter.search || filter.month || filter.from_date || filter.to_date);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block w-6 h-6 border-2 border-lavender border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-mono tracking-widest text-editorial-muted uppercase">
          Loading payment ledger...
        </p>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="py-24 max-w-xl mx-auto px-6 text-center">
        <div className="w-12 h-12 mx-auto mb-6 flex items-center justify-center bg-white border border-editorial-border">
          <Inbox className="w-6 h-6 text-editorial-muted" />
        </div>

        {isFiltered ? (
          <div>
            <h3 className="font-display font-bold text-xl text-nearblack tracking-tight mb-2">
              NO MATCHING RECORDS.
            </h3>
            <p className="text-sm text-editorial-muted mb-6">
              No transactions match your current search or date parameters.
            </p>
            <button
              onClick={onClearFilter}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-mono tracking-wider uppercase bg-white border border-editorial-border hover:border-nearblack text-nearblack transition-colors"
            >
              Clear Active Filters
            </button>
          </div>
        ) : (
          <div>
            <h3 className="font-display font-bold text-xl text-nearblack tracking-tight mb-2">
              NO PAYMENT RECORDS YET.
            </h3>
            <p className="text-sm text-editorial-muted mb-6">
              Start recording student transfers with automatically compressed receipts and verified amounts.
            </p>
            <button
              onClick={onNewPayment}
              className="inline-flex items-center gap-2 px-6 py-3 text-xs font-semibold tracking-wider uppercase bg-lavender hover:bg-lavender-hover text-nearblack transition-colors"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Record First Payment</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-ivory">
      {/* Table Column Headers (Desktop) */}
      <div className="hidden md:block border-b border-editorial-border bg-ivory/80 text-[10px] font-mono tracking-widest text-editorial-muted uppercase">
        <div className="max-w-page mx-auto px-6 lg:px-12 py-3 flex items-center justify-between">
          <div className="w-1/3">Date & Student</div>
          <div className="w-1/4">Receipt File</div>
          <div className="w-1/5 text-right">Transfer Amount</div>
          <div className="w-1/6 text-right">Actions</div>
        </div>
      </div>

      {/* Record Rows */}
      <div className="divide-y divide-editorial-border">
        {records.map((record) => (
          <RecordItem
            key={record.id}
            record={record}
            onViewReceipt={onViewReceipt}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
};
