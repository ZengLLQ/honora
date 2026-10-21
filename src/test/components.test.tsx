import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FinancialSummary } from '../components/FinancialSummary';
import { FilterBar } from '../components/FilterBar';
import { RecordItem } from '../components/RecordItem';
import { RecordList } from '../components/RecordList';
import { PaymentRecord, PaymentSummary, RecordFilter } from '../types/payment';

describe('UI Components', () => {
  const dummySummary: PaymentSummary = {
    total_amount_idr: 5000000,
    total_records: 4,
    filtered_amount_idr: 2500000,
    filtered_records: 2,
  };

  const dummyRecordWithReceipt: PaymentRecord = {
    id: 'rec-1',
    student_name: 'Budi Santoso',
    payment_date: '2026-10-21',
    amount_idr: 1500000,
    receipt_storage_path: 'receipts/rec-1.jpg',
    receipt_mime_type: 'image/jpeg',
    receipt_original_size_bytes: 4200000,
    receipt_compressed_size_bytes: 820 * 1024,
    receipt_width: 1440,
    receipt_height: 2560,
    note: 'Math tutoring 8 sessions',
    created_at: '2026-10-21T10:00:00Z',
    updated_at: '2026-10-21T10:00:00Z',
  };

  const dummyRecordWithoutReceipt: PaymentRecord = {
    id: 'rec-2',
    student_name: 'Siti Rahma',
    payment_date: '2026-10-15',
    amount_idr: 1000000,
    receipt_storage_path: null,
    receipt_mime_type: null,
    receipt_original_size_bytes: null,
    receipt_compressed_size_bytes: null,
    receipt_width: null,
    receipt_height: null,
    note: null,
    created_at: '2026-10-15T10:00:00Z',
    updated_at: '2026-10-15T10:00:00Z',
  };

  describe('FinancialSummary', () => {
    it('renders total collected and record count', () => {
      render(<FinancialSummary summary={dummySummary} filter={{}} />);
      expect(screen.getByText('TOTAL COLLECTED')).toBeInTheDocument();
      expect(screen.getByText('Rp 5.000.000')).toBeInTheDocument();
      expect(screen.getByText(/4 recorded payment/)).toBeInTheDocument();
    });

    it('displays filtered period badge when filter is active', () => {
      render(
        <FinancialSummary
          summary={dummySummary}
          filter={{ search: 'Budi' }}
        />
      );
      expect(screen.getByText('FILTERED PERIOD')).toBeInTheDocument();
      expect(screen.getByText('Rp 2.500.000')).toBeInTheDocument();
    });
  });

  describe('FilterBar', () => {
    it('triggers search change callback', () => {
      const onChange = vi.fn();
      render(
        <FilterBar
          filter={{}}
          onChange={onChange}
          availableMonths={[{ value: '2026-10', label: 'October 2026' }]}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search student name...');
      fireEvent.change(searchInput, { target: { value: 'Budi' } });
      expect(onChange).toHaveBeenCalledWith({ search: 'Budi' });
    });

    it('renders and triggers reset button when filters are active', () => {
      const onChange = vi.fn();
      const filter: RecordFilter = { search: 'Budi' };
      render(
        <FilterBar
          filter={filter}
          onChange={onChange}
          availableMonths={[]}
        />
      );

      const resetBtn = screen.getByTitle('Reset active filters');
      expect(resetBtn).toBeInTheDocument();
      fireEvent.click(resetBtn);
      expect(onChange).toHaveBeenCalledWith({});
    });
  });

  describe('RecordItem', () => {
    it('renders record with receipt and triggers callbacks', () => {
      const onViewReceipt = vi.fn();
      const onEdit = vi.fn();
      const onDelete = vi.fn();

      render(
        <RecordItem
          record={dummyRecordWithReceipt}
          onViewReceipt={onViewReceipt}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      );

      expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
      expect(screen.getByText('Rp 1.500.000')).toBeInTheDocument();
      expect(screen.getByText('RECEIPT ATTACHED')).toBeInTheDocument();
      expect(screen.getByText('820 KB')).toBeInTheDocument();

      // Click receipt button
      fireEvent.click(screen.getByText('RECEIPT ATTACHED'));
      expect(onViewReceipt).toHaveBeenCalledWith(dummyRecordWithReceipt);

      // Click edit button
      fireEvent.click(screen.getByTitle('Edit record'));
      expect(onEdit).toHaveBeenCalledWith(dummyRecordWithReceipt);

      // Click delete button
      fireEvent.click(screen.getByTitle('Delete record'));
      expect(onDelete).toHaveBeenCalledWith(dummyRecordWithReceipt);
    });

    it('renders record without receipt correctly', () => {
      render(
        <RecordItem
          record={dummyRecordWithoutReceipt}
          onViewReceipt={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(screen.getByText('Siti Rahma')).toBeInTheDocument();
      expect(screen.getByText('Rp 1.000.000')).toBeInTheDocument();
      expect(screen.getByText('NO RECEIPT')).toBeInTheDocument();
    });
  });

  describe('RecordList', () => {
    it('renders empty state when no records exist', () => {
      const onNew = vi.fn();
      render(
        <RecordList
          records={[]}
          filter={{}}
          loading={false}
          onNewPayment={onNew}
          onViewReceipt={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onClearFilter={vi.fn()}
        />
      );

      expect(screen.getByText('NO PAYMENT RECORDS YET.')).toBeInTheDocument();
      fireEvent.click(screen.getByText('Record First Payment'));
      expect(onNew).toHaveBeenCalled();
    });

    it('renders no matching records state when filter is active', () => {
      const onClear = vi.fn();
      render(
        <RecordList
          records={[]}
          filter={{ search: 'Unknown' }}
          loading={false}
          onNewPayment={vi.fn()}
          onViewReceipt={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onClearFilter={onClear}
        />
      );

      expect(screen.getByText('NO MATCHING RECORDS.')).toBeInTheDocument();
      fireEvent.click(screen.getByText('Clear Active Filters'));
      expect(onClear).toHaveBeenCalled();
    });

    it('renders records list when populated', () => {
      render(
        <RecordList
          records={[dummyRecordWithReceipt, dummyRecordWithoutReceipt]}
          filter={{}}
          loading={false}
          onNewPayment={vi.fn()}
          onViewReceipt={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onClearFilter={vi.fn()}
        />
      );

      expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
      expect(screen.getByText('Siti Rahma')).toBeInTheDocument();
    });
  });
});
