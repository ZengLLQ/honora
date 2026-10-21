import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  getPaymentService,
  resetServiceInstanceForTesting,
} from '../services/storageService';
import type { CreateRecordPayload, UpdateRecordPayload } from '../types/payment';

describe('WebIndexedDBPaymentService Integration Tests', () => {
  beforeEach(async () => {
    resetServiceInstanceForTesting();
    localStorage.clear();

    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase('TutorPaymentRecordsDB');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      req.onblocked = () => resolve();
    });
  });

  afterEach(async () => {
    const service = getPaymentService();
    if (service.close) {
      await service.close();
    }
    resetServiceInstanceForTesting();
  });

  it('initializes with 0 records on the very first load', async () => {
    const service = getPaymentService();
    const records = await service.getRecords();
    expect(records.length).toBe(0);

    const summary = await service.getSummary();
    expect(summary.total_records).toBe(0);
    expect(summary.total_amount_idr).toBe(0);
  });

  it('maintains 0 records across reloads when clean', async () => {
    const service = getPaymentService();
    const records = await service.getRecords();
    expect(records.length).toBe(0);

    // Simulate page reload / new session
    const summaryAfterReload = await service.getSummary();
    expect(summaryAfterReload.total_records).toBe(0);
    expect(summaryAfterReload.total_amount_idr).toBe(0);
  });

  it('creates, updates, and reads records with receipt blob persistence', async () => {
    const service = getPaymentService();
    const dummyBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const createPayload: CreateRecordPayload = {
      student_name: 'Clarissa Natalia',
      payment_date: '2026-10-22',
      amount_idr: 2500000,
      note: 'Advance tuition for 12 sessions',
      receipt_base64: dummyBase64,
      receipt_mime_type: 'image/png',
      receipt_original_size_bytes: 1200000,
      receipt_compressed_size_bytes: 450000,
      receipt_width: 1080,
      receipt_height: 1920,
    };

    const created = await service.createRecord(createPayload);
    expect(created.id).toBeDefined();
    expect(created.student_name).toBe('Clarissa Natalia');
    expect(created.amount_idr).toBe(2500000);
    expect(created.receipt_storage_path).toBeDefined();
    expect(created.receipt_original_size_bytes).toBe(1200000);
    expect(created.receipt_compressed_size_bytes).toBe(450000);

    // Retrieve data URL of persisted receipt
    const dataUrl = await service.getReceiptDataUrl(created);
    expect(dataUrl).toContain('data:image/png;base64,');

    // Update record: modify amount and student name
    const updatePayload: UpdateRecordPayload = {
      id: created.id,
      student_name: 'Clarissa Natalia Winata',
      payment_date: '2026-10-22',
      amount_idr: 3000000,
      note: 'Updated to 15 sessions package',
    };

    const updated = await service.updateRecord(updatePayload);
    expect(updated.student_name).toBe('Clarissa Natalia Winata');
    expect(updated.amount_idr).toBe(3000000);
    expect(updated.receipt_storage_path).toBe(created.receipt_storage_path);

    // Verify filter by name
    const filteredByName = await service.getRecords({ search: 'winata' });
    expect(filteredByName.length).toBe(1);
    expect(filteredByName[0].id).toBe(created.id);

    // Verify filter by month
    const filteredByMonth = await service.getRecords({ month: '2026-10' });
    expect(filteredByMonth.length).toBe(1);

    const filteredOtherMonth = await service.getRecords({ month: '2026-09' });
    expect(filteredOtherMonth.length).toBe(0);

    // Verify filter by date range
    const filteredRange = await service.getRecords({
      from_date: '2026-10-20',
      to_date: '2026-10-25',
    });
    expect(filteredRange.length).toBe(1);

    // Delete record and ensure receipt blob is deleted
    await service.deleteRecord(created.id);
    const afterDelete = await service.getRecord(created.id);
    expect(afterDelete).toBeNull();

    const dataUrlAfterDelete = await service.getReceiptDataUrl(created);
    expect(dataUrlAfterDelete).toBe('');
  });

  it('handles removing receipt during update', async () => {
    const service = getPaymentService();
    const dummyBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const created = await service.createRecord({
      student_name: 'David Kevin',
      payment_date: '2026-10-21',
      amount_idr: 800000,
      receipt_base64: dummyBase64,
      receipt_mime_type: 'image/png',
    });

    expect(created.receipt_storage_path).toBeTruthy();

    const updated = await service.updateRecord({
      id: created.id,
      student_name: 'David Kevin',
      payment_date: '2026-10-21',
      amount_idr: 800000,
      remove_receipt: true,
    });

    expect(updated.receipt_storage_path).toBeNull();
    expect(updated.receipt_mime_type).toBeNull();
  });

  it('handles status creation, togglePaymentStatus, and filtering by status', async () => {
    const service = getPaymentService();

    // 1. Defaults to PAID
    const rec1 = await service.createRecord({
      student_name: 'Student One',
      payment_date: '2026-10-20',
      amount_idr: 500000,
    });
    expect(rec1.status).toBe('PAID');

    // 2. Explicitly UNPAID
    const rec2 = await service.createRecord({
      student_name: 'Student Two',
      payment_date: '2026-10-21',
      amount_idr: 600000,
      status: 'UNPAID',
    });
    expect(rec2.status).toBe('UNPAID');

    // 3. Toggle rec1 (PAID -> UNPAID)
    const toggled1 = await service.togglePaymentStatus(rec1.id);
    expect(toggled1.status).toBe('UNPAID');

    // Toggle back (UNPAID -> PAID)
    const toggledAgain = await service.togglePaymentStatus(rec1.id);
    expect(toggledAgain.status).toBe('PAID');

    // 4. Filtering by status
    const paidList = await service.getRecords({ status: 'PAID' });
    expect(paidList.length).toBe(1);
    expect(paidList[0].id).toBe(rec1.id);

    const unpaidList = await service.getRecords({ status: 'UNPAID' });
    expect(unpaidList.length).toBe(1);
    expect(unpaidList[0].id).toBe(rec2.id);

    // 5. Case-insensitive filtering
    const unpaidLower = await service.getRecords({ status: 'unpaid' as any });
    expect(unpaidLower.length).toBe(1);
    expect(unpaidLower[0].id).toBe(rec2.id);

    // 6. Summary filtered by status
    const summaryUnpaid = await service.getSummary({ status: 'UNPAID' });
    expect(summaryUnpaid.total_records).toBe(2);
    expect(summaryUnpaid.total_amount_idr).toBe(1100000);
    expect(summaryUnpaid.filtered_records).toBe(1);
    expect(summaryUnpaid.filtered_amount_idr).toBe(600000);

    // 7. Normalization of invalid status to PAID
    const rec3 = await service.createRecord({
      student_name: 'Student Three',
      payment_date: '2026-10-22',
      amount_idr: 400000,
      status: 'invalid_status' as any,
    });
    expect(rec3.status).toBe('PAID');
  });
});
