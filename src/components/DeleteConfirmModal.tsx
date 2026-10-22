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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-md bg-heron-bg border border-heron-border shadow-2xl p-6 sm:p-8">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 border border-heron-brand/30 bg-heron-brand/10 text-heron-brand">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-heron-primary tracking-tight uppercase">
                DELETE RECORD?
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-heron-tertiary hover:text-heron-primary p-1 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Record info box */}
        <div className="bg-heron-surface border border-heron-border p-4 mb-6 space-y-1 font-sans text-xs">
          <div className="text-base font-display font-bold text-heron-primary">
            {record.student_name}
          </div>
          <div className="text-heron-brand font-bold text-sm font-mono-num">
            {formatIDR(record.amount_idr)}
          </div>
          <div className="text-heron-tertiary text-[11px] font-medium">
            {formatDateDisplay(record.payment_date)}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="btn-heron px-5 py-2.5 text-xs font-sans font-medium tracking-wider uppercase text-heron-secondary hover:text-heron-primary border border-heron-border hover:border-heron-primary bg-heron-surface transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="btn-heron px-6 py-2.5 text-xs font-sans tracking-wider uppercase bg-heron-brand hover:bg-heron-brand-hover text-white font-semibold transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-sm"
          >
            {isDeleting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <span>Delete</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
