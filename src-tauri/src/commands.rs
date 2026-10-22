use crate::db;
use crate::image_optimizer;
use crate::models::{
    BackupReceipt, CreateRecordPayload, DatabaseBackup, ExportResult, ImportResult,
    OptimizationResult, PaymentRecord, PaymentSummary, RecordFilter, UpdateRecordPayload,
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
    let mut receipt_mime = payload.receipt_mime_type.clone();
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

            // If the image was already optimized and metadata provided by client,
            // preserve the true original size and skip redundant lossy re-encoding!
            let (final_bytes, final_mime, final_orig, final_comp, final_w, final_h) =
                if let (Some(orig), Some(comp), Some(w), Some(h)) = (
                    payload.receipt_original_size_bytes,
                    payload.receipt_compressed_size_bytes,
                    payload.receipt_width,
                    payload.receipt_height,
                ) {
                    let m = receipt_mime
                        .clone()
                        .unwrap_or_else(|| "image/jpeg".to_string());
                    (raw_bytes, m, orig, comp, w, h)
                } else {
                    let opt = image_optimizer::optimize_image_bytes(&raw_bytes)
                        .map_err(|e| format!("Receipt optimization failed: {}", e))?;
                    let opt_bytes = BASE64
                        .decode(&opt.data_base64)
                        .map_err(|e| format!("Encoding error: {}", e))?;
                    (
                        opt_bytes,
                        opt.mime_type,
                        opt.original_size_bytes as i64,
                        opt.compressed_size_bytes as i64,
                        opt.width,
                        opt.height,
                    )
                };

            let ext = match final_mime.as_str() {
                "image/png" => "png",
                "image/webp" => "webp",
                _ => "jpg",
            };

            let path = storage::save_receipt_file(&state.app_data_dir, &record_id, ext, &final_bytes)
                .map_err(|e| format!("Failed to save receipt file: {}", e))?;

            receipt_storage_path = Some(path);
            receipt_mime = Some(final_mime);
            orig_size = Some(final_orig);
            comp_size = Some(final_comp);
            width = Some(final_w);
            height = Some(final_h);
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
        status: Some(
            match payload.status.as_deref().map(|s| s.trim().to_uppercase()) {
                Some(ref s) if s == "UNPAID" => "UNPAID".to_string(),
                _ => "PAID".to_string(),
            },
        ),
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

            let (final_bytes, final_mime, final_orig, final_comp, final_w, final_h) =
                if let (Some(orig), Some(comp), Some(w), Some(h)) = (
                    payload.receipt_original_size_bytes,
                    payload.receipt_compressed_size_bytes,
                    payload.receipt_width,
                    payload.receipt_height,
                ) {
                    let m = payload
                        .receipt_mime_type
                        .clone()
                        .unwrap_or_else(|| "image/jpeg".to_string());
                    (raw_bytes, m, orig, comp, w, h)
                } else {
                    let opt = image_optimizer::optimize_image_bytes(&raw_bytes)
                        .map_err(|e| format!("Receipt optimization failed: {}", e))?;
                    let opt_bytes = BASE64
                        .decode(&opt.data_base64)
                        .map_err(|e| format!("Encoding error: {}", e))?;
                    (
                        opt_bytes,
                        opt.mime_type,
                        opt.original_size_bytes as i64,
                        opt.compressed_size_bytes as i64,
                        opt.width,
                        opt.height,
                    )
                };

            let ext = match final_mime.as_str() {
                "image/png" => "png",
                "image/webp" => "webp",
                _ => "jpg",
            };

            let path = storage::save_receipt_file(&state.app_data_dir, &payload.id, ext, &final_bytes)
                .map_err(|e| format!("Failed to save receipt file: {}", e))?;

            receipt_storage_path = Some(path);
            receipt_mime = Some(final_mime);
            orig_size = Some(final_orig);
            comp_size = Some(final_comp);
            width = Some(final_w);
            height = Some(final_h);
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
        status: Some(
            match payload
                .status
                .as_deref()
                .or(existing.status.as_deref())
                .map(|s| s.trim().to_uppercase())
            {
                Some(ref s) if s == "UNPAID" => "UNPAID".to_string(),
                _ => "PAID".to_string(),
            },
        ),
        created_at: existing.created_at,
        updated_at: now,
    };

    db::update_record(&conn, &updated).map_err(|e| e.to_string())?;

    Ok(updated)
}

#[tauri::command]
pub fn toggle_payment_status(
    state: State<'_, AppState>,
    id: String,
) -> Result<PaymentRecord, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut record = db::get_record_by_id(&conn, &id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Payment record not found".to_string())?;

    let next_status = match record.status.as_deref().map(|s| s.trim().to_uppercase()).as_deref() {
        Some("UNPAID") => "PAID",
        _ => "UNPAID",
    };
    record.status = Some(next_status.to_string());
    record.updated_at = Utc::now().to_rfc3339();

    db::update_record(&conn, &record).map_err(|e| e.to_string())?;
    Ok(record)
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

#[tauri::command]
pub fn get_student_names(state: State<'_, AppState>) -> Result<Vec<String>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::get_student_names(&conn).map_err(|e| e.to_string())
}

pub fn process_export(
    conn: &rusqlite::Connection,
    app_data_dir: &std::path::Path,
) -> Result<DatabaseBackup, String> {
    let (records, students) = db::export_records_and_students(conn).map_err(|e| e.to_string())?;

    let mut receipts = Vec::new();
    let mut seen_receipt_ids = std::collections::HashSet::new();

    // 1. Export receipts referenced in records
    for record in &records {
        if let Some(ref path) = record.receipt_storage_path {
            if seen_receipt_ids.insert(path.clone()) {
                if let Ok(bytes) = storage::read_receipt_file(app_data_dir, path) {
                    receipts.push(BackupReceipt {
                        id: path.clone(),
                        mime_type: record.receipt_mime_type.clone(),
                        data_base64: BASE64.encode(bytes),
                    });
                }
            }
        }
    }

    // 2. Also export any additional receipts found in receipts directory
    if let Ok(receipts_dir) = storage::get_receipts_dir(app_data_dir) {
        if let Ok(entries) = std::fs::read_dir(receipts_dir) {
            for entry in entries.flatten() {
                let file_path = entry.path();
                if file_path.is_file() {
                    let file_name = entry.file_name().to_string_lossy().to_string();
                    let full_rel = format!("receipts/{}", file_name);
                    if !seen_receipt_ids.contains(&file_name) && !seen_receipt_ids.contains(&full_rel) {
                        seen_receipt_ids.insert(full_rel.clone());
                        if let Ok(bytes) = std::fs::read(&file_path) {
                            let mime = match file_path.extension().and_then(|s| s.to_str()).unwrap_or("") {
                                "png" => "image/png",
                                "webp" => "image/webp",
                                _ => "image/jpeg",
                            };
                            receipts.push(BackupReceipt {
                                id: full_rel,
                                mime_type: Some(mime.to_string()),
                                data_base64: BASE64.encode(bytes),
                            });
                        }
                    }
                }
            }
        }
    }

    Ok(DatabaseBackup {
        version: "1.2.0".to_string(),
        schema_version: 1,
        app: "Honora".to_string(),
        exported_at: Utc::now().to_rfc3339(),
        records,
        students,
        receipts,
    })
}

pub fn process_import(
    conn: &mut rusqlite::Connection,
    app_data_dir: &std::path::Path,
    backup: DatabaseBackup,
    mode: String,
) -> Result<ImportResult, String> {
    // Schema validation
    if backup.app.trim().to_lowercase() != "honora" {
        return Err("Invalid backup file: Not a valid Honora backup archive.".to_string());
    }

    if backup.schema_version != 1 {
        return Err("Invalid backup file: Unsupported schema version.".to_string());
    }

    let mode_clean = mode.trim().to_lowercase();
    if mode_clean != "merge" && mode_clean != "replace" {
        return Err("Invalid import mode: must be 'merge' or 'replace'.".to_string());
    }

    // Validate records
    for (idx, r) in backup.records.iter().enumerate() {
        if r.id.trim().is_empty() {
            return Err(format!("Invalid record at index {}: missing record ID.", idx));
        }
        if r.student_name.trim().is_empty() {
            return Err(format!("Invalid record at index {}: missing student name.", idx));
        }
        if r.payment_date.trim().is_empty() {
            return Err(format!("Invalid record at index {}: missing payment date.", idx));
        }
        if r.amount_idr < 0 {
            return Err(format!("Invalid record at index {}: amount must be non-negative.", idx));
        }
    }

    // Pre-decode all receipts to ensure zero corruption before any DB/disk mutation
    let mut decoded_receipts: Vec<(&str, Vec<u8>)> = Vec::with_capacity(backup.receipts.len());
    for (idx, r) in backup.receipts.iter().enumerate() {
        let clean_id = r.id.trim();
        if clean_id.is_empty() {
            return Err(format!("Invalid receipt at index {}: missing receipt ID.", idx));
        }

        // Clean data_base64: strip any data URL prefix and whitespace
        let raw_b64 = r.data_base64.trim();
        let stripped_b64 = if let Some(comma_pos) = raw_b64.find(',') {
            if raw_b64[..comma_pos].contains("base64") {
                &raw_b64[comma_pos + 1..]
            } else {
                raw_b64
            }
        } else {
            raw_b64
        };
        let sanitized_b64: String = stripped_b64.chars().filter(|c| !c.is_whitespace()).collect();

        let bytes = BASE64.decode(&sanitized_b64).map_err(|_| {
            format!("Invalid receipt at index {}: corrupted base64 data.", idx)
        })?;
        decoded_receipts.push((clean_id, bytes));
    }

    let receipts_dir = storage::get_receipts_dir(app_data_dir).map_err(|e| e.to_string())?;

    if mode_clean == "replace" {
        // Atomic staging for replace mode:
        // 1. Move current receipts directory to a temporary backup path
        let temp_backup_dir = app_data_dir.join(format!("receipts_backup_{}", uuid::Uuid::new_v4()));
        let had_existing_dir = receipts_dir.exists();
        if had_existing_dir {
            std::fs::rename(&receipts_dir, &temp_backup_dir)
                .map_err(|e| format!("Failed to stage receipts replacement: {}", e))?;
        }

        // 2. Create fresh receipts directory
        if let Err(e) = std::fs::create_dir_all(&receipts_dir) {
            if had_existing_dir {
                let _ = std::fs::rename(&temp_backup_dir, &receipts_dir);
            }
            return Err(format!("Failed to initialize receipts directory: {}", e));
        }

        // 3. Write all new receipts into the fresh receipts directory
        for (receipt_id, data) in &decoded_receipts {
            if let Err(e) = storage::save_backup_receipt(app_data_dir, receipt_id, data) {
                // Abort and restore previous receipts directory
                let _ = std::fs::remove_dir_all(&receipts_dir);
                if had_existing_dir {
                    let _ = std::fs::rename(&temp_backup_dir, &receipts_dir);
                }
                return Err(format!("Failed to save receipt file {}: {}", receipt_id, e));
            }
        }

        // 4. Commit database changes inside SQLite transaction
        if let Err(e) = db::import_database(conn, &backup.records, &backup.students, &mode_clean) {
            // Abort and restore previous receipts directory
            let _ = std::fs::remove_dir_all(&receipts_dir);
            if had_existing_dir {
                let _ = std::fs::rename(&temp_backup_dir, &receipts_dir);
            }
            return Err(format!("Database import failed: {}", e));
        }

        // 5. Success! Clean up the temporary backup directory
        if had_existing_dir {
            let _ = std::fs::remove_dir_all(&temp_backup_dir);
        }
    } else {
        // Merge mode:
        // 1. Write all receipts to disk first
        for (receipt_id, data) in &decoded_receipts {
            storage::save_backup_receipt(app_data_dir, receipt_id, data)
                .map_err(|e| format!("Failed to save receipt file: {}", e))?;
        }

        // 2. Commit database changes inside SQLite transaction
        db::import_database(conn, &backup.records, &backup.students, &mode_clean)
            .map_err(|e| format!("Database import failed: {}", e))?;
    }

    Ok(ImportResult {
        records_count: backup.records.len(),
        students_count: backup.students.len(),
        receipts_count: backup.receipts.len(),
        mode: mode_clean,
    })
}

pub fn write_backup_to_path(
    conn: &rusqlite::Connection,
    app_data_dir: &std::path::Path,
    target_path: &std::path::Path,
) -> Result<ExportResult, String> {
    let mut final_path = target_path.to_path_buf();
    if final_path.is_dir() {
        return Err("Export path must be a file, not a directory".to_string());
    }

    let has_json_ext = final_path
        .file_name()
        .and_then(|n| n.to_str())
        .map(|n| n.to_ascii_lowercase().ends_with(".json"))
        .unwrap_or(false);

    if !has_json_ext {
        let new_file_name = match final_path.file_name().and_then(|n| n.to_str()) {
            Some(name) => format!("{}.json", name),
            None => "honora-backup.json".to_string(),
        };
        final_path.set_file_name(new_file_name);
    }

    if let Some(parent) = final_path.parent() {
        if !parent.as_os_str().is_empty() && !parent.exists() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create destination directory: {}", e))?;
        }
    }

    let backup = process_export(conn, app_data_dir)?;
    let json_bytes = serde_json::to_vec_pretty(&backup)
        .map_err(|e| format!("Failed to serialize backup JSON: {}", e))?;

    std::fs::write(&final_path, json_bytes)
        .map_err(|e| format!("Failed to write backup file to disk: {}", e))?;

    Ok(ExportResult {
        success: true,
        cancelled: false,
        path: Some(final_path.to_string_lossy().to_string()),
        records_count: backup.records.len(),
        receipts_count: backup.receipts.len(),
    })
}

#[tauri::command]
pub fn export_database(state: State<'_, AppState>) -> Result<DatabaseBackup, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    process_export(&conn, &state.app_data_dir)
}

#[tauri::command]
pub fn export_database_to_path(
    state: State<'_, AppState>,
    path: String,
) -> Result<ExportResult, String> {
    let target = std::path::PathBuf::from(path.trim());
    if target.as_os_str().is_empty() {
        return Err("Export path cannot be empty".to_string());
    }
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    write_backup_to_path(&conn, &state.app_data_dir, &target)
}

#[tauri::command]
pub async fn export_database_with_dialog(
    state: State<'_, AppState>,
    default_filename: Option<String>,
) -> Result<ExportResult, String> {
    let mut filename = default_filename
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| {
            let now = chrono::Utc::now().format("%Y-%m-%d").to_string();
            format!("honora-backup-{}.json", now)
        });

    if !filename.to_ascii_lowercase().ends_with(".json") {
        filename = format!("{}.json", filename);
    }

    let chosen_path = tauri::async_runtime::spawn_blocking(move || {
        rfd::FileDialog::new()
            .set_file_name(&filename)
            .add_filter("JSON Backup (*.json)", &["json"])
            .save_file()
    })
    .await
    .map_err(|e| format!("Dialog thread error: {}", e))?;

    match chosen_path {
        Some(path) => {
            let conn = state.db.lock().map_err(|e| e.to_string())?;
            write_backup_to_path(&conn, &state.app_data_dir, &path)
        }
        None => Ok(ExportResult {
            success: false,
            cancelled: true,
            path: None,
            records_count: 0,
            receipts_count: 0,
        }),
    }
}

#[tauri::command]
pub fn import_database(
    state: State<'_, AppState>,
    backup: DatabaseBackup,
    mode: String,
) -> Result<ImportResult, String> {
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;
    process_import(&mut conn, &state.app_data_dir, backup, mode)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::BackupStudent;
    use rusqlite::Connection;
    use std::env;
    use std::fs;

    #[test]
    fn test_process_export_and_import_roundtrip() {
        let temp_dir = env::temp_dir().join(format!("tutor_cmd_test_{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&temp_dir).unwrap();

        let conn = Connection::open_in_memory().unwrap();
        db::init_db(&conn).unwrap();

        // 1. Create a record with a real receipt file
        let receipt_data = b"sample receipt test data";
        let rel_path = storage::save_receipt_file(&temp_dir, "rec-100", "jpg", receipt_data).unwrap();

        let rec = PaymentRecord {
            id: "rec-100".to_string(),
            student_name: "Tutor Student".to_string(),
            payment_date: "2026-10-22".to_string(),
            amount_idr: 750_000,
            receipt_storage_path: Some(rel_path.clone()),
            receipt_mime_type: Some("image/jpeg".to_string()),
            receipt_original_size_bytes: Some(100_000),
            receipt_compressed_size_bytes: Some(50_000),
            receipt_width: Some(1080),
            receipt_height: Some(1920),
            note: Some("October tuition".to_string()),
            status: Some("PAID".to_string()),
            created_at: "2026-10-22T08:00:00Z".to_string(),
            updated_at: "2026-10-22T08:00:00Z".to_string(),
        };
        db::create_record(&conn, &rec).unwrap();

        // 2. Export database
        let backup = process_export(&conn, &temp_dir).unwrap();
        assert_eq!(backup.app, "Honora");
        assert_eq!(backup.version, "1.2.0");
        assert_eq!(backup.schema_version, 1);
        assert_eq!(backup.records.len(), 1);
        assert_eq!(backup.records[0].student_name, "Tutor Student");
        assert_eq!(backup.receipts.len(), 1);
        assert_eq!(backup.receipts[0].id, rel_path);

        // 3. Clear existing database & storage, then restore in "replace" mode
        let mut target_conn = Connection::open_in_memory().unwrap();
        db::init_db(&target_conn).unwrap();
        let target_dir = env::temp_dir().join(format!("tutor_cmd_target_{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&target_dir).unwrap();

        let result = process_import(&mut target_conn, &target_dir, backup, "replace".to_string()).unwrap();
        assert_eq!(result.records_count, 1);
        assert_eq!(result.receipts_count, 1);
        assert_eq!(result.mode, "replace");

        // Verify restored record and receipt
        let restored_rec = db::get_record_by_id(&target_conn, "rec-100").unwrap().unwrap();
        assert_eq!(restored_rec.student_name, "Tutor Student");
        let restored_file = storage::read_receipt_file(&target_dir, &rel_path).unwrap();
        assert_eq!(restored_file, receipt_data);

        let _ = fs::remove_dir_all(&temp_dir);
        let _ = fs::remove_dir_all(&target_dir);
    }

    #[test]
    fn test_process_import_rejects_corrupted_data() {
        let temp_dir = env::temp_dir().join(format!("tutor_cmd_err_{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&temp_dir).unwrap();

        let mut conn = Connection::open_in_memory().unwrap();
        db::init_db(&conn).unwrap();

        // Invalid app name
        let mut invalid_backup = DatabaseBackup {
            version: "1.1.0".to_string(),
            schema_version: 1,
            app: "MaliciousApp".to_string(),
            exported_at: "2026-10-22T08:00:00Z".to_string(),
            records: vec![],
            students: vec![],
            receipts: vec![],
        };
        assert!(process_import(&mut conn, &temp_dir, invalid_backup.clone(), "replace".to_string()).is_err());

        // Invalid schema version
        invalid_backup.app = "Honora".to_string();
        invalid_backup.schema_version = 999;
        assert!(process_import(&mut conn, &temp_dir, invalid_backup.clone(), "replace".to_string()).is_err());

        // Corrupted base64 in receipt
        invalid_backup.schema_version = 1;
        invalid_backup.receipts.push(BackupReceipt {
            id: "corrupt.jpg".to_string(),
            mime_type: Some("image/jpeg".to_string()),
            data_base64: "NOT_VALID_BASE64!@#%^".to_string(),
        });
        assert!(process_import(&mut conn, &temp_dir, invalid_backup, "replace".to_string()).is_err());

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_process_import_web_receipt_bare_id_resolution() {
        // Simulates importing backup generated by Web target with bare receipt id "receipt_web_123"
        let temp_dir = env::temp_dir().join(format!("tutor_web_import_{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&temp_dir).unwrap();

        let mut conn = Connection::open_in_memory().unwrap();
        db::init_db(&conn).unwrap();

        let web_receipt_data = b"fake web png image bytes";
        let web_base64 = BASE64.encode(web_receipt_data);

        let web_backup = DatabaseBackup {
            version: "1.1.0".to_string(),
            schema_version: 1,
            app: "Honora".to_string(),
            exported_at: "2026-10-22T08:00:00Z".to_string(),
            records: vec![PaymentRecord {
                id: "web-rec-1".to_string(),
                student_name: "Web Student".to_string(),
                payment_date: "2026-10-20".to_string(),
                amount_idr: 600_000,
                receipt_storage_path: Some("receipt_web_123".to_string()),
                receipt_mime_type: Some("image/png".to_string()),
                receipt_original_size_bytes: Some(80_000),
                receipt_compressed_size_bytes: Some(30_000),
                receipt_width: Some(600),
                receipt_height: Some(800),
                note: None,
                status: Some("PAID".to_string()),
                created_at: "2026-10-20T00:00:00Z".to_string(),
                updated_at: "2026-10-20T00:00:00Z".to_string(),
            }],
            students: vec![BackupStudent {
                name: "Web Student".to_string(),
                created_at: Some("2026-10-20T00:00:00Z".to_string()),
            }],
            receipts: vec![BackupReceipt {
                id: "receipt_web_123".to_string(),
                mime_type: Some("image/png".to_string()),
                data_base64: web_base64,
            }],
        };

        let res = process_import(&mut conn, &temp_dir, web_backup, "merge".to_string()).unwrap();
        assert_eq!(res.records_count, 1);
        assert_eq!(res.receipts_count, 1);

        // Read receipt with bare id "receipt_web_123"
        let read_bytes = storage::read_receipt_file(&temp_dir, "receipt_web_123").unwrap();
        assert_eq!(read_bytes, web_receipt_data);

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_process_import_replace_rollback_on_failure() {
        let temp_dir = env::temp_dir().join(format!("tutor_rollback_{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&temp_dir).unwrap();

        let mut conn = Connection::open_in_memory().unwrap();
        db::init_db(&conn).unwrap();

        // 1. Existing initial receipt file
        let existing_receipt_data = b"precious existing receipt";
        storage::save_receipt_file(&temp_dir, "existing-rec", "jpg", existing_receipt_data).unwrap();

        // 2. Incoming backup with an invalid record that will fail validation or DB insertion
        let corrupt_backup = DatabaseBackup {
            version: "1.1.0".to_string(),
            schema_version: 1,
            app: "Honora".to_string(),
            exported_at: "2026-10-22T08:00:00Z".to_string(),
            records: vec![PaymentRecord {
                id: "".to_string(), // Invalid empty ID triggers error
                student_name: "Failed Student".to_string(),
                payment_date: "2026-10-22".to_string(),
                amount_idr: 100_000,
                receipt_storage_path: None,
                receipt_mime_type: None,
                receipt_original_size_bytes: None,
                receipt_compressed_size_bytes: None,
                receipt_width: None,
                receipt_height: None,
                note: None,
                status: None,
                created_at: "".to_string(),
                updated_at: "".to_string(),
            }],
            students: vec![],
            receipts: vec![],
        };

        // 3. Attempt import in "replace" mode - must fail
        let import_err = process_import(&mut conn, &temp_dir, corrupt_backup, "replace".to_string());
        assert!(import_err.is_err());

        // 4. Verify existing receipt file is NOT lost!
        let read_existing = storage::read_receipt_file(&temp_dir, "receipts/existing-rec.jpg");
        assert!(read_existing.is_ok());
        assert_eq!(read_existing.unwrap(), existing_receipt_data);

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_process_import_handles_data_url_scheme_and_newlines() {
        let temp_dir = env::temp_dir().join(format!("tutor_data_url_{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&temp_dir).unwrap();

        let mut conn = Connection::open_in_memory().unwrap();
        db::init_db(&conn).unwrap();

        let raw_data = b"receipt image binary content";
        let raw_base64 = BASE64.encode(raw_data);
        let formatted_base64 = format!("  data:image/jpeg;base64, {}\n\r ", raw_base64);

        let backup = DatabaseBackup {
            version: "1.1.0".to_string(),
            schema_version: 1,
            app: "Honora".to_string(),
            exported_at: "2026-10-22T08:00:00Z".to_string(),
            records: vec![PaymentRecord {
                id: "rec-url-scheme".to_string(),
                student_name: "Scheme Student".to_string(),
                payment_date: "2026-10-22".to_string(),
                amount_idr: 450_000,
                receipt_storage_path: Some("receipts/rec-url-scheme.jpg".to_string()),
                receipt_mime_type: Some("image/jpeg".to_string()),
                receipt_original_size_bytes: None,
                receipt_compressed_size_bytes: None,
                receipt_width: None,
                receipt_height: None,
                note: None,
                status: Some("PAID".to_string()),
                created_at: "2026-10-22T00:00:00Z".to_string(),
                updated_at: "2026-10-22T00:00:00Z".to_string(),
            }],
            students: vec![],
            receipts: vec![BackupReceipt {
                id: "receipts/rec-url-scheme.jpg".to_string(),
                mime_type: Some("image/jpeg".to_string()),
                data_base64: formatted_base64,
            }],
        };

        let res = process_import(&mut conn, &temp_dir, backup, "replace".to_string()).unwrap();
        assert_eq!(res.receipts_count, 1);

        let read_bytes = storage::read_receipt_file(&temp_dir, "receipts/rec-url-scheme.jpg").unwrap();
        assert_eq!(read_bytes, raw_data);

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_process_import_serde_tolerates_missing_optional_fields() {
        let json_str = r#"{
            "version": "1.1.0",
            "schema_version": 1,
            "app": "Honora",
            "exported_at": "2026-10-22T08:00:00Z",
            "records": [
                {
                    "id": "rec-serde-test",
                    "student_name": "Serde Student",
                    "payment_date": "2026-10-22",
                    "amount_idr": 350000
                }
            ]
        }"#;

        let backup: DatabaseBackup = serde_json::from_str(json_str).unwrap();
        assert_eq!(backup.records.len(), 1);
        assert_eq!(backup.records[0].created_at, "");
        assert_eq!(backup.records[0].updated_at, "");
        assert_eq!(backup.students.len(), 0);
        assert_eq!(backup.receipts.len(), 0);
    }

    #[test]
    fn test_write_backup_to_path_custom_location() {
        let temp_dir = env::temp_dir().join(format!("tutor_cmd_export_{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&temp_dir).unwrap();

        let conn = Connection::open_in_memory().unwrap();
        db::init_db(&conn).unwrap();

        let rec = PaymentRecord {
            id: "rec-custom-1".to_string(),
            student_name: "Custom Export Student".to_string(),
            payment_date: "2026-10-22".to_string(),
            amount_idr: 350_000,
            receipt_storage_path: None,
            receipt_mime_type: None,
            receipt_original_size_bytes: None,
            receipt_compressed_size_bytes: None,
            receipt_width: None,
            receipt_height: None,
            note: Some("Custom location export note".to_string()),
            status: Some("PAID".to_string()),
            created_at: "2026-10-22T08:00:00Z".to_string(),
            updated_at: "2026-10-22T08:00:00Z".to_string(),
        };
        db::create_record(&conn, &rec).unwrap();

        // 1. Export to custom nested subfolder without .json extension (should auto-append .json)
        let subfolder = temp_dir.join("sub").join("nested");
        let target_without_ext = subfolder.join("my-custom-backup");
        let result = write_backup_to_path(&conn, &temp_dir, &target_without_ext).unwrap();

        assert!(result.success);
        assert!(!result.cancelled);
        assert_eq!(result.records_count, 1);
        let expected_path = target_without_ext.with_extension("json");
        assert_eq!(result.path, Some(expected_path.to_string_lossy().to_string()));
        assert!(expected_path.exists());

        // 2. Read and verify written file content
        let content = fs::read_to_string(&expected_path).unwrap();
        let parsed: DatabaseBackup = serde_json::from_str(&content).unwrap();
        assert_eq!(parsed.app, "Honora");
        assert_eq!(parsed.version, "1.2.0");
        assert_eq!(parsed.records.len(), 1);
        assert_eq!(parsed.records[0].student_name, "Custom Export Student");

        // 3. Roundtrip import test with the exported file
        let mut target_conn = Connection::open_in_memory().unwrap();
        db::init_db(&target_conn).unwrap();
        let target_storage = temp_dir.join("import_storage");
        fs::create_dir_all(&target_storage).unwrap();

        let import_res = process_import(&mut target_conn, &target_storage, parsed, "replace".to_string()).unwrap();
        assert_eq!(import_res.records_count, 1);
        let imported_rec = db::get_record_by_id(&target_conn, "rec-custom-1").unwrap().unwrap();
        assert_eq!(imported_rec.student_name, "Custom Export Student");

        // 4. Edge-case test: dotted filename like "backup-2026.10.22" must preserve dots and become "backup-2026.10.22.json"
        let dotted_target = subfolder.join("backup-2026.10.22");
        let dotted_result = write_backup_to_path(&conn, &temp_dir, &dotted_target).unwrap();
        assert!(dotted_result.success);
        let expected_dotted_path = subfolder.join("backup-2026.10.22.json");
        assert_eq!(dotted_result.path, Some(expected_dotted_path.to_string_lossy().to_string()));
        assert!(expected_dotted_path.exists());

        // 5. Edge-case test: existing .JSON uppercase extension should not be duplicated
        let upper_target = subfolder.join("backup-upper.JSON");
        let upper_result = write_backup_to_path(&conn, &temp_dir, &upper_target).unwrap();
        assert!(upper_result.success);
        assert_eq!(upper_result.path, Some(upper_target.to_string_lossy().to_string()));
        assert!(upper_target.exists());

        // 6. Edge-case test: specifying an existing directory path must fail gracefully
        let dir_err = write_backup_to_path(&conn, &temp_dir, &subfolder);
        assert!(dir_err.is_err());
        assert!(dir_err.unwrap_err().contains("must be a file, not a directory"));

        let _ = fs::remove_dir_all(&temp_dir);
    }
}

