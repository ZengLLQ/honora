import React, { useState } from 'react';
import { AlertTriangle, Database, X, CheckCircle2 } from 'lucide-react';
import type { DatabaseBackup, ImportMode } from '../types/payment';
import { formatDateDisplay } from '../utils/formatters';

interface ImportConfirmModalProps {
  isOpen: boolean;
  backup: DatabaseBackup | null;
  onClose: () => void;
  onConfirm: (backup: DatabaseBackup, mode: ImportMode) => Promise<void>;
}

export const ImportConfirmModal: React.FC<ImportConfirmModalProps> = ({
  isOpen,
  backup,
  onClose,
  onConfirm,
}) => {
  const [mode, setMode] = useState<ImportMode>('merge');
  const [isImporting, setIsImporting] = useState(false);

  if (!isOpen || !backup) return null;

  const handleImport = async () => {
    setIsImporting(true);
    try {
      await onConfirm(backup, mode);
      onClose();
    } finally {
      setIsImporting(false);
    }
  };

  const formattedDate = backup.exported_at
    ? formatDateDisplay(backup.exported_at.split('T')[0])
    : 'Unknown date';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-heron-primary/75 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg bg-heron-bg border border-heron-border shadow-2xl p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 border border-heron-brand/30 bg-heron-brand/10 text-heron-brand">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3
                id="import-modal-title"
                className="font-display font-bold text-lg text-heron-primary tracking-tight uppercase"
              >
                IMPORT DATABASE BACKUP
              </h3>
              <p className="text-xs text-heron-secondary font-sans mt-0.5">
                Review archive contents and choose restore mode.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isImporting}
            aria-label="Close modal"
            className="text-heron-tertiary hover:text-heron-primary p-1 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Backup Metadata Card */}
        <div className="bg-heron-surface border border-heron-border p-4 mb-5 font-sans">
          <div className="flex items-center justify-between text-[11px] text-heron-tertiary uppercase tracking-wider font-semibold border-b border-heron-border pb-2.5 mb-3">
            <span>ARCHIVE: {backup.app} v{backup.version}</span>
            <span>EXPORTED: {formattedDate}</span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-2.5 bg-heron-bg border border-heron-border">
              <div className="font-display font-bold text-lg text-heron-primary">
                {backup.records.length}
              </div>
              <div className="text-[10px] uppercase font-semibold text-heron-tertiary tracking-wider mt-0.5">
                Records
              </div>
            </div>

            <div className="p-2.5 bg-heron-bg border border-heron-border">
              <div className="font-display font-bold text-lg text-heron-primary">
                {backup.students?.length ?? 0}
              </div>
              <div className="text-[10px] uppercase font-semibold text-heron-tertiary tracking-wider mt-0.5">
                Students
              </div>
            </div>

            <div className="p-2.5 bg-heron-bg border border-heron-border">
              <div className="font-display font-bold text-lg text-heron-brand">
                {backup.receipts?.length ?? 0}
              </div>
              <div className="text-[10px] uppercase font-semibold text-heron-tertiary tracking-wider mt-0.5">
                Receipts
              </div>
            </div>
          </div>
        </div>

        {/* Restore Mode Selection */}
        <div className="mb-5 space-y-2.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-heron-secondary font-sans mb-1.5">
            RESTORE MODE
          </label>

          {/* Option: Merge */}
          <button
            type="button"
            onClick={() => setMode('merge')}
            className={`w-full text-left p-3.5 border transition-all cursor-pointer font-sans ${
              mode === 'merge'
                ? 'bg-heron-surface border-heron-brand shadow-xs'
                : 'bg-heron-surface/50 border-heron-border hover:border-heron-secondary/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-heron-primary uppercase tracking-wide">
                Merge with Existing Data
              </span>
              {mode === 'merge' && (
                <CheckCircle2 className="w-4 h-4 text-heron-brand" />
              )}
            </div>
            <p className="text-[11px] text-heron-secondary mt-1 leading-normal">
              Adds new records and students from the backup, updating any existing matches. Existing records are preserved.
            </p>
          </button>

          {/* Option: Replace */}
          <button
            type="button"
            onClick={() => setMode('replace')}
            className={`w-full text-left p-3.5 border transition-all cursor-pointer font-sans ${
              mode === 'replace'
                ? 'bg-heron-surface border-amber-600 shadow-xs'
                : 'bg-heron-surface/50 border-heron-border hover:border-heron-secondary/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-heron-primary uppercase tracking-wide">
                Clean Replace (Full Restore)
              </span>
              {mode === 'replace' && (
                <CheckCircle2 className="w-4 h-4 text-amber-600" />
              )}
            </div>
            <p className="text-[11px] text-heron-secondary mt-1 leading-normal">
              Completely wipes current records, students, and receipts, replacing them entirely with the backup.
            </p>
          </button>
        </div>

        {/* Warning Callout if Replace Selected */}
        {mode === 'replace' && (
          <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 mb-5 flex items-start gap-2.5 text-xs text-amber-900 font-sans">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold uppercase tracking-wider block mb-0.5">
                Warning: Permanent Replacement
              </span>
              All current payment records, student directory entries, and saved receipt images will be permanently erased and replaced with this backup archive.
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isImporting}
            className="btn-heron px-5 py-2.5 text-xs font-sans font-medium tracking-wider uppercase text-heron-secondary hover:text-heron-primary border border-heron-border hover:border-heron-primary bg-heron-surface transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={isImporting}
            className={`btn-heron px-6 py-2.5 text-xs font-sans tracking-wider uppercase text-white font-semibold transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-sm ${
              mode === 'replace'
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-heron-brand hover:bg-heron-brandHover'
            }`}
          >
            {isImporting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Importing...</span>
              </>
            ) : (
              <span>Confirm Import</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
