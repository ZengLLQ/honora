import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AlertCircle, CheckCircle2, Plus, X } from 'lucide-react';
import type { DatabaseBackup, ImportMode, PaymentRecord, PaymentSummary, RecordFilter } from './types/payment';
import { getPaymentService } from './services/storageService';
import { validateBackupData } from './services/backupValidation';
import { getAvailableMonths } from './utils/formatters';
import { useTheme } from './utils/theme';
import { Header } from './components/Header';
import { FinancialSummary } from './components/FinancialSummary';
import { FilterBar } from './components/FilterBar';
import { RecordList } from './components/RecordList';
import { PaymentModal } from './components/PaymentModal';
import { ReceiptViewerModal } from './components/ReceiptViewerModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { ImportConfirmModal } from './components/ImportConfirmModal';

export function App() {
  const service = useMemo(() => getPaymentService(), []);
  const { theme, toggleTheme } = useTheme();

  const [records, setRecords] = useState<PaymentRecord[]>([]);
  const [allRecordsForMonths, setAllRecordsForMonths] = useState<PaymentRecord[]>([]);
  const [summary, setSummary] = useState<PaymentSummary>({
    total_amount_idr: 0,
    total_records: 0,
    filtered_amount_idr: 0,
    filtered_records: 0,
  });
  const [filter, setFilter] = useState<RecordFilter>({});
  const [loading, setLoading] = useState(true);

  // Backup & Restore
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<DatabaseBackup | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Modals
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<PaymentRecord | null>(null);
  const [viewerRecord, setViewerRecord] = useState<PaymentRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<PaymentRecord | null>(null);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());


  const refreshData = useCallback(() => {
    let isCancelled = false;
    Promise.all([
      service.getRecords(filter),
      service.getSummary(filter),
      service.getRecords({}),
    ])
      .then(([fetchedRecords, fetchedSummary, allRecs]) => {
        if (!isCancelled) {
          setRecords(fetchedRecords);
          setSummary(fetchedSummary);
          setAllRecordsForMonths(allRecs);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load payment records:', err);
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [service, filter]);

  useEffect(() => {
    return refreshData();
  }, [refreshData]);

  const availableMonths = useMemo(
    () => getAvailableMonths(allRecordsForMonths),
    [allRecordsForMonths]
  );

  const handleOpenNewPayment = () => {
    setRecordToEdit(null);
    setPaymentModalOpen(true);
  };

  const handleOpenEdit = (rec: PaymentRecord) => {
    setRecordToEdit(rec);
    setPaymentModalOpen(true);
  };

  const handleOpenViewer = (rec: PaymentRecord) => {
    setViewerRecord(rec);
  };

  const handleOpenDelete = (rec: PaymentRecord) => {
    setRecordToDelete(rec);
  };

  const handleConfirmDelete = async (rec: PaymentRecord) => {
    await service.deleteRecord(rec.id);
    await refreshData();
  };

  const handleToggleStatus = async (rec: PaymentRecord) => {
    if (togglingIds.has(rec.id)) return;
    setTogglingIds((prev) => new Set(prev).add(rec.id));

    // Optimistic status flip for instant UI responsiveness
    const currentUpper = (rec.status ?? 'PAID').trim().toUpperCase();
    const nextStatus: 'PAID' | 'UNPAID' = currentUpper === 'PAID' ? 'UNPAID' : 'PAID';

    setRecords((prev) =>
      prev.map((r) => (r.id === rec.id ? { ...r, status: nextStatus } : r))
    );
    setViewerRecord((prev) =>
      prev && prev.id === rec.id ? { ...prev, status: nextStatus } : prev
    );

    try {
      const updated = await service.togglePaymentStatus(rec.id);
      setViewerRecord((prev) => (prev && prev.id === rec.id ? updated : prev));
      refreshData();
    } catch (err) {
      console.error('Failed to toggle payment status:', err);
      refreshData();
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(rec.id);
        return next;
      });
    }
  };

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback((prev) => (prev?.message === message ? null : prev));
    }, 5000);
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const backup = await service.exportDatabase();
      const jsonString = JSON.stringify(backup, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `honora-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Asynchronously revoke to give browser time to initiate download stream
      setTimeout(() => URL.revokeObjectURL(url), 5000);

      showFeedback(
        'success',
        `Database backup exported successfully (${backup.records.length} records, ${backup.receipts?.length ?? 0} receipts)`
      );
    } catch (err) {
      console.error('Export failed:', err);
      showFeedback('error', 'Failed to export database backup.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset file input so selecting the same file again works
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Safety guard against massive corrupt files (max 150 MB)
    const MAX_BACKUP_SIZE_BYTES = 150 * 1024 * 1024;
    if (file.size > MAX_BACKUP_SIZE_BYTES) {
      showFeedback('error', 'Backup file exceeds maximum allowed size (150 MB).');
      return;
    }

    try {
      const text = await file.text();
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        showFeedback('error', 'Invalid backup file: Not a valid JSON document.');
        return;
      }

      const valResult = validateBackupData(json);
      if (!valResult.valid) {
        showFeedback('error', valResult.error);
        return;
      }

      setPendingBackup(valResult.backup);
      setImportModalOpen(true);
    } catch (err) {
      console.error('Failed to read backup file:', err);
      showFeedback('error', 'Unable to read the chosen backup file.');
    }
  };

  const handleConfirmImport = async (backup: DatabaseBackup, mode: ImportMode) => {
    try {
      const result = await service.importDatabase(backup, mode);
      await refreshData();
      showFeedback(
        'success',
        `Database imported successfully (${result.records_count} records, ${result.students_count} students, ${result.receipts_count} receipts)`
      );
    } catch (err) {
      console.error('Import failed:', err);
      showFeedback('error', 'Failed to restore database from backup.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-heron-bg text-heron-primary selection:bg-heron-brand selection:text-white font-sans">
      {/* Top Application Header */}
      <Header
        isTauri={service.isTauri}
        onNewPayment={handleOpenNewPayment}
        onExport={handleExport}
        onImportClick={handleImportClick}
        isExporting={isExporting}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFileSelected}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />


      {/* Main Page Area 1: Distinctive Heading & Primary Action */}
      <section className="border-b border-heron-border bg-heron-bg pt-8 sm:pt-12 pb-6">
        <div className="max-w-page mx-auto px-6 lg:px-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 bg-heron-brand" />
                <span className="text-[11px] font-sans tracking-wider text-heron-tertiary uppercase font-semibold">
                  HONORA · FINANCIAL LEDGER
                </span>
              </div>
              <h1 className="font-display font-bold text-3xl sm:text-5xl lg:text-6xl text-heron-primary tracking-tight uppercase leading-none">
                PAYMENT RECORDS
              </h1>
            </div>

            <button
              onClick={handleOpenNewPayment}
              aria-label="ADD PAYMENT"
              className="btn-heron inline-flex items-center justify-center gap-2 bg-heron-primary hover:bg-heron-brand dark:bg-heron-brand dark:hover:bg-heron-brand-hover text-white text-xs font-sans font-semibold tracking-wider uppercase px-5 py-3 border border-heron-primary hover:border-heron-brand dark:border-heron-brand transition-all duration-200 cursor-pointer shadow-sm self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ADD PAYMENT</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Page Area 2: Compact Summary of Payment Activity */}
      <FinancialSummary summary={summary} filter={filter} />

      {/* Main Page Area 3: Search and Date Filters */}
      <FilterBar
        filter={filter}
        onChange={setFilter}
        availableMonths={availableMonths}
      />

      {/* Main Page Area 4: Chronological Payment Record List */}
      <main className="flex-1 bg-heron-bg">
        <RecordList
          records={records}
          filter={filter}
          loading={loading}
          onNewPayment={handleOpenNewPayment}
          onViewReceipt={handleOpenViewer}
          onEdit={handleOpenEdit}
          onDelete={handleOpenDelete}
          onClearFilter={() => setFilter({})}
          onToggleStatus={handleToggleStatus}
          togglingIds={togglingIds}
        />
      </main>

      {/* Footer & Attribution (Section 12) */}
      <footer className="border-t border-heron-border bg-heron-surface/60 py-6 transition-colors">
        <div className="max-w-page mx-auto px-6 lg:px-12 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-heron-tertiary font-sans">
            <span className="w-1.5 h-1.5 bg-heron-brand" />
            <span className="tracking-wider uppercase font-medium">TUTOR PAYMENT RECORDS</span>
          </div>

          <div
            className="text-heron-secondary font-sans tracking-normal"
            style={{ fontFamily: '"BT Grotesk", "Noto Sans SC", "Microsoft YaHei", "PingFang SC", sans-serif' }}
          >
            Made by JAYCEE 曾令强
          </div>
        </div>
      </footer>

      {/* Modals */}
      <PaymentModal
        key={paymentModalOpen ? `payment-${recordToEdit?.id ?? 'new'}` : 'payment-closed'}
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onSaved={refreshData}
        recordToEdit={recordToEdit}
      />

      <ReceiptViewerModal
        key={viewerRecord ? `viewer-${viewerRecord.id}` : 'viewer-closed'}
        isOpen={Boolean(viewerRecord)}
        record={viewerRecord}
        onClose={() => setViewerRecord(null)}
        onEdit={handleOpenEdit}
        onDelete={handleOpenDelete}
        onToggleStatus={handleToggleStatus}
        isToggling={Boolean(viewerRecord && togglingIds.has(viewerRecord.id))}
      />

      <DeleteConfirmModal
        isOpen={Boolean(recordToDelete)}
        record={recordToDelete}
        onClose={() => setRecordToDelete(null)}
        onConfirm={handleConfirmDelete}
      />

      <ImportConfirmModal
        key={importModalOpen ? `import-${pendingBackup?.exported_at ?? 'open'}` : 'import-closed'}
        isOpen={importModalOpen}
        backup={pendingBackup}
        onClose={() => {
          setImportModalOpen(false);
          setPendingBackup(null);
        }}
        onConfirm={handleConfirmImport}
      />


      {/* Concise Status Feedback Toast Notification */}
      {feedback && (
        <aside
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-heron-surface border shadow-xl text-xs font-sans max-w-md animate-fade-in ${
            feedback.type === 'success'
              ? 'border-heron-brand text-heron-primary'
              : 'border-amber-600/50 text-amber-950 dark:text-amber-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-heron-brand shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          )}
          <span className="font-medium flex-1">
            {feedback.message}
          </span>
          <button
            onClick={() => setFeedback(null)}
            className="text-heron-tertiary hover:text-heron-primary p-0.5 cursor-pointer"
            aria-label="Dismiss feedback"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </aside>
      )}
    </div>
  );
}


export default App;
