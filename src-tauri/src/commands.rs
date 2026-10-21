use crate::db;
use crate::image_optimizer;
use crate::models::{
    CreateRecordPayload, OptimizationResult, PaymentRecord, PaymentSummary, RecordFilter,
    UpdateRecordPayload,
};
use crate::storage;
use crate::AppState;
use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use chrono::Utc;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub fn optimize_receipt_image(bytes_base64: String) -> Result<OptimizationResult, String> {
    let raw_bytes = BASE64
        .decode(&bytes_base64)
        .map_err(|e| format!("Invalid base64 payload: {}", e))?;

    image_optimizer::optimize_image_bytes(&raw_bytes).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_payment_records(
    state: State<'_, AppState>,
    filter: Option<RecordFilter>,
) -> Result<Vec<PaymentRecord>, String> {
    let filter = filter.unwrap_or_default();
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::get_records(&conn, &filter).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_payment_summary(
    state: State<'_, AppState>,
    filter: Option<RecordFilter>,
) -> Result<PaymentSummary, String> {
    let filter = filter.unwrap_or_default();
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::get_summary(&conn, &filter).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_payment_record(
    state: State<'_, AppState>,
    id: String,
) -> Result<Option<PaymentRecord>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::get_record_by_id(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_receipt_data(
    state: State<'_, AppState>,
    storage_path: String,
) -> Result<String, String> {
    let data = storage::read_receipt_file(&state.app_data_dir, &storage_path)
        .map_err(|e| format!("Could not read receipt: {}", e))?;
    Ok(BASE64.encode(data))
}

#[tauri::command]
pub fn create_payment_record(
    state: State<'_, AppState>,
    payload: CreateRecordPayload,
) -> Result<PaymentRecord, String> {
    let student_name = payload.student_name.trim().to_string();
    if student_name.is_empty() {
        return Err("Student name is required".to_string());
    }

    let payment_date = payload.payment_date.trim().to_string();
    if payment_date.is_empty() {
        return Err("Transfer date is required".to_string());
    }

    if payload.amount_idr <= 0 {
        return Err("Amount must be a positive integer in IDR".to_string());
    }

    let record_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    let mut receipt_storage_path = None;
    let mut receipt_mime = payload.receipt_mime_type;
    let mut orig_size = payload.receipt_original_size_bytes;
    let mut comp_size = payload.receipt_compressed_size_bytes;
    let mut width = payload.receipt_width;
    let mut height = payload.receipt_height;

    // Handle receipt saving
    if let Some(ref base64_data) = payload.receipt_base64 {
        if !base64_data.trim().is_empty() {
            let raw_bytes = BASE64
                .decode(base64_data)
                .map_err(|e| format!("Invalid receipt image data: {}", e))?;

            // Always run optimization to ensure limits and compression
            let opt = image_optimizer::optimize_image_bytes(&raw_bytes)
                .map_err(|e| format!("Receipt optimization failed: {}", e))?;

            let opt_bytes = BASE64
                .decode(&opt.data_base64)
                .map_err(|e| format!("Encoding error: {}", e))?;

            let ext = match opt.mime_type.as_str() {
                "image/png" => "png",
                "image/webp" => "webp",
                _ => "jpg",
            };

            let path = storage::save_receipt_file(&state.app_data_dir, &record_id, ext, &opt_bytes)
                .map_err(|e| format!("Failed to save receipt file: {}", e))?;

            receipt_storage_path = Some(path);
            receipt_mime = Some(opt.mime_type);
            orig_size = Some(opt.original_size_bytes as i64);
            comp_size = Some(opt.compressed_size_bytes as i64);
            width = Some(opt.width);
            height = Some(opt.height);
        }
    }

    let record = PaymentRecord {
        id: record_id,
        student_name,
        payment_date,
        amount_idr: payload.amount_idr,
        receipt_storage_path,
        receipt_mime_type: receipt_mime,
        receipt_original_size_bytes: orig_size,
        receipt_compressed_size_bytes: comp_size,
        receipt_width: width,
        receipt_height: height,
        note: payload.note.map(|n| n.trim().to_string()).filter(|n| !n.is_empty()),
        created_at: now.clone(),
        updated_at: now,
    };

    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::create_record(&conn, &record).map_err(|e| e.to_string())?;

    Ok(record)
}

#[tauri::command]
pub fn update_payment_record(
    state: State<'_, AppState>,
    payload: UpdateRecordPayload,
) -> Result<PaymentRecord, String> {
    let student_name = payload.student_name.trim().to_string();
    if student_name.is_empty() {
        return Err("Student name is required".to_string());
    }

    let payment_date = payload.payment_date.trim().to_string();
    if payment_date.is_empty() {
        return Err("Transfer date is required".to_string());
    }

    if payload.amount_idr <= 0 {
        return Err("Amount must be a positive integer in IDR".to_string());
    }

    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let existing = db::get_record_by_id(&conn, &payload.id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Payment record not found".to_string())?;

    let now = Utc::now().to_rfc3339();

    let mut receipt_storage_path = existing.receipt_storage_path;
    let mut receipt_mime = existing.receipt_mime_type;
    let mut orig_size = existing.receipt_original_size_bytes;
    let mut comp_size = existing.receipt_compressed_size_bytes;
    let mut width = existing.receipt_width;
    let mut height = existing.receipt_height;

    if payload.remove_receipt.unwrap_or(false) {
        if let Some(ref path) = receipt_storage_path {
            let _ = storage::delete_receipt_file(&state.app_data_dir, path);
        }
        receipt_storage_path = None;
        receipt_mime = None;
        orig_size = None;
        comp_size = None;
        width = None;
        height = None;
    } else if let Some(ref base64_data) = payload.receipt_base64 {
        if !base64_data.trim().is_empty() {
            // Delete old receipt if existed
            if let Some(ref path) = receipt_storage_path {
                let _ = storage::delete_receipt_file(&state.app_data_dir, path);
            }

            let raw_bytes = BASE64
                .decode(base64_data)
                .map_err(|e| format!("Invalid receipt image data: {}", e))?;

            let opt = image_optimizer::optimize_image_bytes(&raw_bytes)
                .map_err(|e| format!("Receipt optimization failed: {}", e))?;

            let opt_bytes = BASE64
                .decode(&opt.data_base64)
                .map_err(|e| format!("Encoding error: {}", e))?;

            let ext = match opt.mime_type.as_str() {
                "image/png" => "png",
                "image/webp" => "webp",
                _ => "jpg",
            };

            let path = storage::save_receipt_file(&state.app_data_dir, &payload.id, ext, &opt_bytes)
                .map_err(|e| format!("Failed to save receipt file: {}", e))?;

            receipt_storage_path = Some(path);
            receipt_mime = Some(opt.mime_type);
            orig_size = Some(opt.original_size_bytes as i64);
            comp_size = Some(opt.compressed_size_bytes as i64);
            width = Some(opt.width);
            height = Some(opt.height);
        }
    }

    let updated = PaymentRecord {
        id: payload.id,
        student_name,
        payment_date,
        amount_idr: payload.amount_idr,
        receipt_storage_path,
        receipt_mime_type: receipt_mime,
        receipt_original_size_bytes: orig_size,
        receipt_compressed_size_bytes: comp_size,
        receipt_width: width,
        receipt_height: height,
        note: payload.note.map(|n| n.trim().to_string()).filter(|n| !n.is_empty()),
        created_at: existing.created_at,
        updated_at: now,
    };

    db::update_record(&conn, &updated).map_err(|e| e.to_string())?;

    Ok(updated)
}

#[tauri::command]
pub fn delete_payment_record(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let existing = db::get_record_by_id(&conn, &id).map_err(|e| e.to_string())?;

    if let Some(record) = existing {
        if let Some(ref path) = record.receipt_storage_path {
            let _ = storage::delete_receipt_file(&state.app_data_dir, path);
        }
        db::delete_record(&conn, &id).map_err(|e| e.to_string())?;
    }

    Ok(())
}
