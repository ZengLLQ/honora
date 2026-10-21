import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import type { PaymentRecord } from '../types/payment';
import { formatIDR, formatDateDisplay } from '../utils/formatters';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  record: PaymentRecord | null;
  onClose: () => void;
  onConfirm: (record: PaymentRecord) => Promise<void>;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  record,
  onClose,
  onConfirm,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !record) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirm(record);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-nearblack/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-ivory border border-editorial-border shadow-2xl p-6 md:p-8">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-status-error/15 text-status-error">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-widest text-status-error uppercase font-bold">
                CONFIRM DELETION
              </span>
              <h3 className="font-display font-bold text-xl text-nearblack tracking-tight">
                DELETE RECORD?
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-editorial-muted hover:text-nearblack p-1 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-nearblack/80 mb-6">
          This will permanently remove the payment record and any attached optimized receipt for:
        </p>

        {/* Record info box */}
        <div className="bg-white border border-editorial-border p-4 mb-6 space-y-1.5 font-mono text-xs">
          <div className="text-base font-display font-bold text-nearblack">
            {record.student_name}
          </div>
          <div className="text-lavender font-bold text-sm">
            {formatIDR(record.amount_idr)}
          </div>
          <div className="text-editorial-muted text-[11px]">
            {formatDateDisplay(record.payment_date)}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-5 py-2.5 text-xs font-mono tracking-wider uppercase text-editorial-muted hover:text-nearblack border border-editorial-border hover:border-nearblack bg-white transition-colors rounded-none"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-6 py-2.5 text-xs font-mono tracking-wider uppercase bg-status-error hover:bg-status-error/90 text-white font-semibold transition-colors disabled:opacity-50 flex items-center gap-2 rounded-none"
          >
            {isDeleting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <span>Confirm Delete</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
