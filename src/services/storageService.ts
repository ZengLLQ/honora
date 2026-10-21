import type {
  CreateRecordPayload,
  OptimizationResult,
  PaymentRecord,
  PaymentSummary,
  RecordFilter,
  UpdateRecordPayload,
} from '../types/payment';
import { blobToBase64, optimizeReceiptInBrowser } from './imageCompression';

export interface IPaymentService {
  isTauri: boolean;
  getRecords(filter?: RecordFilter): Promise<PaymentRecord[]>;
  getSummary(filter?: RecordFilter): Promise<PaymentSummary>;
  getRecord(id: string): Promise<PaymentRecord | null>;
  createRecord(payload: CreateRecordPayload): Promise<PaymentRecord>;
  updateRecord(payload: UpdateRecordPayload): Promise<PaymentRecord>;
  deleteRecord(id: string): Promise<void>;
  optimizeReceipt(file: File): Promise<OptimizationResult>;
  getReceiptDataUrl(record: PaymentRecord): Promise<string>;
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
}

// -------------------------------------------------------------
// WEB INDEXEDDB CLIENT SERVICE IMPLEMENTATION
// -------------------------------------------------------------
const DB_NAME = 'TutorPaymentRecordsDB';
const DB_VERSION = 1;
const STORE_RECORDS = 'payment_records';
const STORE_RECEIPTS = 'receipt_blobs';

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
      };

      request.onsuccess = async () => {
        const db = request.result;
        await this.seedDemoDataIfEmpty(db);
        resolve(db);
      };

      request.onerror = () => reject(request.error);
    });
  }

  private async seedDemoDataIfEmpty(db: IDBDatabase): Promise<void> {
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_RECORDS, 'readonly');
      const store = tx.objectStore(STORE_RECORDS);
      const countReq = store.count();

      countReq.onsuccess = () => {
        if (countReq.result === 0) {
          const writeTx = db.transaction(STORE_RECORDS, 'readwrite');
          const writeStore = writeTx.objectStore(STORE_RECORDS);

          const initialRecords: PaymentRecord[] = [
            {
              id: 'demo-1',
              student_name: 'Budi Santoso',
              payment_date: '2026-10-18',
              amount_idr: 1500000,
              receipt_storage_path: 'demo-receipt-1',
              receipt_mime_type: 'image/jpeg',
              receipt_original_size_bytes: 4200000,
              receipt_compressed_size_bytes: 820000,
              receipt_width: 1440,
              receipt_height: 2560,
              note: 'Physics & Calculus tutoring — 8 sessions package',
              created_at: new Date('2026-10-18T09:30:00Z').toISOString(),
              updated_at: new Date('2026-10-18T09:30:00Z').toISOString(),
            },
            {
              id: 'demo-2',
              student_name: 'Siti Rahma',
              payment_date: '2026-10-15',
              amount_idr: 1200000,
              receipt_storage_path: 'demo-receipt-2',
              receipt_mime_type: 'image/png',
              receipt_original_size_bytes: 3100000,
              receipt_compressed_size_bytes: 650000,
              receipt_width: 1080,
              receipt_height: 1920,
              note: 'Chemistry preparation for national exam',
              created_at: new Date('2026-10-15T14:20:00Z').toISOString(),
              updated_at: new Date('2026-10-15T14:20:00Z').toISOString(),
            },
            {
              id: 'demo-3',
              student_name: 'Dewi Lestari',
              payment_date: '2026-10-02',
              amount_idr: 900000,
              receipt_storage_path: null,
              receipt_mime_type: null,
              receipt_original_size_bytes: null,
              receipt_compressed_size_bytes: null,
              receipt_width: null,
              receipt_height: null,
              note: 'English grammar & essay writing — 4 sessions',
              created_at: new Date('2026-10-02T11:00:00Z').toISOString(),
              updated_at: new Date('2026-10-02T11:00:00Z').toISOString(),
            },
            {
              id: 'demo-4',
              student_name: 'Alexander Pratama',
              payment_date: '2026-09-28',
              amount_idr: 1800000,
              receipt_storage_path: 'demo-receipt-4',
              receipt_mime_type: 'image/jpeg',
              receipt_original_size_bytes: 5400000,
              receipt_compressed_size_bytes: 980000,
              receipt_width: 1600,
              receipt_height: 2400,
              note: 'High school competition mathematics',
              created_at: new Date('2026-09-28T16:45:00Z').toISOString(),
              updated_at: new Date('2026-09-28T16:45:00Z').toISOString(),
            },
          ];

          for (const rec of initialRecords) {
            writeStore.put(rec);
          }

          writeTx.oncomplete = () => resolve();
          writeTx.onerror = () => resolve();
        } else {
          resolve();
        }
      };
      countReq.onerror = () => resolve();
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
      // Save receipt in receipts store
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_RECEIPTS, 'readwrite');
        const store = tx.objectStore(STORE_RECEIPTS);
        const req = store.put({
          id: storagePath,
          mime: payload.receipt_mime_type || 'image/jpeg',
          base64: payload.receipt_base64,
        });
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    }

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
      created_at: now,
      updated_at: now,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_RECORDS, 'readwrite');
      const store = tx.objectStore(STORE_RECORDS);
      const req = store.put(record);

      req.onsuccess = () => resolve(record);
      req.onerror = () => reject(req.error);
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
        const tx = db.transaction(STORE_RECEIPTS, 'readwrite');
        tx.objectStore(STORE_RECEIPTS).delete(storagePath);
      }
      storagePath = null;
      mime = null;
      origSize = null;
      compSize = null;
      width = null;
      height = null;
    } else if (payload.receipt_base64 && payload.receipt_base64.trim()) {
      if (storagePath) {
        const tx = db.transaction(STORE_RECEIPTS, 'readwrite');
        tx.objectStore(STORE_RECEIPTS).delete(storagePath);
      }
      storagePath = `receipt_${payload.id}`;
      mime = payload.receipt_mime_type || 'image/jpeg';
      origSize = payload.receipt_original_size_bytes || null;
      compSize = payload.receipt_compressed_size_bytes || null;
      width = payload.receipt_width || null;
      height = payload.receipt_height || null;

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_RECEIPTS, 'readwrite');
        const store = tx.objectStore(STORE_RECEIPTS);
        const req = store.put({
          id: storagePath,
          mime,
          base64: payload.receipt_base64,
        });
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    }

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
      created_at: existing.created_at,
      updated_at: now,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_RECORDS, 'readwrite');
      const store = tx.objectStore(STORE_RECORDS);
      const req = store.put(updated);

      req.onsuccess = () => resolve(updated);
      req.onerror = () => reject(req.error);
    });
  }

  async deleteRecord(id: string): Promise<void> {
    const existing = await this.getRecord(id);
    if (!existing) return;

    const db = await this.dbPromise;

    if (existing.receipt_storage_path) {
      const txReceipt = db.transaction(STORE_RECEIPTS, 'readwrite');
      txReceipt.objectStore(STORE_RECEIPTS).delete(existing.receipt_storage_path);
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_RECORDS, 'readwrite');
      const store = tx.objectStore(STORE_RECORDS);
      const req = store.delete(id);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async optimizeReceipt(file: File): Promise<OptimizationResult> {
    return optimizeReceiptInBrowser(file);
  }

  async getReceiptDataUrl(record: PaymentRecord): Promise<string> {
    if (!record.receipt_storage_path) return '';

    // If demo receipt, generate a clean SVG receipt placeholder
    if (record.receipt_storage_path.startsWith('demo-receipt')) {
      return createSampleReceiptSvg(record);
    }

    const db = await this.dbPromise;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_RECEIPTS, 'readonly');
      const store = tx.objectStore(STORE_RECEIPTS);
      const req = store.get(record.receipt_storage_path!);

      req.onsuccess = () => {
        if (req.result && req.result.base64) {
          resolve(`data:${req.result.mime || 'image/jpeg'};base64,${req.result.base64}`);
        } else {
          resolve('');
        }
      };
      req.onerror = () => resolve('');
    });
  }
}

/**
 * Creates a clean SVG placeholder receipt for seeded demo records.
 */
function createSampleReceiptSvg(record: PaymentRecord): string {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800" style="background:#FAF8F5; font-family:sans-serif;">
  <rect x="20" y="20" width="560" height="760" rx="8" fill="#FFFFFF" stroke="#D4D0C7" stroke-width="2"/>
  <rect x="20" y="20" width="560" height="100" fill="#101116"/>
  <text x="50" y="65" fill="#8982E8" font-size="14" font-weight="bold" letter-spacing="3">BANK TRANSFER RECEIPT</text>
  <text x="50" y="95" fill="#FFFFFF" font-size="20" font-weight="bold">TRANSFER SUCCESSFUL</text>
  <line x1="50" y1="160" x2="550" y2="160" stroke="#E5E3DC" stroke-dasharray="4"/>
  <text x="50" y="200" fill="#85848A" font-size="12" letter-spacing="1.5">RECIPIENT / STUDENT</text>
  <text x="50" y="230" fill="#101116" font-size="22" font-weight="bold">${record.student_name}</text>
  <text x="50" y="290" fill="#85848A" font-size="12" letter-spacing="1.5">TRANSFER AMOUNT</text>
  <text x="50" y="330" fill="#101116" font-size="32" font-weight="bold">Rp ${(record.amount_idr || 0).toLocaleString('id-ID')}</text>
  <text x="50" y="390" fill="#85848A" font-size="12" letter-spacing="1.5">TRANSACTION DATE</text>
  <text x="50" y="420" fill="#101116" font-size="18">${record.payment_date}</text>
  <text x="50" y="480" fill="#85848A" font-size="12" letter-spacing="1.5">REFERENCE NUMBER</text>
  <text x="50" y="510" fill="#101116" font-size="16" font-family="monospace">TRX-${record.id.toUpperCase()}-IDR</text>
  <line x1="50" y1="570" x2="550" y2="570" stroke="#E5E3DC" stroke-dasharray="4"/>
  <text x="50" y="620" fill="#85848A" font-size="12" letter-spacing="1.5">STATUS</text>
  <rect x="50" y="635" width="120" height="30" rx="4" fill="#E8F5E9"/>
  <text x="75" y="656" fill="#2E7D32" font-size="13" font-weight="bold">COMPLETED</text>
  <text x="50" y="730" fill="#B3B0A8" font-size="11">OFFICIAL DIGITAL TRANSFER RECORD • VERIFIED</text>
</svg>
  `.trim();
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
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
