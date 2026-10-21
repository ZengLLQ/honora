pub mod commands;
pub mod db;
pub mod image_optimizer;
pub mod models;
pub mod storage;

use rusqlite::Connection;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Manager;

pub struct AppState {
    pub db: Mutex<Connection>,
    pub app_data_dir: PathBuf,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let app_data_dir = app
                .path()
                .app_data_dir()
                .unwrap_or_else(|_| PathBuf::from("./honora_data"));

            if !app_data_dir.exists() {
                fs::create_dir_all(&app_data_dir)
                    .expect("Failed to create application data directory");
            }

            // Seamless backward-compatible migration from legacy data directory if needed
            let db_path = app_data_dir.join("records.sqlite");
            if !db_path.exists() {
                if let Some(parent) = app_data_dir.parent() {
                    for legacy_name in ["com.tutor.paymentrecords", "com.honora.app"] {
                        let old_dir = parent.join(legacy_name);
                        let old_db = old_dir.join("records.sqlite");
                        if old_db.exists() {
                            let _ = fs::copy(&old_db, &db_path);
                            let old_receipts = old_dir.join("receipts");
                            let new_receipts = app_data_dir.join("receipts");
                            if old_receipts.exists() && !new_receipts.exists() {
                                let _ = fs::create_dir_all(&new_receipts);
                                if let Ok(entries) = fs::read_dir(&old_receipts) {
                                    for entry in entries.flatten() {
                                        let _ = fs::copy(entry.path(), new_receipts.join(entry.file_name()));
                                    }
                                }
                            }
                            break;
                        }
                    }
                }
            }

            let conn = Connection::open(&db_path).expect("Failed to open SQLite database");
            db::init_db(&conn).expect("Failed to initialize database schema");

            app.manage(AppState {
                db: Mutex::new(conn),
                app_data_dir,
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::optimize_receipt_image,
            commands::get_payment_records,
            commands::get_payment_summary,
            commands::get_payment_record,
            commands::get_receipt_data,
            commands::create_payment_record,
            commands::update_payment_record,
            commands::delete_payment_record,
            commands::toggle_payment_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
