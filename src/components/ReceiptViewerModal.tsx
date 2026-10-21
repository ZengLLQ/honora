import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Edit3,
  Trash2,
  CheckCircle,
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
}

export const ReceiptViewerModal: React.FC<ReceiptViewerModalProps> = ({
  isOpen,
  record,
  onClose,
  onEdit,
  onDelete,
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  useEffect(() => {
    if (!isOpen || !record) {
      setDataUrl('');
      setLoading(false);
      return;
    }

    setLoading(true);
    setZoomLevel(100);

    const service = getPaymentService();
    service
      .getReceiptDataUrl(record)
      .then((url) => {
        setDataUrl(url);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load receipt:', err);
        setLoading(false);
      });
  }, [isOpen, record]);

  if (!isOpen || !record) return null;

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 25, 250));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 25, 50));
  const handleResetZoom = () => setZoomLevel(100);

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    const ext = record.receipt_mime_type === 'image/png' ? 'png' : 'jpg';
    a.download = `receipt-${record.student_name.toLowerCase().replace(/\s+/g, '-')}-${record.payment_date}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-nearblack/90 backdrop-blur-md">
      <div className="relative w-full max-w-6xl h-[90vh] bg-ivory border border-editorial-border shadow-2xl flex flex-col md:flex-row overflow-hidden">
        {/* Main Left: Receipt Image Preview Stage */}
        <div className="relative flex-1 bg-nearblack flex flex-col border-b md:border-b-0 md:border-r border-editorial-borderDark overflow-hidden">
          {/* Zoom controls floating bar */}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 bg-nearblack/80 backdrop-blur-sm border border-editorial-borderDark px-3 py-1.5 text-xs text-white">
            <button
              onClick={handleZoomOut}
              className="p-1 hover:text-lavender transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="font-mono text-[11px] px-1">{zoomLevel}%</span>
            <button
              onClick={handleZoomIn}
              className="p-1 hover:text-lavender transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-3 bg-editorial-borderDark mx-1" />
            <button
              onClick={handleResetZoom}
              className="p-1 hover:text-lavender transition-colors"
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
              className="flex items-center gap-1.5 bg-nearblack-surface/90 hover:bg-nearblack-elevated border border-editorial-borderDark text-ivory text-xs font-mono tracking-wider uppercase px-3 py-1.5 transition-colors"
              title="Download receipt image"
            >
              <Download className="w-3.5 h-3.5 text-lavender" />
              <span>Download</span>
            </button>
          </div>

          {/* Image Display Area */}
          <div className="flex-1 overflow-auto flex items-center justify-center p-8">
            {loading ? (
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-lavender border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs font-mono tracking-widest text-editorial-muted uppercase">
                  Loading high-res receipt...
                </p>
              </div>
            ) : dataUrl ? (
              <img
                src={dataUrl}
                alt="Receipt Inspection"
                style={{
                  width: `${zoomLevel}%`,
                  maxWidth: zoomLevel === 100 ? '100%' : 'none',
                  maxHeight: zoomLevel === 100 ? '100%' : 'none',
                  transition: 'width 0.15s ease-out',
                }}
                className="object-contain shadow-2xl transition-all select-none"
              />
            ) : (
              <div className="text-center text-editorial-muted text-xs font-mono">
                Receipt file unavailable.
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Transaction & Optimization Details */}
        <div className="w-full md:w-96 bg-ivory flex flex-col justify-between overflow-y-auto">
          {/* Top of Sidebar: Header & Close */}
          <div>
            <div className="p-6 border-b border-editorial-border flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-editorial-muted uppercase">
                  RECEIPT INSPECTION
                </span>
                <h3 className="font-display font-extrabold text-xl text-nearblack tracking-tight">
                  TRANSACTION DETAILS
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-editorial-muted hover:text-nearblack transition-colors"
                title="Close receipt preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Information Rows */}
            <div className="p-6 space-y-6">
              {/* Student Name */}
              <div>
                <span className="text-[10px] font-mono tracking-widest text-editorial-muted uppercase block mb-1">
                  STUDENT NAME
                </span>
                <span className="font-display font-bold text-lg text-nearblack">
                  {record.student_name}
                </span>
              </div>

              {/* Amount */}
              <div>
                <span className="text-[10px] font-mono tracking-widest text-editorial-muted uppercase block mb-1">
                  TRANSFER AMOUNT
                </span>
                <span className="font-display font-extrabold text-2xl text-nearblack font-mono-num">
                  {formatIDR(record.amount_idr)}
                </span>
              </div>

              {/* Date */}
              <div>
                <span className="text-[10px] font-mono tracking-widest text-editorial-muted uppercase block mb-1">
                  TRANSFER DATE
                </span>
                <span className="text-sm font-mono text-nearblack font-semibold">
                  {formatDateDisplay(record.payment_date)}
                </span>
              </div>

              {/* Note */}
              {record.note && (
                <div>
                  <span className="text-[10px] font-mono tracking-widest text-editorial-muted uppercase block mb-1">
                    TRANSACTION NOTE
                  </span>
                  <p className="text-xs text-nearblack/80 font-editorial italic bg-white p-3 border border-editorial-border">
                    {record.note}
                  </p>
                </div>
              )}

              {/* Technical / Optimization Metadata */}
              <div className="pt-4 border-t border-editorial-border">
                <span className="text-[10px] font-mono tracking-widest text-editorial-muted uppercase block mb-3">
                  COMPRESSION & FILE INTEGRITY
                </span>

                <div className="bg-white border border-editorial-border p-4 space-y-2.5 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-editorial-muted">Stored Size:</span>
                    <span className="font-bold text-nearblack">
                      {record.receipt_compressed_size_bytes
                        ? formatBytes(record.receipt_compressed_size_bytes)
                        : 'N/A'}
                    </span>
                  </div>

                  {record.receipt_original_size_bytes ? (
                    <div className="flex items-center justify-between">
                      <span className="text-editorial-muted">Original Size:</span>
                      <span className="text-nearblack/70">
                        {formatBytes(record.receipt_original_size_bytes)}
                      </span>
                    </div>
                  ) : null}

                  {record.receipt_width && record.receipt_height ? (
                    <div className="flex items-center justify-between">
                      <span className="text-editorial-muted">Dimensions:</span>
                      <span className="text-nearblack">
                        {record.receipt_width} × {record.receipt_height} px
                      </span>
                    </div>
                  ) : null}

                  {record.receipt_mime_type ? (
                    <div className="flex items-center justify-between">
                      <span className="text-editorial-muted">Format:</span>
                      <span className="text-nearblack">{record.receipt_mime_type}</span>
                    </div>
                  ) : null}

                  <div className="pt-2 border-t border-editorial-border/60 flex items-center gap-1.5 text-status-success text-[11px]">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Verified Financial Detail Readability</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="p-6 border-t border-editorial-border bg-ivory/50 flex items-center justify-between gap-3">
            <button
              onClick={() => {
                onClose();
                onEdit(record);
              }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-mono tracking-wider uppercase bg-white hover:bg-ivory border border-editorial-border text-nearblack transition-colors rounded-none"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
            <button
              onClick={() => {
                onClose();
                onDelete(record);
              }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-mono tracking-wider uppercase bg-white hover:bg-status-error/10 border border-editorial-border hover:border-status-error text-status-error transition-colors rounded-none"
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
