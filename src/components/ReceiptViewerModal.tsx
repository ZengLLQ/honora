import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Edit3,
  Trash2,
} from 'lucide-react';
import type { PaymentRecord } from '../types/payment';
import { getPaymentService } from '../services/storageService';
import { formatDateDisplay, formatIDR, formatBytes } from '../utils/formatters';

interface ReceiptViewerModalProps {
  isOpen: boolean;
  record: PaymentRecord | null;
  onClose: () => void;
  onEdit: (record: PaymentRecord) => void;
  onDelete: (record: PaymentRecord) => void;
  onToggleStatus?: (record: PaymentRecord) => void;
  isToggling?: boolean;
}

export const ReceiptViewerModal: React.FC<ReceiptViewerModalProps> = ({
  isOpen,
  record,
  onClose,
  onEdit,
  onDelete,
  onToggleStatus,
  isToggling = false,
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  useEffect(() => {
    let isCancelled = false;
    if (!isOpen || !record) {
      return;
    }

    const service = getPaymentService();
    service
      .getReceiptDataUrl(record)
      .then((url) => {
        if (!isCancelled) {
          setDataUrl(url);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load receipt:', err);
        if (!isCancelled) {
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally avoid re-fetching image when other fields like status toggle
  }, [isOpen, record?.id, record?.receipt_storage_path]);

  if (!isOpen || !record) return null;

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 25, 250));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 25, 50));
  const handleResetZoom = () => setZoomLevel(100);

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    const ext =
      record.receipt_mime_type === 'image/png'
        ? 'png'
        : record.receipt_mime_type === 'image/webp'
        ? 'webp'
        : 'jpg';
    a.download = `receipt-${record.student_name.toLowerCase().replace(/\s+/g, '-')}-${record.payment_date}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-heron-primary/80 backdrop-blur-md">
      <div className="relative w-full max-w-6xl h-[90vh] bg-heron-bg border border-heron-border shadow-2xl flex flex-col md:flex-row overflow-hidden">
        {/* Main Left: Receipt Image Preview Stage */}
        <div className="relative flex-1 bg-heron-primary flex flex-col border-b md:border-b-0 md:border-r border-heron-borderDark overflow-hidden">
          {/* Zoom controls floating bar */}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 bg-heron-primary/85 backdrop-blur-sm border border-heron-borderDark px-3 py-1.5 text-xs text-white">
            <button
              onClick={handleZoomOut}
              className="p-1 hover:text-heron-brand transition-colors cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="font-sans font-medium text-[11px] px-1 text-white">{zoomLevel}%</span>
            <button
              onClick={handleZoomIn}
              className="p-1 hover:text-heron-brand transition-colors cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-3 bg-heron-borderDark mx-1" />
            <button
              onClick={handleResetZoom}
              className="p-1 hover:text-heron-brand transition-colors cursor-pointer"
              title="Reset zoom"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Download button floating top right */}
          <div className="absolute top-4 right-4 z-20">
            <button
              onClick={handleDownload}
              disabled={!dataUrl}
              className="btn-heron flex items-center gap-1.5 bg-heron-surface/10 hover:bg-heron-surface/20 border border-white/20 text-white text-xs font-sans font-medium tracking-wider uppercase px-3 py-1.5 transition-colors cursor-pointer"
              title="Download receipt image"
            >
              <Download className="w-3.5 h-3.5 text-heron-brand" />
              <span>Download</span>
            </button>
          </div>

          {/* Image Display Area */}
          <div className="flex-1 overflow-auto p-4 md:p-8 flex">
            {loading ? (
              <div className="m-auto text-center">
                <div className="w-7 h-7 border-2 border-heron-brand border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs font-sans tracking-wider text-heron-tertiary uppercase">
                  Loading...
                </p>
              </div>
            ) : dataUrl ? (
              <div className={`p-2 flex items-center justify-center min-w-fit min-h-fit ${zoomLevel > 100 ? 'm-0' : 'm-auto'}`}>
                <img
                  src={dataUrl}
                  alt="Receipt"
                  style={{
                    width: `${zoomLevel}%`,
                    maxWidth: zoomLevel === 100 ? '100%' : 'none',
                    maxHeight: zoomLevel === 100 ? '100%' : 'none',
                    transition: 'width 0.15s ease-out',
                  }}
                  className="object-contain shadow-2xl transition-all select-none"
                />
              </div>
            ) : (
              <div className="m-auto text-center text-heron-tertiary text-xs font-sans">
                Receipt file unavailable.
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Transaction Details */}
        <div className="w-full md:w-96 bg-heron-surface flex flex-col justify-between overflow-y-auto">
          {/* Top of Sidebar: Header & Close */}
          <div>
            <div className="p-6 border-b border-heron-border flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-lg text-heron-primary tracking-tight uppercase">
                  TRANSACTION DETAILS
                </h3>
              </div>
              <button
                onClick={onClose}
                className="text-heron-tertiary hover:text-heron-primary p-1.5 transition-colors cursor-pointer"
                title="Close receipt preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Information Rows */}
            <div className="p-6 space-y-5">
              {/* Student Name */}
              <div>
                <span className="text-[10px] font-sans font-medium tracking-wider text-heron-tertiary uppercase block mb-0.5">
                  STUDENT NAME
                </span>
                <span className="font-display font-bold text-base sm:text-lg text-heron-primary">
                  {record.student_name}
                </span>
              </div>

              {/* Amount */}
              <div>
                <span className="text-[10px] font-sans font-medium tracking-wider text-heron-tertiary uppercase block mb-0.5">
                  AMOUNT
                </span>
                <span className="font-display font-bold text-2xl text-heron-primary font-mono-num">
                  {formatIDR(record.amount_idr)}
                </span>
              </div>

              {/* Date */}
              <div>
                <span className="text-[10px] font-sans font-medium tracking-wider text-heron-tertiary uppercase block mb-0.5">
                  DATE
                </span>
                <span className="text-sm font-sans font-semibold text-heron-primary">
                  {formatDateDisplay(record.payment_date)}
                </span>
              </div>

              {/* Payment Status with toggle capability */}
              <div>
                <span className="text-[10px] font-sans font-medium tracking-wider text-heron-tertiary uppercase block mb-1">
                  PAYMENT STATUS
                </span>
                {(() => {
                  const rawStatus = (record.status ?? 'PAID').trim().toUpperCase();
                  const status: 'PAID' | 'UNPAID' = rawStatus === 'UNPAID' ? 'UNPAID' : 'PAID';
                  return (
                    <button
                      type="button"
                      disabled={isToggling}
                      onClick={() => {
                        if (!isToggling) {
                          onToggleStatus?.(record);
                        }
                      }}
                      title={
                        isToggling
                          ? 'Updating status...'
                          : `Status: ${status}. Click to toggle.`
                      }
                      aria-label={`Toggle payment status for ${record.student_name}`}
                      className={`btn-heron inline-flex items-center gap-2 px-3 py-1.5 text-xs font-sans font-semibold tracking-wider uppercase border transition-all ${
                        isToggling ? 'opacity-60 cursor-wait' : 'cursor-pointer'
                      } ${
                        status === 'PAID'
                          ? 'border-emerald-600/40 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 hover:border-emerald-600'
                          : 'border-amber-600/40 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 hover:border-amber-600'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isToggling
                            ? 'border border-current border-t-transparent animate-spin'
                            : status === 'PAID'
                            ? 'bg-emerald-600'
                            : 'bg-amber-600'
                        }`}
                      />
                      <span>{status}</span>
                      <span className="text-[10px] text-heron-tertiary font-normal lowercase">
                        {isToggling ? '(updating...)' : '(click to toggle)'}
                      </span>
                    </button>
                  );
                })()}
              </div>

              {/* Note */}
              {record.note && (
                <div>
                  <span className="text-[10px] font-sans font-medium tracking-wider text-heron-tertiary uppercase block mb-0.5">
                    NOTE
                  </span>
                  <p className="text-xs text-heron-secondary font-sans italic bg-heron-subtle/50 p-3 border border-heron-border">
                    {record.note}
                  </p>
                </div>
              )}

              {/* Optimization Metadata (Secondary details only, no codec/format leakage) */}
              <div className="pt-4 border-t border-heron-border">
                <span className="text-[10px] font-sans font-medium tracking-wider text-heron-tertiary uppercase block mb-2.5">
                  RECEIPT DETAILS
                </span>

                <div className="bg-heron-bg border border-heron-border p-3.5 space-y-2 text-xs font-sans">
                  <div className="flex items-center justify-between">
                    <span className="text-heron-tertiary">Stored Size:</span>
                    <span className="font-bold text-heron-primary">
                      {record.receipt_compressed_size_bytes
                        ? formatBytes(record.receipt_compressed_size_bytes)
                        : 'N/A'}
                    </span>
                  </div>

                  {record.receipt_original_size_bytes ? (
                    <div className="flex items-center justify-between">
                      <span className="text-heron-tertiary">Original Size:</span>
                      <span className="text-heron-secondary font-medium">
                        {formatBytes(record.receipt_original_size_bytes)}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="p-6 border-t border-heron-border bg-heron-subtle/30 flex items-center justify-between gap-3">
            <button
              onClick={() => {
                onClose();
                onEdit(record);
              }}
              className="btn-heron flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-sans font-medium tracking-wider uppercase bg-heron-surface hover:bg-heron-subtle border border-heron-border text-heron-primary transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
            <button
              onClick={() => {
                onClose();
                onDelete(record);
              }}
              className="btn-heron flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-sans font-medium tracking-wider uppercase bg-heron-surface hover:bg-heron-brand/10 border border-heron-border hover:border-heron-brand/40 text-heron-brand transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
