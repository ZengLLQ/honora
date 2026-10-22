import React from 'react';
import { FileText, Eye, Edit3, Trash2 } from 'lucide-react';
import type { PaymentRecord } from '../types/payment';
import { formatDateDisplay, formatIDR, formatBytes } from '../utils/formatters';

interface RecordItemProps {
  record: PaymentRecord;
  isHighlighted?: boolean;
  onSelect?: () => void;
  onViewReceipt: (record: PaymentRecord) => void;
  onEdit: (record: PaymentRecord) => void;
  onDelete: (record: PaymentRecord) => void;
  onToggleStatus?: (record: PaymentRecord) => void;
  isToggling?: boolean;
}

export const RecordItem: React.FC<RecordItemProps> = ({
  record,
  isHighlighted = false,
  onSelect,
  onViewReceipt,
  onEdit,
  onDelete,
  onToggleStatus,
  isToggling = false,
}) => {
  const hasReceipt = Boolean(record.receipt_storage_path);
  const rawStatus = (record.status ?? 'PAID').trim().toUpperCase();
  const status: 'PAID' | 'UNPAID' = rawStatus === 'UNPAID' ? 'UNPAID' : 'PAID';

  return (
    <div
      onClick={onSelect}
      className={`group border-b border-heron-border transition-colors duration-200 cursor-pointer ${
        isHighlighted
          ? 'bg-heron-surface border-l-4 border-l-heron-brand shadow-sm'
          : 'bg-transparent hover:bg-heron-subtle/80'
      }`}
    >
      <div className="max-w-page mx-auto px-6 lg:px-12 py-4 sm:py-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          {/* Column 1: Date & Student Name */}
          <div className="md:w-5/12 flex items-start gap-3.5">
            <div
              className={`w-1.5 h-1.5 mt-2 transition-colors duration-200 ${
                isHighlighted
                  ? 'bg-heron-brand'
                  : 'bg-heron-border group-hover:bg-heron-brand'
              }`}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[11px] font-sans font-medium tracking-wider uppercase text-heron-tertiary">
                  {formatDateDisplay(record.payment_date)}
                </span>
                {/* Status Toggle Badge */}
                <button
                  type="button"
                  disabled={isToggling}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isToggling) {
                      onToggleStatus?.(record);
                    }
                  }}
                  title={
                    isToggling
                      ? 'Updating status...'
                      : `Status: ${status}. Click to change to ${status === 'PAID' ? 'UNPAID' : 'PAID'}`
                  }
                  aria-label={`Status: ${status}. Click to change to ${status === 'PAID' ? 'UNPAID' : 'PAID'}`}
                  className={`btn-heron inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-sans font-semibold tracking-wider uppercase border transition-all select-none ${
                    isToggling ? 'opacity-60 cursor-wait' : 'cursor-pointer'
                  } ${
                    status === 'PAID'
                      ? 'border-emerald-600/40 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 hover:border-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-400 dark:hover:bg-emerald-500/25'
                      : 'border-amber-600/40 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 hover:border-amber-600 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-400 dark:hover:bg-amber-500/25'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isToggling
                        ? 'border border-current border-t-transparent animate-spin'
                        : status === 'PAID'
                        ? 'bg-emerald-600 dark:bg-emerald-400'
                        : 'bg-amber-600 dark:bg-amber-400'
                    }`}
                  />
                  <span>{status}</span>
                </button>
              </div>
              <h3 className="font-display font-bold text-base sm:text-lg text-heron-primary tracking-tight transition-colors group-hover:text-heron-primary">
                {record.student_name}
              </h3>
              {record.note && (
                <p className="mt-0.5 text-xs text-heron-secondary line-clamp-1 italic font-sans">
                  {record.note}
                </p>
              )}
            </div>
          </div>

          {/* Column 2: Receipt Indicator */}
          <div className="md:w-3/12 flex items-center">
            {hasReceipt ? (
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewReceipt(record);
                  }}
                  className="btn-heron inline-flex items-center gap-1.5 text-xs font-sans font-medium tracking-wide py-1 px-2.5 bg-heron-surface border border-heron-border hover:border-heron-brand text-heron-primary hover:text-heron-brand transition-colors cursor-pointer"
                  title="View receipt"
                >
                  <FileText className="w-3.5 h-3.5 text-heron-brand shrink-0" />
                  <span className="font-semibold">RECEIPT ATTACHED</span>
                </button>
                {record.receipt_compressed_size_bytes ? (
                  <span className="text-[11px] font-sans text-heron-tertiary font-medium">
                    {formatBytes(record.receipt_compressed_size_bytes)}
                  </span>
                ) : null}
              </div>
            ) : (
              <div className="inline-flex items-center px-2 py-0.5 text-[10px] font-sans font-medium tracking-wider text-heron-tertiary border border-heron-border/50 bg-heron-subtle/50">
                NO RECEIPT
              </div>
            )}
          </div>

          {/* Column 3: Amount in IDR */}
          <div className="md:w-2/12 md:text-right">
            <div className="text-[10px] font-sans font-medium tracking-wider uppercase md:hidden text-heron-tertiary mb-0.5">
              AMOUNT
            </div>
            <div className="font-display font-bold text-lg sm:text-xl text-heron-primary font-mono-num tracking-tight">
              {formatIDR(record.amount_idr)}
            </div>
          </div>

          {/* Column 4: Quick Actions */}
          <div className="md:w-2/12 flex items-center justify-start md:justify-end gap-1 pt-1 md:pt-0">
            {hasReceipt && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewReceipt(record);
                }}
                className="btn-heron p-1.5 text-heron-tertiary hover:text-heron-primary hover:bg-heron-surface border border-transparent hover:border-heron-border transition-colors cursor-pointer"
                title="View receipt"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(record);
              }}
              className="btn-heron p-1.5 text-heron-tertiary hover:text-heron-primary hover:bg-heron-surface border border-transparent hover:border-heron-border transition-colors cursor-pointer"
              title="Edit record"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(record);
              }}
              className="btn-heron p-1.5 text-heron-tertiary hover:text-heron-brand hover:bg-heron-brand/10 border border-transparent hover:border-heron-brand/30 transition-colors cursor-pointer"
              title="Delete record"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {/* Heron subtle arrow prompt */}
            <span className="hidden md:inline-block font-sans text-xs text-heron-tertiary group-hover:text-heron-brand transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ml-1">
              ↗
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
