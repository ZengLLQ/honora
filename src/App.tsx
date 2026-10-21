import { useState, useEffect, useCallback, useMemo } from 'react';
import type { PaymentRecord, PaymentSummary, RecordFilter } from './types/payment';
import { getPaymentService } from './services/storageService';
import { getAvailableMonths } from './utils/formatters';
import { Header } from './components/Header';
import { FinancialSummary } from './components/FinancialSummary';
import { FilterBar } from './components/FilterBar';
import { RecordList } from './components/RecordList';
import { PaymentModal } from './components/PaymentModal';
import { ReceiptViewerModal } from './components/ReceiptViewerModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';

export function App() {
  const service = useMemo(() => getPaymentService(), []);

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

  // Modals
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<PaymentRecord | null>(null);
  const [viewerRecord, setViewerRecord] = useState<PaymentRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<PaymentRecord | null>(null);

  // Fetch records and summary
  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      const [fetchedRecords, fetchedSummary, allRecs] = await Promise.all([
        service.getRecords(filter),
        service.getSummary(filter),
        service.getRecords({}),
      ]);
      setRecords(fetchedRecords);
      setSummary(fetchedSummary);
      setAllRecordsForMonths(allRecs);
    } catch (err) {
      console.error('Failed to load payment records:', err);
    } finally {
      setLoading(false);
    }
  }, [service, filter]);

  useEffect(() => {
    refreshData();
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

  return (
    <div className="min-h-screen flex flex-col bg-ivory text-nearblack">
      {/* Top Header */}
      <Header isTauri={service.isTauri} onNewPayment={handleOpenNewPayment} />

      {/* Hero Editorial Heading */}
      <section className="bg-ivory pt-12 pb-8 border-b border-editorial-border">
        <div className="max-w-page mx-auto px-6 lg:px-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 bg-lavender" />
                <span className="text-[11px] font-mono tracking-widest text-editorial-muted uppercase">
                  FINANCIAL OVERVIEW & AUDIT
                </span>
              </div>
              <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl text-nearblack tracking-tighter leading-none">
                PAYMENT <span className="font-editorial italic font-normal text-nearblack/70">Records</span>.
              </h1>
              <p className="mt-3 text-sm text-editorial-muted max-w-xl">
                Record student bank transfers, automatically compress high-resolution receipts, and preserve transaction details.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={handleOpenNewPayment}
                className="hidden sm:inline-flex items-center gap-2 bg-nearblack hover:bg-nearblack-surface text-ivory font-mono text-xs tracking-wider uppercase px-6 py-3.5 transition-colors border border-editorial-borderDark"
              >
                + Add Record
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Financial Summary Bar */}
      <FinancialSummary summary={summary} filter={filter} />

      {/* Filter and Search Bar */}
      <FilterBar
        filter={filter}
        onChange={setFilter}
        availableMonths={availableMonths}
      />

      {/* Main Records List Section */}
      <main className="flex-1">
        <RecordList
          records={records}
          filter={filter}
          loading={loading}
          onNewPayment={handleOpenNewPayment}
          onViewReceipt={handleOpenViewer}
          onEdit={handleOpenEdit}
          onDelete={handleOpenDelete}
          onClearFilter={() => setFilter({})}
        />
      </main>

      {/* Editorial Footer */}
      <footer className="bg-nearblack text-ivory border-t border-editorial-borderDark py-10 mt-auto">
        <div className="max-w-page mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-6 text-xs font-mono text-editorial-muted">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 bg-lavender rotate-45" />
            <span className="tracking-widest uppercase text-ivory font-semibold">
              TUTOR PAYMENT LEDGER
            </span>
            <span>•</span>
            <span>Rust Core & Tauri 2 Desktop • React Web</span>
          </div>

          <div className="flex items-center gap-6">
            <span>INTEGER IDR PERSISTENCE</span>
            <span>AUTO IMAGE OPTIMIZATION</span>
            <span className="text-lavender">2026 EDITION</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onSaved={refreshData}
        recordToEdit={recordToEdit}
      />

      <ReceiptViewerModal
        isOpen={Boolean(viewerRecord)}
        record={viewerRecord}
        onClose={() => setViewerRecord(null)}
        onEdit={handleOpenEdit}
        onDelete={handleOpenDelete}
      />

      <DeleteConfirmModal
        isOpen={Boolean(recordToDelete)}
        record={recordToDelete}
        onClose={() => setRecordToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

export default App;
