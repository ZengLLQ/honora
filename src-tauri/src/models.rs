use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PaymentRecord {
    pub id: String,
    pub student_name: String,
    pub payment_date: String,
    pub amount_idr: i64,
    pub receipt_storage_path: Option<String>,
    pub receipt_mime_type: Option<String>,
    pub receipt_original_size_bytes: Option<i64>,
    pub receipt_compressed_size_bytes: Option<i64>,
    pub receipt_width: Option<u32>,
    pub receipt_height: Option<u32>,
    pub note: Option<String>,
    pub status: Option<String>,
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct RecordFilter {
    pub search: Option<String>,
    pub month: Option<String>,      // Format: YYYY-MM
    pub from_date: Option<String>,  // Format: YYYY-MM-DD
    pub to_date: Option<String>,    // Format: YYYY-MM-DD
    pub status: Option<String>,     // "PAID" or "UNPAID"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentSummary {
    pub total_amount_idr: i64,
    pub total_records: usize,
    pub filtered_amount_idr: i64,
    pub filtered_records: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimizationResult {
    pub mime_type: String,
    pub original_size_bytes: usize,
    pub compressed_size_bytes: usize,
    pub width: u32,
    pub height: u32,
    pub data_base64: String,
    pub savings_percentage: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateRecordPayload {
    pub student_name: String,
    pub payment_date: String,
    pub amount_idr: i64,
    pub note: Option<String>,
    pub status: Option<String>,
    pub receipt_base64: Option<String>,
    pub receipt_mime_type: Option<String>,
    pub receipt_original_size_bytes: Option<i64>,
    pub receipt_compressed_size_bytes: Option<i64>,
    pub receipt_width: Option<u32>,
    pub receipt_height: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateRecordPayload {
    pub id: String,
    pub student_name: String,
    pub payment_date: String,
    pub amount_idr: i64,
    pub note: Option<String>,
    pub status: Option<String>,
    pub receipt_base64: Option<String>,
    pub receipt_mime_type: Option<String>,
    pub receipt_original_size_bytes: Option<i64>,
    pub receipt_compressed_size_bytes: Option<i64>,
    pub receipt_width: Option<u32>,
    pub receipt_height: Option<u32>,
    pub remove_receipt: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct BackupStudent {
    pub name: String,
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct BackupReceipt {
    pub id: String,
    pub mime_type: Option<String>,
    pub data_base64: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DatabaseBackup {
    pub version: String,
    pub schema_version: u32,
    pub app: String,
    pub exported_at: String,
    #[serde(default)]
    pub records: Vec<PaymentRecord>,
    #[serde(default)]
    pub students: Vec<BackupStudent>,
    #[serde(default)]
    pub receipts: Vec<BackupReceipt>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportResult {
    pub records_count: usize,
    pub students_count: usize,
    pub receipts_count: usize,
    pub mode: String,
}

