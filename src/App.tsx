import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus } from 'lucide-react';
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
import { BrandLogo } from './components/BrandLogo';

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

  return (
    <div className="min-h-screen flex flex-col bg-heron-bg text-heron-primary selection:bg-heron-brand selection:text-white font-sans">
      {/* Top Application Header */}
      <Header isTauri={service.isTauri} onNewPayment={handleOpenNewPayment} />

      {/* Main Page Area 1: Distinctive Heading & Primary Action */}
      <section className="border-b border-heron-border bg-heron-bg pt-8 sm:pt-12 pb-6">
        <div className="max-w-page mx-auto px-6 lg:px-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 bg-heron-brand" />
                <span className="text-[11px] font-sans tracking-wider text-heron-tertiary uppercase font-semibold">
                  FINANCIAL LEDGER
                </span>
              </div>
              <div className="flex items-center gap-3.5 sm:gap-4.5">
                <BrandLogo size="hero" />
                <h1 className="font-display font-bold text-3xl sm:text-5xl lg:text-6xl text-heron-primary tracking-tight uppercase leading-none">
                  PAYMENT RECORDS.
                </h1>
              </div>
              <p className="mt-2 text-xs sm:text-sm text-heron-secondary max-w-xl font-sans">
                Personal bank transfer ledger and receipt archive.
              </p>
            </div>

            <button
              onClick={handleOpenNewPayment}
              aria-label="ADD PAYMENT"
              className="btn-heron inline-flex items-center justify-center gap-2 bg-heron-primary hover:bg-heron-brand text-white text-xs font-sans font-semibold tracking-wider uppercase px-5 py-3 border border-heron-primary hover:border-heron-brand transition-all duration-200 cursor-pointer shadow-sm self-start sm:self-auto"
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
        key={paymentModalOpen ? (recordToEdit?.id ?? 'new') : 'closed'}
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onSaved={refreshData}
        recordToEdit={recordToEdit}
      />

      <ReceiptViewerModal
        key={viewerRecord ? viewerRecord.id : 'none'}
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
    </div>
  );
}

export default App;
