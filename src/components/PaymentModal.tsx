import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Check, AlertCircle, FileText, Trash2, RefreshCw } from 'lucide-react';
import type {
  CreateRecordPayload,
  OptimizationResult,
  PaymentRecord,
  UpdateRecordPayload,
} from '../types/payment';
import { getPaymentService } from '../services/storageService';
import { formatBytes, formatIDR, parseIDRInput } from '../utils/formatters';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  recordToEdit?: PaymentRecord | null;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  recordToEdit,
}) => {
  const isEditing = Boolean(recordToEdit);

  // Form states initialized directly
  const [studentName, setStudentName] = useState(recordToEdit?.student_name || '');
  const [paymentDate, setPaymentDate] = useState(
    () => recordToEdit?.payment_date || new Date().toISOString().split('T')[0]
  );
  const [amountInput, setAmountInput] = useState(
    recordToEdit?.amount_idr ? recordToEdit.amount_idr.toLocaleString('id-ID') : ''
  );
  const [note, setNote] = useState(recordToEdit?.note || '');
  const [status, setStatus] = useState<'PAID' | 'UNPAID'>(() =>
    recordToEdit?.status?.trim().toUpperCase() === 'UNPAID' ? 'UNPAID' : 'PAID'
  );

  // Receipt optimization states
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [existingReceiptUrl, setExistingReceiptUrl] = useState<string | null>(null);
  const [removeExistingReceipt, setRemoveExistingReceipt] = useState(false);

  // Status & error states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing receipt if editing a record with receipt
  useEffect(() => {
    let isCancelled = false;
    if (recordToEdit?.receipt_storage_path) {
      getPaymentService()
        .getReceiptDataUrl(recordToEdit)
        .then((url) => {
          if (!isCancelled) setExistingReceiptUrl(url);
        })
        .catch(() => {
          if (!isCancelled) setExistingReceiptUrl(null);
        });
    }
    return () => {
      isCancelled = true;
    };
  }, [recordToEdit]);

  if (!isOpen) return null;

  const currentAmount = parseIDRInput(amountInput);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const num = parseIDRInput(raw);
    setAmountInput(num > 0 ? num.toLocaleString('id-ID') : '');
  };

  const handleFileSelect = async (file: File) => {
    setErrorMsg(null);
    setIsOptimizing(true);

    try {
      const service = getPaymentService();
      const result = await service.optimizeReceipt(file);
      setOptimizationResult(result);
      setRemoveExistingReceipt(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Receipt compression failed.';
      setErrorMsg(message);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleClearReceipt = () => {
    setOptimizationResult(null);
    setExistingReceiptUrl(null);
    setRemoveExistingReceipt(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = studentName.trim();
    if (!trimmedName) {
      setErrorMsg('Please enter student name.');
      return;
    }

    if (!paymentDate) {
      setErrorMsg('Please select date.');
      return;
    }

    if (currentAmount <= 0) {
      setErrorMsg('Please enter a valid amount.');
      return;
    }

    setIsSubmitting(true);

    try {
      const service = getPaymentService();

      if (isEditing && recordToEdit) {
        const payload: UpdateRecordPayload = {
          id: recordToEdit.id,
          student_name: trimmedName,
          payment_date: paymentDate,
          amount_idr: currentAmount,
          note: note.trim() || undefined,
          status,
          remove_receipt: removeExistingReceipt,
        };

        if (optimizationResult) {
          payload.receipt_base64 = optimizationResult.data_base64;
          payload.receipt_mime_type = optimizationResult.mime_type;
          payload.receipt_original_size_bytes = optimizationResult.original_size_bytes;
          payload.receipt_compressed_size_bytes = optimizationResult.compressed_size_bytes;
          payload.receipt_width = optimizationResult.width;
          payload.receipt_height = optimizationResult.height;
        }

        await service.updateRecord(payload);
      } else {
        const payload: CreateRecordPayload = {
          student_name: trimmedName,
          payment_date: paymentDate,
          amount_idr: currentAmount,
          note: note.trim() || undefined,
          status,
        };

        if (optimizationResult) {
          payload.receipt_base64 = optimizationResult.data_base64;
          payload.receipt_mime_type = optimizationResult.mime_type;
          payload.receipt_original_size_bytes = optimizationResult.original_size_bytes;
          payload.receipt_compressed_size_bytes = optimizationResult.compressed_size_bytes;
          payload.receipt_width = optimizationResult.width;
          payload.receipt_height = optimizationResult.height;
        }

        await service.createRecord(payload);
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save record.';
      setErrorMsg(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-heron-primary/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-heron-bg border border-heron-border shadow-2xl my-8">
        {/* Modal Header */}
        <div className="bg-heron-surface text-heron-primary px-6 sm:px-8 py-5 flex items-center justify-between border-b border-heron-border">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 bg-heron-brand" />
            <h2 className="font-display font-bold text-lg sm:text-xl text-heron-primary tracking-tight uppercase">
              {isEditing ? 'EDIT PAYMENT' : 'ADD PAYMENT'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-heron-tertiary hover:text-heron-primary p-1.5 transition-colors cursor-pointer"
            title="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
          {errorMsg && (
            <div className="p-3.5 bg-heron-brand/10 border border-heron-brand/30 text-heron-primary flex items-start gap-2.5 text-xs font-sans">
              <AlertCircle className="w-4 h-4 text-heron-brand shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Student Name */}
          <div>
            <label className="block text-xs font-sans tracking-wider uppercase text-heron-primary mb-1.5 font-medium">
              Student Name <span className="text-heron-brand">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Student name"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className="w-full bg-heron-surface border border-heron-border px-3.5 py-2.5 text-sm font-sans text-heron-primary placeholder:text-heron-tertiary/60 focus:border-heron-brand focus:outline-none transition-colors"
            />
          </div>

          {/* Row: Date & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {/* Date */}
            <div>
              <label className="block text-xs font-sans tracking-wider uppercase text-heron-primary mb-1.5 font-medium">
                Date <span className="text-heron-brand">*</span>
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full bg-heron-surface border border-heron-border px-3.5 py-2.5 text-sm font-sans text-heron-primary focus:border-heron-brand focus:outline-none transition-colors"
              />
            </div>

            {/* Transfer Amount IDR */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-sans tracking-wider uppercase text-heron-primary font-medium">
                  Amount (IDR) <span className="text-heron-brand">*</span>
                </label>
                <span className="text-xs font-sans font-bold font-mono-num text-heron-brand">
                  {formatIDR(currentAmount)}
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-sans font-medium text-xs text-heron-tertiary">
                  Rp
                </span>
                <input
                  type="text"
                  required
                  placeholder="1.500.000"
                  value={amountInput}
                  onChange={handleAmountChange}
                  className="w-full bg-heron-surface border border-heron-border pl-10 pr-3.5 py-2.5 text-sm font-sans font-bold font-mono-num text-heron-primary focus:border-heron-brand focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Payment Status Selection */}
          <div>
            <label className="block text-xs font-sans tracking-wider uppercase text-heron-primary mb-1.5 font-medium">
              Payment Status <span className="text-heron-brand">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStatus('PAID')}
                aria-pressed={status === 'PAID'}
                aria-label="Status PAID"
                className={`py-2 px-3 text-xs font-sans font-semibold tracking-wider uppercase border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  status === 'PAID'
                    ? 'border-emerald-600 bg-emerald-500/10 text-emerald-800 ring-1 ring-emerald-600/30'
                    : 'border-heron-border bg-heron-surface text-heron-tertiary hover:border-heron-primary hover:text-heron-primary'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${status === 'PAID' ? 'bg-emerald-600' : 'bg-heron-border'}`} />
                <span>PAID</span>
              </button>
              <button
                type="button"
                onClick={() => setStatus('UNPAID')}
                aria-pressed={status === 'UNPAID'}
                aria-label="Status UNPAID"
                className={`py-2 px-3 text-xs font-sans font-semibold tracking-wider uppercase border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  status === 'UNPAID'
                    ? 'border-amber-600 bg-amber-500/10 text-amber-800 ring-1 ring-amber-600/30'
                    : 'border-heron-border bg-heron-surface text-heron-tertiary hover:border-heron-primary hover:text-heron-primary'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${status === 'UNPAID' ? 'bg-amber-600' : 'bg-heron-border'}`} />
                <span>UNPAID</span>
              </button>
            </div>
          </div>

          {/* Receipt Upload & Compression Section */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-sans tracking-wider uppercase text-heron-primary font-medium">
                Receipt
              </label>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileInputChange}
              className="hidden"
            />

            {/* Optimizing in progress state */}
            {isOptimizing && (
              <div className="p-6 border border-dashed border-heron-brand bg-heron-brand/5 text-center">
                <div className="inline-block w-5 h-5 border-2 border-heron-brand border-t-transparent rounded-full animate-spin mb-2" />
                <p className="text-xs font-sans tracking-wider text-heron-brand font-semibold uppercase">
                  PROCESSING RECEIPT
                </p>
              </div>
            )}

            {/* Display newly optimized receipt */}
            {!isOptimizing && optimizationResult && (
              <div className="p-3.5 bg-heron-surface border border-heron-border">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={`data:${optimizationResult.mime_type};base64,${optimizationResult.data_base64}`}
                      alt="Optimized preview"
                      className="w-14 h-18 object-cover border border-heron-border shadow-sm"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 text-status-success font-sans text-xs font-semibold">
                        <Check className="w-3.5 h-3.5" />
                        <span>RECEIPT SAVED</span>
                      </div>
                      <div className="mt-0.5 text-xs font-sans text-heron-primary font-medium">
                        {formatBytes(optimizationResult.original_size_bytes)} →{' '}
                        <span className="font-bold text-heron-brand">
                          {formatBytes(optimizationResult.compressed_size_bytes)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="btn-heron p-1.5 text-heron-tertiary hover:text-heron-primary border border-heron-border hover:border-heron-primary transition-colors cursor-pointer"
                      title="Replace receipt"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleClearReceipt}
                      className="btn-heron p-1.5 text-heron-tertiary hover:text-heron-brand border border-heron-border hover:border-heron-brand transition-colors cursor-pointer"
                      title="Remove receipt"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Display existing receipt on edit if not replacing */}
            {!isOptimizing && !optimizationResult && recordToEdit?.receipt_storage_path && !removeExistingReceipt && (
              <div className="p-3.5 bg-heron-surface border border-heron-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {existingReceiptUrl ? (
                    <img
                      src={existingReceiptUrl}
                      alt="Current receipt"
                      className="w-14 h-18 object-cover border border-heron-border shadow-sm"
                    />
                  ) : (
                    <div className="w-14 h-18 bg-heron-subtle border border-heron-border flex items-center justify-center">
                      <FileText className="w-6 h-6 text-heron-brand" />
                    </div>
                  )}
                  <div>
                    <span className="text-xs font-sans text-heron-primary font-semibold flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-heron-brand" />
                      RECEIPT ATTACHED
                    </span>
                    {recordToEdit?.receipt_compressed_size_bytes ? (
                      <p className="text-xs font-sans text-heron-tertiary mt-0.5 font-medium">
                        {formatBytes(recordToEdit.receipt_compressed_size_bytes)}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-heron p-1.5 text-heron-tertiary hover:text-heron-primary border border-heron-border hover:border-heron-primary transition-colors cursor-pointer"
                    title="Change receipt"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleClearReceipt}
                    className="btn-heron p-1.5 text-heron-tertiary hover:text-heron-brand border border-heron-border hover:border-heron-brand transition-colors cursor-pointer"
                    title="Remove receipt"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Empty upload box */}
            {!isOptimizing && !optimizationResult && (!recordToEdit?.receipt_storage_path || removeExistingReceipt) && (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className="p-6 border border-dashed border-heron-border hover:border-heron-brand bg-heron-surface hover:bg-heron-surface/80 cursor-pointer transition-colors text-center"
              >
                <Upload className="w-5 h-5 mx-auto mb-1.5 text-heron-tertiary" />
                <p className="text-xs font-sans uppercase text-heron-primary tracking-wide font-medium">
                  Drop receipt image here, or <span className="text-heron-brand underline">browse</span>
                </p>
              </div>
            )}
          </div>

          {/* Optional Note */}
          <div>
            <label className="block text-xs font-sans tracking-wider uppercase text-heron-primary mb-1.5 font-medium">
              Note
            </label>
            <textarea
              rows={2}
              placeholder="Add note..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-heron-surface border border-heron-border px-3.5 py-2.5 text-sm font-sans text-heron-primary placeholder:text-heron-tertiary/60 focus:border-heron-brand focus:outline-none transition-colors"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-heron-border flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn-heron px-5 py-2.5 text-xs font-sans font-medium tracking-wider uppercase text-heron-secondary hover:text-heron-primary border border-heron-border hover:border-heron-primary bg-heron-surface transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isOptimizing}
              aria-label={isEditing ? 'Save Changes' : 'ADD PAYMENT'}
              className="btn-heron px-6 py-2.5 text-xs font-sans font-semibold tracking-wider uppercase bg-heron-primary hover:bg-heron-brand text-white border border-heron-primary hover:border-heron-brand transition-all duration-200 disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isEditing ? 'Save Changes' : 'ADD PAYMENT'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
