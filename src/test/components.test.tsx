import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FinancialSummary } from '../components/FinancialSummary';
import { FilterBar } from '../components/FilterBar';
import { Header } from '../components/Header';
import { RecordItem } from '../components/RecordItem';
import { RecordList } from '../components/RecordList';
import { PaymentModal } from '../components/PaymentModal';
import { ReceiptViewerModal } from '../components/ReceiptViewerModal';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { StudentCombobox } from '../components/StudentCombobox';
import { App } from '../App';
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
    status: 'PAID',
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
    status: 'PAID',
    created_at: '2026-10-15T10:00:00Z',
    updated_at: '2026-10-15T10:00:00Z',
  };

  const dummyRecordUnpaid: PaymentRecord = {
    id: 'rec-3',
    student_name: 'Dimas Anggara',
    payment_date: '2026-10-18',
    amount_idr: 750000,
    receipt_storage_path: null,
    receipt_mime_type: null,
    receipt_original_size_bytes: null,
    receipt_compressed_size_bytes: null,
    receipt_width: null,
    receipt_height: null,
    note: 'Pending transfer confirmation',
    status: 'UNPAID',
    created_at: '2026-10-18T10:00:00Z',
    updated_at: '2026-10-18T10:00:00Z',
  };

  describe('FinancialSummary', () => {
    it('renders clean labels and numerical values for the 3 specified metrics', () => {
      render(<FinancialSummary summary={dummySummary} filter={{}} />);
      expect(screen.getByText('TOTAL PAYMENTS')).toBeInTheDocument();
      expect(screen.getByText('TOTAL RECEIVED')).toBeInTheDocument();
      expect(screen.getByText('ACTIVE DATE RANGE')).toBeInTheDocument();
      expect(screen.getAllByText('Rp 5.000.000').length).toBe(2); // total received & all-dates active range
      expect(screen.getByText('4')).toBeInTheDocument(); // total records
      expect(screen.queryByText('[ 01 ]')).not.toBeInTheDocument();
      expect(screen.queryByText(/Lifetime total across/i)).not.toBeInTheDocument();
    });

    it('displays filtered badges and updates active date range amount when filter is active', () => {
      render(
        <FinancialSummary
          summary={dummySummary}
          filter={{ search: 'Budi' }}
        />
      );
      expect(screen.getAllByText('FILTERED').length).toBeGreaterThan(0);
      expect(screen.getByText('Rp 5.000.000')).toBeInTheDocument(); // all-time total received
      expect(screen.getByText('Rp 2.500.000')).toBeInTheDocument(); // filtered date range amount
      expect(screen.getByText(/^\s*2\s*$/)).toBeInTheDocument();
      expect(screen.getByText(/\/ 4/)).toBeInTheDocument();
    });

    it('displays filtered badges and amounts when only status filter is active', () => {
      render(
        <FinancialSummary
          summary={dummySummary}
          filter={{ status: 'UNPAID' }}
        />
      );
      expect(screen.getAllByText('FILTERED').length).toBeGreaterThan(0);
      expect(screen.getByText('Rp 5.000.000')).toBeInTheDocument(); // all-time total received
      expect(screen.getByText('Rp 2.500.000')).toBeInTheDocument(); // filtered amount for unpaid
      expect(screen.getByText(/^\s*2\s*$/)).toBeInTheDocument();
      expect(screen.getByText(/\/ 4/)).toBeInTheDocument();
    });

    it('renders clean zero-state without errors', () => {
      const zeroSummary: PaymentSummary = {
        total_amount_idr: 0,
        total_records: 0,
        filtered_amount_idr: 0,
        filtered_records: 0,
      };
      render(<FinancialSummary summary={zeroSummary} filter={{}} />);
      expect(screen.getAllByText('Rp 0').length).toBe(2);
      expect(screen.getByText('0')).toBeInTheDocument();
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

    it('triggers status filter change callback', () => {
      const onChange = vi.fn();
      render(
        <FilterBar
          filter={{}}
          onChange={onChange}
          availableMonths={[]}
        />
      );

      const statusSelect = screen.getByLabelText('Filter by status');
      fireEvent.change(statusSelect, { target: { value: 'UNPAID' } });
      expect(onChange).toHaveBeenCalledWith({ status: 'UNPAID' });
    });
  });

  describe('RecordItem', () => {
    it('renders record with receipt and triggers callbacks', () => {
      const onViewReceipt = vi.fn();
      const onEdit = vi.fn();
      const onDelete = vi.fn();

      const { rerender } = render(
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

      // Verify highlighted mode styling support
      rerender(
        <RecordItem
          record={dummyRecordWithReceipt}
          isHighlighted={true}
          onViewReceipt={onViewReceipt}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      );
      expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
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
      expect(screen.getByRole('button', { name: /Status: PAID/i })).toBeInTheDocument();
    });

    it('renders clickable status toggle badge and triggers onToggleStatus callback', () => {
      const onToggleStatus = vi.fn();
      const { rerender } = render(
        <RecordItem
          record={dummyRecordWithReceipt}
          onViewReceipt={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onToggleStatus={onToggleStatus}
        />
      );

      const paidBadge = screen.getByRole('button', { name: /Status: PAID/i });
      expect(paidBadge).toBeInTheDocument();
      expect(paidBadge).toHaveTextContent('PAID');

      // Click to toggle
      fireEvent.click(paidBadge);
      expect(onToggleStatus).toHaveBeenCalledWith(dummyRecordWithReceipt);

      // Rerender with UNPAID record
      rerender(
        <RecordItem
          record={dummyRecordUnpaid}
          onViewReceipt={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onToggleStatus={onToggleStatus}
        />
      );

      const unpaidBadge = screen.getByRole('button', { name: /Status: UNPAID/i });
      expect(unpaidBadge).toBeInTheDocument();
      expect(unpaidBadge).toHaveTextContent('UNPAID');

      fireEvent.click(unpaidBadge);
      expect(onToggleStatus).toHaveBeenCalledWith(dummyRecordUnpaid);
    });

    it('disables status toggle badge and prevents callback when isToggling is true', () => {
      const onToggleStatus = vi.fn();
      render(
        <RecordItem
          record={dummyRecordWithReceipt}
          onViewReceipt={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onToggleStatus={onToggleStatus}
          isToggling={true}
        />
      );

      const paidBadge = screen.getByRole('button', { name: /Status: PAID/i });
      expect(paidBadge).toBeDisabled();
      expect(paidBadge).toHaveClass('opacity-60', 'cursor-wait');

      fireEvent.click(paidBadge);
      expect(onToggleStatus).not.toHaveBeenCalled();
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

      expect(screen.getByText('NO PAYMENTS YET')).toBeInTheDocument();
      expect(screen.getByText('Start by recording your first tutoring payment.')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /ADD PAYMENT/i }));
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
      fireEvent.click(screen.getByText('Clear Filters'));
      expect(onClear).toHaveBeenCalled();
    });

    it('renders no matching records state when only status filter is active and empty', () => {
      const onClear = vi.fn();
      render(
        <RecordList
          records={[]}
          filter={{ status: 'UNPAID' }}
          loading={false}
          onNewPayment={vi.fn()}
          onViewReceipt={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onClearFilter={onClear}
        />
      );

      expect(screen.getByText('NO MATCHING RECORDS.')).toBeInTheDocument();
      fireEvent.click(screen.getByText('Clear Filters'));
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
      expect(screen.getByText('PAYMENT')).toBeInTheDocument();
      expect(screen.getByText('RECORDS')).toBeInTheDocument();

      // Click second record to verify interactive selection
      fireEvent.click(screen.getByText('Siti Rahma'));
      expect(screen.getByText('Siti Rahma')).toBeInTheDocument();
    });
  });

  describe('Header', () => {
    it('renders clean brand title and triggers onNewPayment callback without leaking technical details', () => {
      const onNewPayment = vi.fn();
      render(<Header isTauri={false} onNewPayment={onNewPayment} />);
      expect(screen.getByText('HONORA')).toBeInTheDocument();
      expect(screen.getByTestId('brand-logo')).toBeInTheDocument();
      expect(screen.queryByText('Financial Receipt Ledger')).not.toBeInTheDocument();

      // Minimal Information Policy: No Tauri, Wasm, or IndexedDB leaked
      expect(screen.queryByText(/TAURI/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/INDEXEDDB/i)).not.toBeInTheDocument();

      const recordBtn = screen.getByRole('button', { name: /ADD PAYMENT/i });
      fireEvent.click(recordBtn);
      expect(onNewPayment).toHaveBeenCalled();
    });

    it('does not leak desktop implementation details when isTauri is true', () => {
      render(<Header isTauri={true} onNewPayment={vi.fn()} />);
      expect(screen.queryByText(/TAURI/i)).not.toBeInTheDocument();
    });
  });

  describe('PaymentModal', () => {
    it('renders direct, concise form labels, placeholders, and buttons', () => {
      render(
        <PaymentModal
          isOpen={true}
          onClose={vi.fn()}
          onSaved={vi.fn()}
          recordToEdit={null}
        />
      );
      expect(screen.getByRole('heading', { name: /ADD PAYMENT/i })).toBeInTheDocument();
      expect(screen.getByText(/Student Name/i)).toBeInTheDocument();
      expect(screen.getByText(/Date/i)).toBeInTheDocument();
      expect(screen.getByText(/Amount \(IDR\)/i)).toBeInTheDocument();
      expect(screen.getByText('Receipt')).toBeInTheDocument();
      expect(screen.getByText('Note')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Student name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Add note...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'ADD PAYMENT' })).toBeInTheDocument();
    });

    it('renders edit mode with existing record data', () => {
      render(
        <PaymentModal
          isOpen={true}
          onClose={vi.fn()}
          onSaved={vi.fn()}
          recordToEdit={dummyRecordWithReceipt}
        />
      );
      expect(screen.getByRole('heading', { name: /EDIT PAYMENT/i })).toBeInTheDocument();
      expect(screen.getByDisplayValue('Budi Santoso')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1.500.000')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument();
    });

    it('allows removing an existing receipt during edit', () => {
      render(
        <PaymentModal
          isOpen={true}
          onClose={vi.fn()}
          onSaved={vi.fn()}
          recordToEdit={dummyRecordWithReceipt}
        />
      );
      const removeBtn = screen.getByTitle('Remove receipt');
      expect(removeBtn).toBeInTheDocument();
      fireEvent.click(removeBtn);
      expect(screen.getByText(/Drop receipt image here/i)).toBeInTheDocument();
    });

    it('allows selecting and toggling between PAID and UNPAID status', () => {
      render(
        <PaymentModal
          isOpen={true}
          onClose={vi.fn()}
          onSaved={vi.fn()}
          recordToEdit={dummyRecordUnpaid}
        />
      );

      const paidBtn = screen.getByRole('button', { name: 'Status PAID' });
      const unpaidBtn = screen.getByRole('button', { name: 'Status UNPAID' });
      expect(paidBtn).toBeInTheDocument();
      expect(unpaidBtn).toBeInTheDocument();

      // Since dummyRecordUnpaid has status UNPAID:
      expect(unpaidBtn).toHaveAttribute('aria-pressed', 'true');
      expect(paidBtn).toHaveAttribute('aria-pressed', 'false');

      // Click PAID to toggle
      fireEvent.click(paidBtn);
      expect(paidBtn).toHaveAttribute('aria-pressed', 'true');
      expect(unpaidBtn).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('StudentCombobox', () => {
    const sampleStudents = ['Alice Smith', 'Budi Santoso', 'Clarissa Natalia'];

    it('renders with placeholder and current value', () => {
      render(
        <StudentCombobox
          value="Budi Santoso"
          onChange={vi.fn()}
          options={sampleStudents}
          placeholder="Student name"
        />
      );
      expect(screen.getByDisplayValue('Budi Santoso')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Student name')).toBeInTheDocument();
    });

    it('opens suggestion list on focus and allows 1-click selection', () => {
      const onChange = vi.fn();
      render(
        <StudentCombobox
          value=""
          onChange={onChange}
          options={sampleStudents}
          placeholder="Student name"
        />
      );

      const input = screen.getByPlaceholderText('Student name');
      fireEvent.focus(input);

      // Suggestions should appear
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
      expect(screen.getByText('Clarissa Natalia')).toBeInTheDocument();

      // 1-click on an option selects it
      fireEvent.mouseDown(screen.getByText('Clarissa Natalia'));
      expect(onChange).toHaveBeenCalledWith('Clarissa Natalia');
    });

    it('filters suggestions based on user input', () => {
      render(
        <StudentCombobox
          value="bu"
          onChange={vi.fn()}
          options={sampleStudents}
          placeholder="Student name"
        />
      );

      const input = screen.getByPlaceholderText('Student name');
      fireEvent.focus(input);

      // 'Budi Santoso' matches 'bu', others do not
      expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
      expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
      expect(screen.queryByText('Clarissa Natalia')).not.toBeInTheDocument();
    });

    it('shows auto-saves hint when user types a brand new student name', () => {
      render(
        <StudentCombobox
          value="David Kevin"
          onChange={vi.fn()}
          options={sampleStudents}
          placeholder="Student name"
        />
      );

      const input = screen.getByPlaceholderText('Student name');
      fireEvent.focus(input);

      expect(screen.getByText(/New student:/i)).toBeInTheDocument();
      expect(screen.getByText('"David Kevin"')).toBeInTheDocument();
      expect(screen.getByText('Auto-saves')).toBeInTheDocument();
    });

    it('supports keyboard navigation with ArrowDown and Enter to select', () => {
      const onChange = vi.fn();
      render(
        <StudentCombobox
          value=""
          onChange={onChange}
          options={sampleStudents}
          placeholder="Student name"
        />
      );

      const input = screen.getByPlaceholderText('Student name');
      // ArrowDown opens dropdown and highlights first item ('Alice Smith')
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();

      // Second ArrowDown moves to 'Budi Santoso'
      fireEvent.keyDown(input, { key: 'ArrowDown' });

      // Enter selects highlighted 'Budi Santoso'
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(onChange).toHaveBeenCalledWith('Budi Santoso');
    });

    it('closes suggestions when Escape key is pressed', () => {
      render(
        <StudentCombobox
          value=""
          onChange={vi.fn()}
          options={sampleStudents}
          placeholder="Student name"
        />
      );

      const input = screen.getByPlaceholderText('Student name');
      fireEvent.focus(input);
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();

      fireEvent.keyDown(input, { key: 'Escape' });
      expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
    });

    it('toggles dropdown when chevron toggle button is clicked', () => {
      render(
        <StudentCombobox
          value=""
          onChange={vi.fn()}
          options={sampleStudents}
          placeholder="Student name"
        />
      );

      const toggleBtn = screen.getByLabelText('Toggle student suggestions list');
      // Initially closed
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

      // Click to open
      fireEvent.click(toggleBtn);
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      // Click to close
      fireEvent.click(toggleBtn);
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('supports diacritic-insensitive filtering (e.g. renee matches Renée)', () => {
      render(
        <StudentCombobox
          value="renee"
          onChange={vi.fn()}
          options={['Renée Dupont', 'John Doe']}
          placeholder="Student name"
        />
      );

      const input = screen.getByPlaceholderText('Student name');
      fireEvent.focus(input);

      expect(screen.getByText('Renée Dupont')).toBeInTheDocument();
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });

    it('renders long student names with truncation classes without crashing', () => {
      const longName = 'Alexander Wolfeschlegelsteinhausenbergerdorff the Third Senior';
      render(
        <StudentCombobox
          value=""
          onChange={vi.fn()}
          options={[longName]}
          placeholder="Student name"
        />
      );

      const input = screen.getByPlaceholderText('Student name');
      fireEvent.focus(input);

      const optionSpan = screen.getByText(longName);
      expect(optionSpan).toHaveClass('truncate');
      expect(optionSpan).toHaveClass('min-w-0');
    });

    it('manages ARIA attributes and aria-activedescendant during keyboard navigation', () => {
      render(
        <StudentCombobox
          value=""
          onChange={vi.fn()}
          options={sampleStudents}
          placeholder="Student name"
        />
      );

      const input = screen.getByPlaceholderText('Student name');
      expect(input).not.toHaveAttribute('aria-activedescendant');

      // ArrowDown opens and highlights first item
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      expect(input).toHaveAttribute('aria-expanded', 'true');
      expect(input).toHaveAttribute('aria-activedescendant', expect.stringContaining('-option-0'));

      // ArrowDown moves to second item
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      expect(input).toHaveAttribute('aria-activedescendant', expect.stringContaining('-option-1'));
    });

    it('closes dropdown when clicking the new student hint banner', () => {
      render(
        <StudentCombobox
          value="Brand New Student"
          onChange={vi.fn()}
          options={sampleStudents}
          placeholder="Student name"
        />
      );

      const input = screen.getByPlaceholderText('Student name');
      fireEvent.focus(input);

      const hintBanner = screen.getByText('Auto-saves').closest('div');
      expect(hintBanner).toBeInTheDocument();

      fireEvent.click(hintBanner!);
      expect(screen.queryByText('Auto-saves')).not.toBeInTheDocument();
    });

    it('selecting an option via click closes the dropdown and does not reopen on focus', () => {
      const onChange = vi.fn();
      render(
        <StudentCombobox
          value=""
          onChange={onChange}
          options={sampleStudents}
          placeholder="Student name"
        />
      );

      const input = screen.getByPlaceholderText('Student name');
      fireEvent.focus(input);

      const option = screen.getByText('Alice Smith');
      fireEvent.click(option);

      expect(onChange).toHaveBeenCalledWith('Alice Smith');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('ReceiptViewerModal', () => {
    it('renders transaction details without exposing raw MIME formats or codecs', () => {
      render(
        <ReceiptViewerModal
          isOpen={true}
          record={dummyRecordWithReceipt}
          onClose={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      );
      expect(screen.getByText('TRANSACTION DETAILS')).toBeInTheDocument();
      expect(screen.getByText('STUDENT NAME')).toBeInTheDocument();
      expect(screen.getByText('AMOUNT')).toBeInTheDocument();
      expect(screen.getByText('DATE')).toBeInTheDocument();
      expect(screen.getByText('PAYMENT STATUS')).toBeInTheDocument();
      expect(screen.getByText('NOTE')).toBeInTheDocument();
      expect(screen.getByText('RECEIPT DETAILS')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();

      // Minimal Information Policy / Section 7: No raw MIME formats or codecs exposed
      expect(screen.queryByText(/image\/jpeg/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/image\/webp/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Format:/i)).not.toBeInTheDocument();
    });

    it('triggers onToggleStatus callback from receipt details panel', () => {
      const onToggleStatus = vi.fn();
      render(
        <ReceiptViewerModal
          isOpen={true}
          record={dummyRecordWithReceipt}
          onClose={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onToggleStatus={onToggleStatus}
        />
      );

      const statusToggleBtn = screen.getByRole('button', { name: /Toggle payment status/i });
      expect(statusToggleBtn).toBeInTheDocument();
      expect(statusToggleBtn).toHaveTextContent('PAID');

      fireEvent.click(statusToggleBtn);
      expect(onToggleStatus).toHaveBeenCalledWith(dummyRecordWithReceipt);
    });

    it('disables status toggle button and shows updating state when isToggling is true', () => {
      const onToggleStatus = vi.fn();
      render(
        <ReceiptViewerModal
          isOpen={true}
          record={dummyRecordWithReceipt}
          onClose={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onToggleStatus={onToggleStatus}
          isToggling={true}
        />
      );

      const statusToggleBtn = screen.getByRole('button', { name: /Toggle payment status/i });
      expect(statusToggleBtn).toBeDisabled();
      expect(statusToggleBtn).toHaveTextContent('(updating...)');

      fireEvent.click(statusToggleBtn);
      expect(onToggleStatus).not.toHaveBeenCalled();
    });

    it('handles zoom in, zoom out, and reset zoom controls', () => {
      render(
        <ReceiptViewerModal
          isOpen={true}
          record={dummyRecordWithReceipt}
          onClose={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      );
      expect(screen.getByText('100%')).toBeInTheDocument();
      fireEvent.click(screen.getByTitle('Zoom in'));
      expect(screen.getByText('125%')).toBeInTheDocument();
      fireEvent.click(screen.getByTitle('Zoom out'));
      expect(screen.getByText('100%')).toBeInTheDocument();
      fireEvent.click(screen.getByTitle('Zoom in'));
      fireEvent.click(screen.getByTitle('Reset zoom'));
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  describe('DeleteConfirmModal', () => {
    it('renders concise confirmation dialog and action buttons', () => {
      render(
        <DeleteConfirmModal
          isOpen={true}
          record={dummyRecordWithReceipt}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />
      );
      expect(screen.getByText('DELETE RECORD?')).toBeInTheDocument();
      expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
      expect(screen.queryByText(/permanently remove the payment record/i)).not.toBeInTheDocument();
    });
  });

  describe('Streamlined App Interface', () => {
    it('renders clean focused payment records header without descriptive filler copy', async () => {
      render(<App />);
      expect(screen.getByRole('heading', { level: 1, name: /PAYMENT RECORDS/i })).toBeInTheDocument();
      // Ensure BrandLogo is rendered both in header and hero section
      const brandLogos = screen.getAllByTestId('brand-logo');
      expect(brandLogos.length).toBeGreaterThanOrEqual(2);

      expect(screen.queryByText('PAYMENT LEDGER')).not.toBeInTheDocument();
      expect(screen.queryByText('FINANCIAL OVERVIEW & AUDIT')).not.toBeInTheDocument();
      expect(screen.queryByText('Financial Receipt Ledger')).not.toBeInTheDocument();
      expect(screen.queryByText('A LITTLE STORY')).not.toBeInTheDocument();
      expect(screen.queryByText(/LET'S RECORD SOMETHING/i)).not.toBeInTheDocument();
      expect(screen.queryByText('导师学费记录')).not.toBeInTheDocument();
      expect(screen.queryByText(/Record student bank transfers/i)).not.toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('NO PAYMENTS YET')).toBeInTheDocument();
      });
    });

    it('renders exact attribution Made by JAYCEE 曾令强 in footer', () => {
      render(<App />);
      expect(screen.getByText('Made by JAYCEE 曾令强')).toBeInTheDocument();
    });

    it('renders prominent ADD PAYMENT action button in Area 1 and NO PAYMENTS YET empty state', async () => {
      render(<App />);
      expect(screen.getAllByRole('button', { name: /ADD PAYMENT/i }).length).toBeGreaterThan(0);
      await waitFor(() => {
        expect(screen.getByText('NO PAYMENTS YET')).toBeInTheDocument();
        expect(screen.getByText('Start by recording your first tutoring payment.')).toBeInTheDocument();
      });
    });
  });
});

