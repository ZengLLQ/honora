import type {
  BackupReceipt,
  BackupStudent,
  CreateRecordPayload,
  DatabaseBackup,
  ImportMode,
  ImportResult,
  OptimizationResult,
  PaymentRecord,
  PaymentSummary,
  RecordFilter,
  UpdateRecordPayload,
} from '../types/payment';
import { blobToBase64, optimizeReceiptInBrowser } from './imageCompression';
import { validateBackupData } from './backupValidation';

export interface IPaymentService {
  isTauri: boolean;
  getRecords(filter?: RecordFilter): Promise<PaymentRecord[]>;
  getSummary(filter?: RecordFilter): Promise<PaymentSummary>;
  getRecord(id: string): Promise<PaymentRecord | null>;
  getStudentNames(): Promise<string[]>;
  createRecord(payload: CreateRecordPayload): Promise<PaymentRecord>;
  updateRecord(payload: UpdateRecordPayload): Promise<PaymentRecord>;
  deleteRecord(id: string): Promise<void>;
  togglePaymentStatus(id: string): Promise<PaymentRecord>;
  optimizeReceipt(file: File): Promise<OptimizationResult>;
  getReceiptDataUrl(record: PaymentRecord): Promise<string>;
  exportDatabase(): Promise<DatabaseBackup>;
  importDatabase(backup: DatabaseBackup, mode: ImportMode): Promise<ImportResult>;
  close?(): Promise<void>;
}


export function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

// -------------------------------------------------------------
// TAURI DESKTOP SERVICE IMPLEMENTATION
// -------------------------------------------------------------
class TauriPaymentService implements IPaymentService {
  isTauri = true;

  private async invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<T>(cmd, args);
  }

  async getRecords(filter?: RecordFilter): Promise<PaymentRecord[]> {
    return this.invoke<PaymentRecord[]>('get_payment_records', { filter });
  }

  async getSummary(filter?: RecordFilter): Promise<PaymentSummary> {
    return this.invoke<PaymentSummary>('get_payment_summary', { filter });
  }

  async getRecord(id: string): Promise<PaymentRecord | null> {
    return this.invoke<PaymentRecord | null>('get_payment_record', { id });
  }

  async createRecord(payload: CreateRecordPayload): Promise<PaymentRecord> {
    return this.invoke<PaymentRecord>('create_payment_record', { payload });
  }

  async updateRecord(payload: UpdateRecordPayload): Promise<PaymentRecord> {
    return this.invoke<PaymentRecord>('update_payment_record', { payload });
  }

  async deleteRecord(id: string): Promise<void> {
    return this.invoke<void>('delete_payment_record', { id });
  }

  async togglePaymentStatus(id: string): Promise<PaymentRecord> {
    return this.invoke<PaymentRecord>('toggle_payment_status', { id });
  }

  async optimizeReceipt(file: File): Promise<OptimizationResult> {
    const base64 = await blobToBase64(file);
    return this.invoke<OptimizationResult>('optimize_receipt_image', {
      bytesBase64: base64,
    });
  }

  async getReceiptDataUrl(record: PaymentRecord): Promise<string> {
    if (!record.receipt_storage_path) return '';
    const base64 = await this.invoke<string>('get_receipt_data', {
      storagePath: record.receipt_storage_path,
    });
    const mime = record.receipt_mime_type || 'image/jpeg';
    return `data:${mime};base64,${base64}`;
  }

  async getStudentNames(): Promise<string[]> {
    return this.invoke<string[]>('get_student_names');
  }

  async exportDatabase(): Promise<DatabaseBackup> {
    return this.invoke<DatabaseBackup>('export_database');
  }

  async importDatabase(backup: DatabaseBackup, mode: ImportMode): Promise<ImportResult> {
    return this.invoke<ImportResult>('import_database', { backup, mode });
  }
}


// -------------------------------------------------------------
// WEB INDEXEDDB CLIENT SERVICE IMPLEMENTATION
// -------------------------------------------------------------
const DB_NAME = 'HonoraDB';
const DB_VERSION = 2;
const STORE_RECORDS = 'payment_records';
const STORE_RECEIPTS = 'receipt_blobs';
const STORE_STUDENTS = 'students';

class WebIndexedDBPaymentService implements IPaymentService {
  isTauri = false;
  private dbPromise: Promise<IDBDatabase>;

  constructor() {
    this.dbPromise = this.initIndexedDB();
  }

  private initIndexedDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_RECORDS)) {
          const recordStore = db.createObjectStore(STORE_RECORDS, { keyPath: 'id' });
          recordStore.createIndex('student_name', 'student_name', { unique: false });
          recordStore.createIndex('payment_date', 'payment_date', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_RECEIPTS)) {
          db.createObjectStore(STORE_RECEIPTS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_STUDENTS)) {
          const studentStore = db.createObjectStore(STORE_STUDENTS, { keyPath: 'name' });
          if (db.objectStoreNames.contains(STORE_RECORDS)) {
            const tx = (event.target as IDBOpenDBRequest).transaction;
            if (tx) {
              const recordStore = tx.objectStore(STORE_RECORDS);
              const cursorReq = recordStore.openCursor();
              cursorReq.onsuccess = () => {
                const cursor = cursorReq.result;
                if (cursor) {
                  const rawName = (cursor.value as PaymentRecord)?.student_name?.trim();
                  if (rawName) {
                    studentStore.put({
                      name: rawName,
                      created_at: cursor.value.created_at || new Date().toISOString(),
                    });
                  }
                  cursor.continue();
                }
              };
            }
          }
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        resolve(db);
      };

      request.onerror = () => reject(request.error);
    });
  }

  private filterAndSort(records: PaymentRecord[], filter?: RecordFilter): PaymentRecord[] {
    let result = [...records];

    if (filter?.search) {
      const q = filter.search.trim().toLowerCase();
      if (q) {
        result = result.filter((r) => r.student_name.toLowerCase().includes(q));
      }
    }

    if (filter?.month) {
      const m = filter.month.trim();
      if (m) {
        result = result.filter((r) => r.payment_date.startsWith(m));
      }
    }

    if (filter?.from_date) {
      const from = filter.from_date.trim();
      if (from) {
        result = result.filter((r) => r.payment_date >= from);
      }
    }

    if (filter?.to_date) {
      const to = filter.to_date.trim();
      if (to) {
        result = result.filter((r) => r.payment_date <= to);
      }
    }

    if (filter?.status) {
      const target = filter.status.trim().toUpperCase();
      if (target) {
        result = result.filter(
          (r) => (r.status ?? 'PAID').trim().toUpperCase() === target
        );
      }
    }

    // Sort: newest payment_date first, then newest created_at
    result.sort((a, b) => {
      const dateCmp = b.payment_date.localeCompare(a.payment_date);
      if (dateCmp !== 0) return dateCmp;
      return b.created_at.localeCompare(a.created_at);
    });

    return result;
  }

  async getRecords(filter?: RecordFilter): Promise<PaymentRecord[]> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_RECORDS, 'readonly');
      const store = tx.objectStore(STORE_RECORDS);
      const req = store.getAll();

      req.onsuccess = () => {
        const list = this.filterAndSort(req.result as PaymentRecord[], filter);
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getSummary(filter?: RecordFilter): Promise<PaymentSummary> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_RECORDS, 'readonly');
      const store = tx.objectStore(STORE_RECORDS);
      const req = store.getAll();

      req.onsuccess = () => {
        const allRecords = req.result as PaymentRecord[];
        const totalAmount = allRecords.reduce((sum, r) => sum + (r.amount_idr || 0), 0);
        const totalCount = allRecords.length;

        const filtered = this.filterAndSort(allRecords, filter);
        const filteredAmount = filtered.reduce((sum, r) => sum + (r.amount_idr || 0), 0);
        const filteredCount = filtered.length;

        resolve({
          total_amount_idr: totalAmount,
          total_records: totalCount,
          filtered_amount_idr: filteredAmount,
          filtered_records: filteredCount,
        });
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getRecord(id: string): Promise<PaymentRecord | null> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_RECORDS, 'readonly');
      const store = tx.objectStore(STORE_RECORDS);
      const req = store.get(id);

      req.onsuccess = () => resolve((req.result as PaymentRecord) || null);
      req.onerror = () => reject(req.error);
    });
  }

  async createRecord(payload: CreateRecordPayload): Promise<PaymentRecord> {
    const name = payload.student_name.trim();
    if (!name) throw new Error('Student name is required.');
    if (!payload.payment_date) throw new Error('Transfer date is required.');
    if (payload.amount_idr <= 0) throw new Error('Amount must be a positive integer in IDR.');

    const db = await this.dbPromise;
    const id = 'rec_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    const now = new Date().toISOString();

    let storagePath: string | null = null;

    if (payload.receipt_base64 && payload.receipt_base64.trim()) {
      storagePath = `receipt_${id}`;
      const mime = payload.receipt_mime_type || 'image/jpeg';
      const binaryData = base64ToUint8Array(payload.receipt_base64);
      // Save receipt raw binary bytes in receipts store (no base64 strings in database)
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_RECEIPTS, 'readwrite');
        const store = tx.objectStore(STORE_RECEIPTS);
        const req = store.put({
          id: storagePath,
          mime,
          data: binaryData,
        });
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    }

    const statusUpper = (payload.status ?? 'PAID').trim().toUpperCase();
    const status: 'PAID' | 'UNPAID' = statusUpper === 'UNPAID' ? 'UNPAID' : 'PAID';

    const record: PaymentRecord = {
      id,
      student_name: name,
      payment_date: payload.payment_date,
      amount_idr: Math.round(payload.amount_idr),
      receipt_storage_path: storagePath,
      receipt_mime_type: payload.receipt_mime_type || null,
      receipt_original_size_bytes: payload.receipt_original_size_bytes || null,
      receipt_compressed_size_bytes: payload.receipt_compressed_size_bytes || null,
      receipt_width: payload.receipt_width || null,
      receipt_height: payload.receipt_height || null,
      note: payload.note?.trim() || null,
      status,
      created_at: now,
      updated_at: now,
    };

    return new Promise((resolve, reject) => {
      const stores = db.objectStoreNames.contains(STORE_STUDENTS)
        ? [STORE_RECORDS, STORE_STUDENTS]
        : [STORE_RECORDS];
      const tx = db.transaction(stores, 'readwrite');
      tx.objectStore(STORE_RECORDS).put(record);
      if (db.objectStoreNames.contains(STORE_STUDENTS)) {
        tx.objectStore(STORE_STUDENTS).put({ name, created_at: now });
      }

      tx.oncomplete = () => resolve(record);
      tx.onerror = () => reject(tx.error);
    });
  }

  async updateRecord(payload: UpdateRecordPayload): Promise<PaymentRecord> {
    const existing = await this.getRecord(payload.id);
    if (!existing) throw new Error('Payment record not found.');

    const name = payload.student_name.trim();
    if (!name) throw new Error('Student name is required.');
    if (!payload.payment_date) throw new Error('Transfer date is required.');
    if (payload.amount_idr <= 0) throw new Error('Amount must be a positive integer in IDR.');

    const db = await this.dbPromise;
    const now = new Date().toISOString();

    let storagePath = existing.receipt_storage_path;
    let mime = existing.receipt_mime_type;
    let origSize = existing.receipt_original_size_bytes;
    let compSize = existing.receipt_compressed_size_bytes;
    let width = existing.receipt_width;
    let height = existing.receipt_height;

    if (payload.remove_receipt) {
      if (storagePath) {
        await new Promise<void>((resolve, reject) => {
          const txReceipt = db.transaction(STORE_RECEIPTS, 'readwrite');
          const req = txReceipt.objectStore(STORE_RECEIPTS).delete(storagePath!);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      }
      storagePath = null;
      mime = null;
      origSize = null;
      compSize = null;
      width = null;
      height = null;
    } else if (payload.receipt_base64 && payload.receipt_base64.trim()) {
      if (storagePath) {
        await new Promise<void>((resolve, reject) => {
          const txReceipt = db.transaction(STORE_RECEIPTS, 'readwrite');
          const req = txReceipt.objectStore(STORE_RECEIPTS).delete(storagePath!);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      }
      storagePath = `receipt_${payload.id}`;
      mime = payload.receipt_mime_type || 'image/jpeg';
      origSize = payload.receipt_original_size_bytes || null;
      compSize = payload.receipt_compressed_size_bytes || null;
      width = payload.receipt_width || null;
      height = payload.receipt_height || null;

      const binaryData = base64ToUint8Array(payload.receipt_base64);
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_RECEIPTS, 'readwrite');
        const store = tx.objectStore(STORE_RECEIPTS);
        const req = store.put({
          id: storagePath,
          mime,
          data: binaryData,
        });
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    }

    const rawStatus = payload.status ?? existing.status ?? 'PAID';
    const statusUpper = rawStatus.trim().toUpperCase();
    const status: 'PAID' | 'UNPAID' = statusUpper === 'UNPAID' ? 'UNPAID' : 'PAID';

    const updated: PaymentRecord = {
      id: payload.id,
      student_name: name,
      payment_date: payload.payment_date,
      amount_idr: Math.round(payload.amount_idr),
      receipt_storage_path: storagePath,
      receipt_mime_type: mime,
      receipt_original_size_bytes: origSize,
      receipt_compressed_size_bytes: compSize,
      receipt_width: width,
      receipt_height: height,
      note: payload.note?.trim() || null,
      status,
      created_at: existing.created_at,
      updated_at: now,
    };

    return new Promise((resolve, reject) => {
      const stores = db.objectStoreNames.contains(STORE_STUDENTS)
        ? [STORE_RECORDS, STORE_STUDENTS]
        : [STORE_RECORDS];
      const tx = db.transaction(stores, 'readwrite');
      tx.objectStore(STORE_RECORDS).put(updated);
      if (db.objectStoreNames.contains(STORE_STUDENTS)) {
        tx.objectStore(STORE_STUDENTS).put({ name, created_at: now });
      }

      tx.oncomplete = () => resolve(updated);
      tx.onerror = () => reject(tx.error);
    });
  }

  async getStudentNames(): Promise<string[]> {
    const db = await this.dbPromise;
    const nameMap = new Map<string, string>();

    // 1. Scan STORE_STUDENTS if available
    if (db.objectStoreNames.contains(STORE_STUDENTS)) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_STUDENTS, 'readonly');
        const store = tx.objectStore(STORE_STUDENTS);
        const req = store.getAll();
        req.onsuccess = () => {
          const items = (req.result || []) as { name: string }[];
          for (const item of items) {
            const raw = item?.name?.trim();
            if (raw) {
              const key = raw.toLowerCase();
              if (!nameMap.has(key)) {
                nameMap.set(key, raw);
              }
            }
          }
          resolve();
        };
        req.onerror = () => reject(req.error);
      });
    }

    // 2. Scan STORE_RECORDS for any records
    const missingInStudents: string[] = [];
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_RECORDS, 'readonly');
      const store = tx.objectStore(STORE_RECORDS);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = (req.result || []) as PaymentRecord[];
        for (const item of items) {
          const raw = item?.student_name?.trim();
          if (raw) {
            const key = raw.toLowerCase();
            if (!nameMap.has(key)) {
              nameMap.set(key, raw);
              missingInStudents.push(raw);
            }
          }
        }
        resolve();
      };
      req.onerror = () => reject(req.error);
    });

    // Asynchronously backfill missing names into STORE_STUDENTS to guarantee retention upon record deletion
    if (missingInStudents.length > 0 && db.objectStoreNames.contains(STORE_STUDENTS)) {
      try {
        const writeTx = db.transaction(STORE_STUDENTS, 'readwrite');
        const studentStore = writeTx.objectStore(STORE_STUDENTS);
        const now = new Date().toISOString();
        for (const name of missingInStudents) {
          studentStore.put({ name, created_at: now });
        }
      } catch {
        // Non-critical background migration
      }
    }

    const names = Array.from(nameMap.values()).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' })
    );
    return names;
  }

  async deleteRecord(id: string): Promise<void> {
    const existing = await this.getRecord(id);
    if (!existing) return;

    const db = await this.dbPromise;

    if (existing.receipt_storage_path) {
      await new Promise<void>((resolve, reject) => {
        const txReceipt = db.transaction(STORE_RECEIPTS, 'readwrite');
        const req = txReceipt.objectStore(STORE_RECEIPTS).delete(existing.receipt_storage_path!);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_RECORDS, 'readwrite');
      const store = tx.objectStore(STORE_RECORDS);
      const req = store.delete(id);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async togglePaymentStatus(id: string): Promise<PaymentRecord> {
    const existing = await this.getRecord(id);
    if (!existing) throw new Error('Payment record not found.');
    const current = (existing.status ?? 'PAID').trim().toUpperCase();
    const nextStatus: 'PAID' | 'UNPAID' = current === 'PAID' ? 'UNPAID' : 'PAID';
    return this.updateRecord({
      id: existing.id,
      student_name: existing.student_name,
      payment_date: existing.payment_date,
      amount_idr: existing.amount_idr,
      note: existing.note ?? undefined,
      status: nextStatus,
    });
  }

  async optimizeReceipt(file: File): Promise<OptimizationResult> {
    return optimizeReceiptInBrowser(file);
  }

  async getReceiptDataUrl(record: PaymentRecord): Promise<string> {
    if (!record.receipt_storage_path) return '';

    const db = await this.dbPromise;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_RECEIPTS, 'readonly');
      const store = tx.objectStore(STORE_RECEIPTS);
      const req = store.get(record.receipt_storage_path!);

      req.onsuccess = () => {
        if (!req.result) {
          resolve('');
          return;
        }
        if (req.result.data instanceof ArrayBuffer) {
          const view = new Uint8Array(req.result.data);
          const base64 = uint8ArrayToBase64(view);
          resolve(`data:${req.result.mime || 'image/jpeg'};base64,${base64}`);
        } else if (req.result.data && (req.result.data instanceof Uint8Array || ArrayBuffer.isView(req.result.data))) {
          const view = req.result.data instanceof Uint8Array
            ? req.result.data
            : new Uint8Array(req.result.data.buffer, req.result.data.byteOffset, req.result.data.byteLength);
          const base64 = uint8ArrayToBase64(view);
          resolve(`data:${req.result.mime || 'image/jpeg'};base64,${base64}`);
        } else if (req.result.base64) {
          const cleaned = cleanBase64String(req.result.base64);
          resolve(`data:${req.result.mime || 'image/jpeg'};base64,${cleaned}`);
        } else {
          resolve('');
        }
      };
      req.onerror = () => resolve('');
    });
  }

  async exportDatabase(): Promise<DatabaseBackup> {
    const db = await this.dbPromise;

    // 1. Get all records
    const records = await new Promise<PaymentRecord[]>((resolve, reject) => {
      const tx = db.transaction(STORE_RECORDS, 'readonly');
      const req = tx.objectStore(STORE_RECORDS).getAll();
      req.onsuccess = () => resolve((req.result || []) as PaymentRecord[]);
      req.onerror = () => reject(req.error);
    });

    // 2. Get all students and ensure all distinct record student names are included
    let students: BackupStudent[] = [];
    const seenStudentNames = new Set<string>();

    if (db.objectStoreNames.contains(STORE_STUDENTS)) {
      const rawStudents = await new Promise<BackupStudent[]>((resolve, reject) => {
        const tx = db.transaction(STORE_STUDENTS, 'readonly');
        const req = tx.objectStore(STORE_STUDENTS).getAll();
        req.onsuccess = () => resolve((req.result || []) as BackupStudent[]);
        req.onerror = () => reject(req.error);
      });
      for (const st of rawStudents) {
        const trimmed = st.name?.trim();
        if (trimmed && !seenStudentNames.has(trimmed.toLowerCase())) {
          seenStudentNames.add(trimmed.toLowerCase());
          students.push({ name: trimmed, created_at: st.created_at });
        }
      }
    }

    for (const rec of records) {
      const trimmed = rec.student_name?.trim();
      if (trimmed && !seenStudentNames.has(trimmed.toLowerCase())) {
        seenStudentNames.add(trimmed.toLowerCase());
        students.push({ name: trimmed, created_at: rec.created_at });
      }
    }

    students.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    // 3. Get all receipts and convert to base64
    const receipts = await new Promise<BackupReceipt[]>((resolve, reject) => {
      const tx = db.transaction(STORE_RECEIPTS, 'readonly');
      const req = tx.objectStore(STORE_RECEIPTS).getAll();
      req.onsuccess = () => {
        const list: BackupReceipt[] = [];
        const rawReceipts = (req.result || []) as {
          id: string;
          mime?: string;
          data?: ArrayBuffer | Uint8Array | ArrayBufferView;
          base64?: string;
        }[];
        for (const r of rawReceipts) {
          if (!r.id) continue;
          let base64 = '';
          if (r.data instanceof ArrayBuffer) {
            base64 = uint8ArrayToBase64(new Uint8Array(r.data));
          } else if (r.data && (r.data instanceof Uint8Array || ArrayBuffer.isView(r.data))) {
            const view =
              r.data instanceof Uint8Array
                ? r.data
                : new Uint8Array(
                    r.data.buffer,
                    r.data.byteOffset,
                    r.data.byteLength
                  );
            base64 = uint8ArrayToBase64(view);
          } else if (r.base64) {
            base64 = cleanBase64String(r.base64);
          }
          list.push({
            id: r.id,
            mime_type: r.mime || 'image/jpeg',
            data_base64: base64,
          });
        }
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });

    return {
      version: '1.1.2',
      schema_version: 1,
      app: 'Honora',
      exported_at: new Date().toISOString(),
      records,
      students,
      receipts,
    };
  }

  async importDatabase(
    backup: DatabaseBackup,
    mode: ImportMode
  ): Promise<ImportResult> {
    const valResult = validateBackupData(backup);
    if (!valResult.valid) {
      throw new Error(valResult.error);
    }
    const cleanBackup = valResult.backup;

    const db = await this.dbPromise;
    const stores = db.objectStoreNames.contains(STORE_STUDENTS)
      ? [STORE_RECORDS, STORE_STUDENTS, STORE_RECEIPTS]
      : [STORE_RECORDS, STORE_RECEIPTS];

    return new Promise((resolve, reject) => {
      const tx = db.transaction(stores, 'readwrite');

      if (mode === 'replace') {
        tx.objectStore(STORE_RECORDS).clear();
        tx.objectStore(STORE_RECEIPTS).clear();
        if (db.objectStoreNames.contains(STORE_STUDENTS)) {
          tx.objectStore(STORE_STUDENTS).clear();
        }
      }

      const recordStore = tx.objectStore(STORE_RECORDS);
      const studentStore = db.objectStoreNames.contains(STORE_STUDENTS)
        ? tx.objectStore(STORE_STUDENTS)
        : null;
      const receiptStore = tx.objectStore(STORE_RECEIPTS);

      const now = new Date().toISOString();

      // Put records and retain student names
      for (const rec of cleanBackup.records) {
        recordStore.put(rec);
        const name = rec.student_name?.trim();
        if (name && studentStore) {
          studentStore.put({ name, created_at: rec.created_at || now });
        }
      }

      // Put explicitly listed students
      if (studentStore && Array.isArray(cleanBackup.students)) {
        for (const st of cleanBackup.students) {
          const name = st.name?.trim();
          if (name) {
            studentStore.put({ name, created_at: st.created_at || now });
          }
        }
      }

      // Put receipts
      if (Array.isArray(cleanBackup.receipts)) {
        for (const r of cleanBackup.receipts) {
          if (!r.id || !r.data_base64) continue;
          const bytes = base64ToUint8Array(r.data_base64);
          receiptStore.put({
            id: r.id,
            mime: r.mime_type || 'image/jpeg',
            data: bytes,
          });
        }
      }

      tx.oncomplete = () => {
        resolve({
          records_count: cleanBackup.records.length,
          students_count: cleanBackup.students.length,
          receipts_count: cleanBackup.receipts.length,
          mode,
        });
      };

      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(new Error('Transaction aborted during import.'));
    });
  }

  async close(): Promise<void> {
    const db = await this.dbPromise;
    db.close();
  }
}


function cleanBase64String(raw: string): string {
  let cleaned = raw.trim();
  const commaIdx = cleaned.indexOf(',');
  if (commaIdx !== -1 && cleaned.slice(0, commaIdx).includes('base64')) {
    cleaned = cleaned.slice(commaIdx + 1).trim();
  }
  return cleaned.replace(/\s+/g, '');
}

function base64ToUint8Array(base64: string): Uint8Array {
  const cleaned = cleanBase64String(base64);
  const binaryString = atob(cleaned);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 32768;
  const len = bytes.byteLength;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

// -------------------------------------------------------------
// SINGLETON FACTORY
// -------------------------------------------------------------
let serviceInstance: IPaymentService | null = null;

export function getPaymentService(): IPaymentService {
  if (!serviceInstance) {
    if (isTauriEnvironment()) {
      serviceInstance = new TauriPaymentService();
    } else {
      serviceInstance = new WebIndexedDBPaymentService();
    }
  }
  return serviceInstance;
}

export function resetServiceInstanceForTesting(): void {
  serviceInstance = null;
}
