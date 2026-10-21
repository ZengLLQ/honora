import React from 'react';
import { FileText, Eye, Edit3, Trash2 } from 'lucide-react';
import type { PaymentRecord } from '../types/payment';
import { formatDateDisplay, formatIDR, formatBytes } from '../utils/formatters';

interface RecordItemProps {
  record: PaymentRecord;
  onViewReceipt: (record: PaymentRecord) => void;
  onEdit: (record: PaymentRecord) => void;
  onDelete: (record: PaymentRecord) => void;
}

export const RecordItem: React.FC<RecordItemProps> = ({
  record,
  onViewReceipt,
  onEdit,
  onDelete,
}) => {
  const hasReceipt = Boolean(record.receipt_storage_path);

  return (
    <div className="group border-b border-editorial-border hover:bg-white/80 transition-colors duration-150">
      <div className="max-w-page mx-auto px-6 lg:px-12 py-5 lg:py-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Column 1: Date & Student Name */}
          <div className="md:w-1/3 flex items-start gap-4">
            <div className="w-2.5 h-2.5 mt-2 rounded-none bg-editorial-border group-hover:bg-lavender transition-colors" />
            <div>
              <div className="text-[11px] font-mono tracking-widest text-editorial-muted uppercase mb-1">
                {formatDateDisplay(record.payment_date)}
              </div>
              <h3 className="font-display font-bold text-lg text-nearblack tracking-tight group-hover:text-nearblack">
                {record.student_name}
              </h3>
              {record.note && (
                <p className="mt-1 text-xs text-editorial-muted line-clamp-1 italic font-editorial">
                  {record.note}
                </p>
              )}
            </div>
          </div>

          {/* Column 2: Receipt Indicator & Optimization Info */}
          <div className="md:w-1/4">
            {hasReceipt ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onViewReceipt(record)}
                  className="flex items-center gap-2 text-xs font-mono tracking-wider text-nearblack hover:text-lavender transition-colors py-1 px-2.5 bg-ivory border border-editorial-border hover:border-lavender group-hover:bg-white"
                  title="Click to inspect receipt details"
                >
                  <FileText className="w-3.5 h-3.5 text-lavender" />
                  <span className="font-medium">RECEIPT ATTACHED</span>
                </button>
                {record.receipt_compressed_size_bytes ? (
                  <span className="text-[11px] font-mono text-editorial-muted">
                    {formatBytes(record.receipt_compressed_size_bytes)}
                  </span>
                ) : null}
              </div>
            ) : (
              <div className="text-[11px] font-mono text-editorial-muted/70 tracking-wider">
                NO RECEIPT
              </div>
            )}
          </div>

          {/* Column 3: Amount in IDR */}
          <div className="md:w-1/5 md:text-right">
            <div className="text-[10px] font-mono tracking-widest text-editorial-muted uppercase md:hidden mb-0.5">
              AMOUNT
            </div>
            <div className="font-display font-extrabold text-xl lg:text-2xl text-nearblack font-mono-num tracking-tight">
              {formatIDR(record.amount_idr)}
            </div>
          </div>

          {/* Column 4: Quick Actions */}
          <div className="md:w-1/6 flex items-center justify-start md:justify-end gap-2 pt-2 md:pt-0">
            {hasReceipt && (
              <button
                onClick={() => onViewReceipt(record)}
                className="p-2 text-editorial-muted hover:text-nearblack hover:bg-ivory border border-transparent hover:border-editorial-border transition-colors rounded-none"
                title="View receipt"
              >
                <Eye className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => onEdit(record)}
              className="p-2 text-editorial-muted hover:text-nearblack hover:bg-ivory border border-transparent hover:border-editorial-border transition-colors rounded-none"
              title="Edit record"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(record)}
              className="p-2 text-editorial-muted hover:text-status-error hover:bg-status-error/10 border border-transparent hover:border-status-error/30 transition-colors rounded-none"
              title="Delete record"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
