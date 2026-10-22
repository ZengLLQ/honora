import type { DatabaseBackup } from '../types/payment';

export interface ValidationSuccess {
  valid: true;
  backup: DatabaseBackup;
}

export interface ValidationFailure {
  valid: false;
  error: string;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

export function validateBackupData(data: unknown): ValidationResult {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return {
      valid: false,
      error: 'Invalid backup file: Root must be a valid JSON object.',
    };
  }

  const obj = data as Record<string, unknown>;

  // Check app identifier
  if (typeof obj.app !== 'string' || obj.app.trim().toLowerCase() !== 'honora') {
    return {
      valid: false,
      error: 'Invalid backup file: Not a valid Honora backup archive.',
    };
  }

  // Check schema version
  if (typeof obj.schema_version !== 'number' || obj.schema_version !== 1) {
    return {
      valid: false,
      error: 'Invalid backup file: Unsupported schema version.',
    };
  }

  // Check records array
  if (!Array.isArray(obj.records)) {
    return {
      valid: false,
      error: 'Invalid backup file: Records list is missing or invalid.',
    };
  }

  // Validate each record
  for (let i = 0; i < obj.records.length; i++) {
    const r = obj.records[i];
    if (!r || typeof r !== 'object') {
      return {
        valid: false,
        error: `Invalid backup file: Record at index ${i} is not an object.`,
      };
    }

    const rec = r as Record<string, unknown>;
    if (typeof rec.id !== 'string' || !rec.id.trim()) {
      return {
        valid: false,
        error: `Invalid backup file: Record at index ${i} is missing a valid ID.`,
      };
    }

    if (typeof rec.student_name !== 'string' || !rec.student_name.trim()) {
      return {
        valid: false,
        error: `Invalid backup file: Record at index ${i} is missing a student name.`,
      };
    }

    if (
      typeof rec.payment_date !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(rec.payment_date.trim())
    ) {
      return {
        valid: false,
        error: `Invalid backup file: Record at index ${i} has an invalid payment date format (expected YYYY-MM-DD).`,
      };
    }

    if (
      typeof rec.amount_idr !== 'number' ||
      !Number.isFinite(rec.amount_idr) ||
      rec.amount_idr < 0
    ) {
      return {
        valid: false,
        error: `Invalid backup file: Record at index ${i} has an invalid amount (expected non-negative number).`,
      };
    }

    // Normalize status if present
    if (rec.status !== undefined && rec.status !== null) {
      if (typeof rec.status !== 'string') {
        rec.status = 'PAID';
      } else {
        const s = rec.status.trim().toUpperCase();
        rec.status = s === 'UNPAID' ? 'UNPAID' : 'PAID';
      }
    } else {
      rec.status = 'PAID';
    }
  }

  // Validate students if present
  const students = Array.isArray(obj.students) ? obj.students : [];
  for (let i = 0; i < students.length; i++) {
    const s = students[i];
    if (!s || typeof s !== 'object') {
      return {
        valid: false,
        error: `Invalid backup file: Student at index ${i} is not an object.`,
      };
    }
    const sRec = s as Record<string, unknown>;
    if (typeof sRec.name !== 'string' || !sRec.name.trim()) {
      return {
        valid: false,
        error: `Invalid backup file: Student at index ${i} is missing a valid name.`,
      };
    }
  }


  // Validate receipts if present
  const receipts = Array.isArray(obj.receipts) ? obj.receipts : [];
  for (let i = 0; i < receipts.length; i++) {
    const rc = receipts[i];
    if (!rc || typeof rc !== 'object') {
      return {
        valid: false,
        error: `Invalid backup file: Receipt at index ${i} is not an object.`,
      };
    }
    const rco = rc as Record<string, unknown>;
    if (typeof rco.id !== 'string' || !rco.id.trim()) {
      return {
        valid: false,
        error: `Invalid backup file: Receipt at index ${i} is missing an ID.`,
      };
    }
    if (typeof rco.data_base64 !== 'string') {
      return {
        valid: false,
        error: `Invalid backup file: Receipt at index ${i} is missing base64 data.`,
      };
    }
  }

  const backup: DatabaseBackup = {
    version: typeof obj.version === 'string' ? obj.version : '1.1.0',
    schema_version: obj.schema_version,
    app: 'Honora',
    exported_at:
      typeof obj.exported_at === 'string'
        ? obj.exported_at
        : new Date().toISOString(),
    records: obj.records as DatabaseBackup['records'],
    students: students as DatabaseBackup['students'],
    receipts: receipts as DatabaseBackup['receipts'],
  };

  return {
    valid: true,
    backup,
  };
}
