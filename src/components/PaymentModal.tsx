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

  // Form states
  const [studentName, setStudentName] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [note, setNote] = useState('');

  // Receipt optimization states
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [existingReceiptUrl, setExistingReceiptUrl] = useState<string | null>(null);
  const [removeExistingReceipt, setRemoveExistingReceipt] = useState(false);

  // Status & error states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize or reset form on open / recordToEdit change
  useEffect(() => {
    if (!isOpen) return;

    if (recordToEdit) {
      setStudentName(recordToEdit.student_name);
      setPaymentDate(recordToEdit.payment_date);
      setAmountInput(recordToEdit.amount_idr ? recordToEdit.amount_idr.toString() : '');
      setNote(recordToEdit.note || '');
      setOptimizationResult(null);
      setRemoveExistingReceipt(false);
      setErrorMsg(null);

      if (recordToEdit.receipt_storage_path) {
        getPaymentService()
          .getReceiptDataUrl(recordToEdit)
          .then((url) => setExistingReceiptUrl(url))
          .catch(() => setExistingReceiptUrl(null));
      } else {
        setExistingReceiptUrl(null);
      }
    } else {
      // New record defaults
      const today = new Date().toISOString().split('T')[0];
      setStudentName('');
      setPaymentDate(today);
      setAmountInput('');
      setNote('');
      setOptimizationResult(null);
      setExistingReceiptUrl(null);
      setRemoveExistingReceipt(false);
      setErrorMsg(null);
    }
  }, [isOpen, recordToEdit]);

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
      setErrorMsg('Please select transfer date.');
      return;
    }

    if (currentAmount <= 0) {
      setErrorMsg('Please enter a valid transfer amount in IDR.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-nearblack/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-ivory border border-editorial-border shadow-2xl my-8">
        {/* Modal Header */}
        <div className="bg-nearblack text-ivory px-8 py-6 flex items-center justify-between border-b border-editorial-borderDark">
          <div>
            <div className="text-[10px] font-mono tracking-widest text-lavender uppercase mb-1">
              {isEditing ? 'MODIFY TRANSACTION' : 'NEW TRANSACTION ENTRY'}
            </div>
            <h2 className="font-display font-extrabold text-2xl text-white tracking-tight">
              {isEditing ? 'EDIT PAYMENT RECORD.' : 'RECORD PAYMENT.'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-editorial-muted hover:text-white p-2 transition-colors rounded-none"
            title="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {errorMsg && (
            <div className="p-4 bg-status-error/10 border border-status-error/30 text-nearblack flex items-start gap-3 text-xs">
              <AlertCircle className="w-4 h-4 text-status-error shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Student Name */}
          <div>
            <label className="block text-xs font-mono tracking-widest uppercase text-nearblack mb-2">
              Student Name <span className="text-lavender">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Budi Santoso"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className="w-full bg-white border border-editorial-border px-4 py-3 text-sm text-nearblack placeholder:text-editorial-muted/60 editorial-focus rounded-none"
            />
          </div>

          {/* Row: Date & Amount */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Transfer Date */}
            <div>
              <label className="block text-xs font-mono tracking-widest uppercase text-nearblack mb-2">
                Transfer Date <span className="text-lavender">*</span>
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full bg-white border border-editorial-border px-4 py-3 text-sm font-mono text-nearblack editorial-focus rounded-none"
              />
            </div>

            {/* Transfer Amount IDR */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-mono tracking-widest uppercase text-nearblack">
                  Amount in IDR <span className="text-lavender">*</span>
                </label>
                <span className="text-xs font-mono font-bold text-lavender">
                  {formatIDR(currentAmount)}
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-xs text-editorial-muted">
                  Rp
                </span>
                <input
                  type="text"
                  required
                  placeholder="1.500.000"
                  value={amountInput}
                  onChange={handleAmountChange}
                  className="w-full bg-white border border-editorial-border pl-12 pr-4 py-3 text-sm font-mono font-bold text-nearblack editorial-focus rounded-none"
                />
              </div>
            </div>
          </div>

          {/* Receipt Upload & Compression Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-mono tracking-widest uppercase text-nearblack">
                Transfer Receipt <span className="text-editorial-muted font-normal text-[11px]">(JPEG, PNG, WebP)</span>
              </label>
              <span className="text-[11px] font-mono text-editorial-muted">
                AUTO-COMPRESSED
              </span>
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
              <div className="p-8 border-2 border-dashed border-lavender bg-lavender/5 text-center">
                <div className="inline-block w-6 h-6 border-2 border-lavender border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-xs font-mono tracking-widest text-lavender font-bold uppercase">
                  OPTIMIZING RECEIPT...
                </p>
                <p className="text-[11px] text-editorial-muted mt-1">
                  Enforcing max dimensions and lossless compression for financial legibility.
                </p>
              </div>
            )}

            {/* Display newly optimized receipt */}
            {!isOptimizing && optimizationResult && (
              <div className="p-4 bg-white border border-editorial-border">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <img
                      src={`data:${optimizationResult.mime_type};base64,${optimizationResult.data_base64}`}
                      alt="Optimized preview"
                      className="w-16 h-20 object-cover border border-editorial-border shadow-sm"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 text-status-success font-mono text-xs font-semibold">
                        <Check className="w-3.5 h-3.5" />
                        <span>RECEIPT OPTIMIZED</span>
                      </div>
                      <div className="mt-1 text-xs font-mono text-nearblack">
                        {formatBytes(optimizationResult.original_size_bytes)} →{' '}
                        <span className="font-bold text-lavender">
                          {formatBytes(optimizationResult.compressed_size_bytes)}
                        </span>{' '}
                        · {optimizationResult.savings_percentage}% smaller
                      </div>
                      <div className="text-[10px] font-mono text-editorial-muted mt-0.5">
                        {optimizationResult.width} × {optimizationResult.height} px · {optimizationResult.mime_type}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 text-editorial-muted hover:text-nearblack border border-editorial-border hover:border-nearblack transition-colors"
                      title="Replace receipt"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleClearReceipt}
                      className="p-2 text-editorial-muted hover:text-status-error border border-editorial-border hover:border-status-error transition-colors"
                      title="Remove receipt"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Display existing receipt on edit if not replacing */}
            {!isOptimizing && !optimizationResult && existingReceiptUrl && !removeExistingReceipt && (
              <div className="p-4 bg-white border border-editorial-border flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <img
                    src={existingReceiptUrl}
                    alt="Current receipt"
                    className="w-16 h-20 object-cover border border-editorial-border shadow-sm"
                  />
                  <div>
                    <span className="text-xs font-mono text-nearblack font-semibold flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-lavender" />
                      CURRENT RECEIPT PRESERVED
                    </span>
                    {recordToEdit?.receipt_compressed_size_bytes ? (
                      <p className="text-xs font-mono text-editorial-muted mt-1">
                        Stored size: {formatBytes(recordToEdit.receipt_compressed_size_bytes)}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-editorial-muted hover:text-nearblack border border-editorial-border hover:border-nearblack transition-colors"
                    title="Change receipt"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleClearReceipt}
                    className="p-2 text-editorial-muted hover:text-status-error border border-editorial-border hover:border-status-error transition-colors"
                    title="Remove receipt"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Empty upload box */}
            {!isOptimizing && !optimizationResult && (!existingReceiptUrl || removeExistingReceipt) && (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className="p-8 border-2 border-dashed border-editorial-border hover:border-lavender bg-white hover:bg-white/80 cursor-pointer transition-colors text-center"
              >
                <Upload className="w-6 h-6 mx-auto mb-2 text-editorial-muted" />
                <p className="text-xs font-mono uppercase text-nearblack tracking-wide font-medium">
                  Drop receipt image here, or <span className="text-lavender underline">browse file</span>
                </p>
                <p className="text-[11px] text-editorial-muted mt-1">
                  Supports JPEG, PNG, WebP up to 20 MB. Automatically compressed on select.
                </p>
              </div>
            )}
          </div>

          {/* Optional Note */}
          <div>
            <label className="block text-xs font-mono tracking-widest uppercase text-nearblack mb-2">
              Note <span className="text-editorial-muted font-normal text-[11px]">(Optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Physics & Math tutoring package (Grade 12)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-white border border-editorial-border px-4 py-3 text-sm text-nearblack placeholder:text-editorial-muted/60 editorial-focus rounded-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-editorial-border flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-3 text-xs font-mono tracking-wider uppercase text-editorial-muted hover:text-nearblack border border-editorial-border hover:border-nearblack bg-white transition-colors rounded-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isOptimizing}
              className="px-8 py-3 text-xs font-semibold tracking-wider uppercase bg-lavender hover:bg-lavender-hover text-nearblack transition-colors disabled:opacity-50 flex items-center gap-2 rounded-none editorial-focus"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-nearblack border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isEditing ? 'Save Changes' : 'Record Payment'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
