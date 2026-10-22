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

  const nowIso = new Date().toISOString();

  // Validate and normalize each record
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

    // Trim core strings and round integer amounts
    rec.id = (rec.id as string).trim();
    rec.student_name = (rec.student_name as string).trim();
    rec.payment_date = (rec.payment_date as string).trim();
    rec.amount_idr = Math.round(rec.amount_idr as number);

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

    // Ensure created_at and updated_at are valid strings
    if (typeof rec.created_at !== 'string' || !rec.created_at.trim()) {
      rec.created_at = nowIso;
    } else {
      rec.created_at = (rec.created_at as string).trim();
    }

    if (typeof rec.updated_at !== 'string' || !rec.updated_at.trim()) {
      rec.updated_at = rec.created_at;
    } else {
      rec.updated_at = (rec.updated_at as string).trim();
    }

    // Normalize optional receipt and note fields
    rec.note = typeof rec.note === 'string' && rec.note.trim() ? rec.note.trim() : null;
    rec.receipt_storage_path =
      typeof rec.receipt_storage_path === 'string' && rec.receipt_storage_path.trim()
        ? rec.receipt_storage_path.trim()
        : null;
    rec.receipt_mime_type =
      typeof rec.receipt_mime_type === 'string' && rec.receipt_mime_type.trim()
        ? rec.receipt_mime_type.trim()
        : null;
    rec.receipt_original_size_bytes =
      typeof rec.receipt_original_size_bytes === 'number' &&
      Number.isFinite(rec.receipt_original_size_bytes)
        ? Math.round(rec.receipt_original_size_bytes)
        : null;
    rec.receipt_compressed_size_bytes =
      typeof rec.receipt_compressed_size_bytes === 'number' &&
      Number.isFinite(rec.receipt_compressed_size_bytes)
        ? Math.round(rec.receipt_compressed_size_bytes)
        : null;
    rec.receipt_width =
      typeof rec.receipt_width === 'number' && Number.isFinite(rec.receipt_width)
        ? Math.round(rec.receipt_width)
        : null;
    rec.receipt_height =
      typeof rec.receipt_height === 'number' && Number.isFinite(rec.receipt_height)
        ? Math.round(rec.receipt_height)
        : null;
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
    sRec.name = (sRec.name as string).trim();
    sRec.created_at =
      typeof sRec.created_at === 'string' && sRec.created_at.trim()
        ? sRec.created_at.trim()
        : nowIso;
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
    if (typeof rco.data_base64 !== 'string' || !rco.data_base64.trim()) {
      return {
        valid: false,
        error: `Invalid backup file: Receipt at index ${i} is missing base64 data.`,
      };
    }

    rco.id = (rco.id as string).trim();

    // Strip data URL scheme (e.g. data:image/jpeg;base64,) and any embedded whitespace
    let base64 = (rco.data_base64 as string).trim();
    const commaIdx = base64.indexOf(',');
    if (commaIdx !== -1 && base64.slice(0, commaIdx).includes('base64')) {
      base64 = base64.slice(commaIdx + 1).trim();
    }
    rco.data_base64 = base64.replace(/\s+/g, '');
    if (!rco.data_base64) {
      return {
        valid: false,
        error: `Invalid backup file: Receipt at index ${i} has empty base64 data.`,
      };
    }
    rco.mime_type =
      typeof rco.mime_type === 'string' && rco.mime_type.trim()
        ? rco.mime_type.trim()
        : 'image/jpeg';
  }

  const backup: DatabaseBackup = {
    version: typeof obj.version === 'string' ? obj.version : '1.1.3',
    schema_version: obj.schema_version,
    app: 'Honora',
    exported_at:
      typeof obj.exported_at === 'string' && obj.exported_at.trim()
        ? obj.exported_at.trim()
        : nowIso,
    records: obj.records as DatabaseBackup['records'],
    students: students as DatabaseBackup['students'],
    receipts: receipts as DatabaseBackup['receipts'],
  };

  return {
    valid: true,
    backup,
  };
}
