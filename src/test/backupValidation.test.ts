import { describe, it, expect } from 'vitest';
import { validateBackupData } from '../services/backupValidation';
import type { DatabaseBackup } from '../types/payment';

describe('backupValidation unit tests', () => {
  const validBackup: DatabaseBackup = {
    version: '1.2.1',
    schema_version: 1,
    app: 'Honora',
    exported_at: '2026-10-22T08:00:00.000Z',
    records: [
      {
        id: 'rec-1',
        student_name: 'Budi Santoso',
        payment_date: '2026-10-15',
        amount_idr: 1250000,
        receipt_storage_path: 'receipts/rec-1.jpg',
        receipt_mime_type: 'image/jpeg',
        receipt_original_size_bytes: 500000,
        receipt_compressed_size_bytes: 120000,
        receipt_width: 1080,
        receipt_height: 1920,
        note: 'Physics tutoring',
        status: 'PAID',
        created_at: '2026-10-15T10:00:00Z',
        updated_at: '2026-10-15T10:00:00Z',
      },
    ],
    students: [
      {
        name: 'Budi Santoso',
        created_at: '2026-10-15T10:00:00Z',
      },
    ],
    receipts: [
      {
        id: 'receipts/rec-1.jpg',
        mime_type: 'image/jpeg',
        data_base64: 'aGVsbG8gd29ybGQ=',
      },
    ],
  };

  it('accepts a fully valid DatabaseBackup object', () => {
    const res = validateBackupData(validBackup);
    expect(res.valid).toBe(true);
    if (res.valid) {
      expect(res.backup.app).toBe('Honora');
      expect(res.backup.records.length).toBe(1);
      expect(res.backup.students.length).toBe(1);
      expect(res.backup.receipts.length).toBe(1);
    }
  });

  it('rejects null, primitive, or array root values', () => {
    expect(validateBackupData(null).valid).toBe(false);
    expect(validateBackupData('string').valid).toBe(false);
    expect(validateBackupData([]).valid).toBe(false);
    expect(validateBackupData(undefined).valid).toBe(false);
  });

  it('rejects unrecognized app identifier', () => {
    const invalid = { ...validBackup, app: 'OtherApp' };
    const res = validateBackupData(invalid);
    expect(res.valid).toBe(false);
    if (!res.valid) {
      expect(res.error).toContain('Not a valid Honora backup archive');
    }
  });

  it('rejects unsupported schema version', () => {
    const invalid = { ...validBackup, schema_version: 2 };
    const res = validateBackupData(invalid);
    expect(res.valid).toBe(false);
    if (!res.valid) {
      expect(res.error).toContain('Unsupported schema version');
    }
  });

  it('rejects backup with missing or malformed records', () => {
    const invalid1 = { ...validBackup, records: 'not an array' };
    expect(validateBackupData(invalid1).valid).toBe(false);

    // Record missing ID
    const invalid2 = {
      ...validBackup,
      records: [{ ...validBackup.records[0], id: '' }],
    };
    expect(validateBackupData(invalid2).valid).toBe(false);

    // Record missing student_name
    const invalid3 = {
      ...validBackup,
      records: [{ ...validBackup.records[0], student_name: '   ' }],
    };
    expect(validateBackupData(invalid3).valid).toBe(false);

    // Record invalid date format
    const invalid4 = {
      ...validBackup,
      records: [{ ...validBackup.records[0], payment_date: '15/10/2026' }],
    };
    expect(validateBackupData(invalid4).valid).toBe(false);

    // Record negative amount
    const invalid5 = {
      ...validBackup,
      records: [{ ...validBackup.records[0], amount_idr: -5000 }],
    };
    expect(validateBackupData(invalid5).valid).toBe(false);
  });

  it('normalizes status string', () => {
    const clone = JSON.parse(JSON.stringify(validBackup));
    clone.records[0].status = 'unpaid';
    const res = validateBackupData(clone);
    expect(res.valid).toBe(true);
    if (res.valid) {
      expect(res.backup.records[0].status).toBe('UNPAID');
    }

    const clone2 = JSON.parse(JSON.stringify(validBackup));
    clone2.records[0].status = 'unknown_status';
    const res2 = validateBackupData(clone2);
    expect(res2.valid).toBe(true);
    if (res2.valid) {
      expect(res2.backup.records[0].status).toBe('PAID');
    }
  });

  it('rejects corrupt receipts with missing base64 data', () => {
    const invalid = {
      ...validBackup,
      receipts: [{ id: 'receipt_1', data_base64: 12345 }],
    };
    const res = validateBackupData(invalid);
    expect(res.valid).toBe(false);
  });

  it('rejects receipts with empty or whitespace-only base64 data', () => {
    const invalid = {
      ...validBackup,
      receipts: [{ id: 'receipt_1', data_base64: '   ' }],
    };
    const res = validateBackupData(invalid);
    expect(res.valid).toBe(false);
  });

  it('strips data URL prefix and whitespace from receipt base64', () => {
    const clone = JSON.parse(JSON.stringify(validBackup));
    clone.receipts = [
      {
        id: 'rec_data_url',
        mime_type: 'image/png',
        data_base64: '  data:image/png;base64, aGVsbG8gd29ybGQ= \n',
      },
    ];
    const res = validateBackupData(clone);
    expect(res.valid).toBe(true);
    if (res.valid) {
      expect(res.backup.receipts[0].data_base64).toBe('aGVsbG8gd29ybGQ=');
    }
  });

  it('backfills missing created_at and updated_at and rounds float amounts', () => {
    const rawData = {
      app: 'Honora',
      schema_version: 1,
      version: '1.1.0',
      records: [
        {
          id: 'rec-float',
          student_name: '  Trimmed Name  ',
          payment_date: '2026-10-15',
          amount_idr: 1250000.75,
        },
      ],
      students: [{ name: '  Trimmed Name  ' }],
    };

    const res = validateBackupData(rawData);
    expect(res.valid).toBe(true);
    if (res.valid) {
      expect(res.backup.records[0].amount_idr).toBe(1250001);
      expect(res.backup.records[0].student_name).toBe('Trimmed Name');
      expect(typeof res.backup.records[0].created_at).toBe('string');
      expect(res.backup.records[0].created_at).toBe(res.backup.records[0].updated_at);
      expect(res.backup.students[0].name).toBe('Trimmed Name');
      expect(typeof res.backup.students[0].created_at).toBe('string');
    }
  });
});
