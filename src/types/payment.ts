export interface PaymentRecord {
  id: string;
  student_name: string;
  payment_date: string; // YYYY-MM-DD
  amount_idr: number; // Integer IDR
  receipt_storage_path?: string | null;
  receipt_mime_type?: string | null;
  receipt_original_size_bytes?: number | null;
  receipt_compressed_size_bytes?: number | null;
  receipt_width?: number | null;
  receipt_height?: number | null;
  note?: string | null;
  status?: 'PAID' | 'UNPAID';
  created_at: string;
  updated_at: string;
}

export interface RecordFilter {
  search?: string;
  month?: string; // YYYY-MM
  from_date?: string; // YYYY-MM-DD
  to_date?: string; // YYYY-MM-DD
  status?: 'PAID' | 'UNPAID';
}

export interface PaymentSummary {
  total_amount_idr: number;
  total_records: number;
  filtered_amount_idr: number;
  filtered_records: number;
}

export interface OptimizationResult {
  mime_type: string;
  original_size_bytes: number;
  compressed_size_bytes: number;
  width: number;
  height: number;
  data_base64: string;
  savings_percentage: number;
}

export interface CreateRecordPayload {
  student_name: string;
  payment_date: string;
  amount_idr: number;
  note?: string | null;
  status?: 'PAID' | 'UNPAID';
  receipt_base64?: string | null;
  receipt_mime_type?: string | null;
  receipt_original_size_bytes?: number | null;
  receipt_compressed_size_bytes?: number | null;
  receipt_width?: number | null;
  receipt_height?: number | null;
}

export interface UpdateRecordPayload {
  id: string;
  student_name: string;
  payment_date: string;
  amount_idr: number;
  note?: string | null;
  status?: 'PAID' | 'UNPAID';
  receipt_base64?: string | null;
  receipt_mime_type?: string | null;
  receipt_original_size_bytes?: number | null;
  receipt_compressed_size_bytes?: number | null;
  receipt_width?: number | null;
  receipt_height?: number | null;
  remove_receipt?: boolean;
}

export interface BackupStudent {
  name: string;
  created_at?: string;
}

export interface BackupReceipt {
  id: string;
  mime_type?: string | null;
  data_base64: string;
}

export interface DatabaseBackup {
  version: string;
  schema_version: number;
  app: string;
  exported_at: string;
  records: PaymentRecord[];
  students: BackupStudent[];
  receipts: BackupReceipt[];
}

export type ImportMode = 'merge' | 'replace';

export interface ImportResult {
  records_count: number;
  students_count: number;
  receipts_count: number;
  mode: ImportMode;
}

