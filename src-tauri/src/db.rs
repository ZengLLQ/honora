use crate::models::{PaymentRecord, PaymentSummary, RecordFilter};
use rusqlite::{params, Connection, OptionalExtension, Result};

pub fn init_db(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS payment_records (
            id TEXT PRIMARY KEY,
            student_name TEXT NOT NULL,
            payment_date TEXT NOT NULL,
            amount_idr INTEGER NOT NULL,
            receipt_storage_path TEXT,
            receipt_mime_type TEXT,
            receipt_original_size_bytes INTEGER,
            receipt_compressed_size_bytes INTEGER,
            receipt_width INTEGER,
            receipt_height INTEGER,
            note TEXT,
            status TEXT NOT NULL DEFAULT 'PAID',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_payment_records_student ON payment_records(student_name);
        CREATE INDEX IF NOT EXISTS idx_payment_records_date ON payment_records(payment_date);

        CREATE TABLE IF NOT EXISTS students (
            name TEXT PRIMARY KEY COLLATE NOCASE,
            created_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_students_name ON students(name);
        ",
    )?;

    // Populate students table with distinct names from existing payment_records if any
    conn.execute(
        "INSERT OR IGNORE INTO students (name, created_at)
         SELECT TRIM(student_name), MIN(created_at)
         FROM payment_records
         WHERE TRIM(student_name) != ''
         GROUP BY TRIM(student_name)",
        [],
    )?;

    // Migration for existing tables: check if status column exists, if not add it
    let has_status: bool = {
        let mut stmt = conn.prepare("PRAGMA table_info(payment_records)")?;
        let col_names = stmt.query_map([], |row| row.get::<_, String>(1))?;
        let mut found = false;
        for name in col_names {
            if name? == "status" {
                found = true;
                break;
            }
        }
        found
    };

    if !has_status {
        conn.execute(
            "ALTER TABLE payment_records ADD COLUMN status TEXT NOT NULL DEFAULT 'PAID'",
            [],
        )?;
    }

    // Ensure no NULL or invalid blank status strings exist
    conn.execute(
        "UPDATE payment_records SET status = 'PAID' WHERE status IS NULL OR TRIM(status) = ''",
        [],
    )?;

    // Create index on status column once guaranteed to exist
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_payment_records_status ON payment_records(status)",
        [],
    )?;

    Ok(())
}

pub fn create_record(conn: &Connection, record: &PaymentRecord) -> Result<()> {
    let name_trimmed = record.student_name.trim();
    if !name_trimmed.is_empty() {
        let _ = conn.execute(
            "INSERT OR IGNORE INTO students (name, created_at) VALUES (?1, ?2)",
            params![name_trimmed, record.created_at],
        );
    }

    let status_val = match record.status.as_deref().map(|s| s.trim().to_uppercase()) {
        Some(ref s) if s == "UNPAID" => "UNPAID",
        _ => "PAID",
    };
    conn.execute(
        "
        INSERT INTO payment_records (
            id, student_name, payment_date, amount_idr,
            receipt_storage_path, receipt_mime_type,
            receipt_original_size_bytes, receipt_compressed_size_bytes,
            receipt_width, receipt_height, note, status, created_at, updated_at
        ) VALUES (
            ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14
        )
        ",
        params![
            record.id,
            record.student_name.trim(),
            record.payment_date,
            record.amount_idr,
            record.receipt_storage_path,
            record.receipt_mime_type,
            record.receipt_original_size_bytes,
            record.receipt_compressed_size_bytes,
            record.receipt_width,
            record.receipt_height,
            record.note,
            status_val,
            record.created_at,
            record.updated_at,
        ],
    )?;
    Ok(())
}

pub fn update_record(conn: &Connection, record: &PaymentRecord) -> Result<()> {
    let name_trimmed = record.student_name.trim();
    if !name_trimmed.is_empty() {
        let _ = conn.execute(
            "INSERT OR IGNORE INTO students (name, created_at) VALUES (?1, ?2)",
            params![name_trimmed, record.updated_at],
        );
    }

    let status_val = match record.status.as_deref().map(|s| s.trim().to_uppercase()) {
        Some(ref s) if s == "UNPAID" => "UNPAID",
        _ => "PAID",
    };
    conn.execute(
        "
        UPDATE payment_records SET
            student_name = ?1,
            payment_date = ?2,
            amount_idr = ?3,
            receipt_storage_path = ?4,
            receipt_mime_type = ?5,
            receipt_original_size_bytes = ?6,
            receipt_compressed_size_bytes = ?7,
            receipt_width = ?8,
            receipt_height = ?9,
            note = ?10,
            status = ?11,
            updated_at = ?12
        WHERE id = ?13
        ",
        params![
            record.student_name.trim(),
            record.payment_date,
            record.amount_idr,
            record.receipt_storage_path,
            record.receipt_mime_type,
            record.receipt_original_size_bytes,
            record.receipt_compressed_size_bytes,
            record.receipt_width,
            record.receipt_height,
            record.note,
            status_val,
            record.updated_at,
            record.id,
        ],
    )?;
    Ok(())
}

pub fn get_record_by_id(conn: &Connection, id: &str) -> Result<Option<PaymentRecord>> {
    let mut stmt = conn.prepare(
        "
        SELECT
            id, student_name, payment_date, amount_idr,
            receipt_storage_path, receipt_mime_type,
            receipt_original_size_bytes, receipt_compressed_size_bytes,
            receipt_width, receipt_height, note, status, created_at, updated_at
        FROM payment_records
        WHERE id = ?1
        ",
    )?;

    let record = stmt
        .query_row(params![id], |row| {
            Ok(PaymentRecord {
                id: row.get(0)?,
                student_name: row.get(1)?,
                payment_date: row.get(2)?,
                amount_idr: row.get(3)?,
                receipt_storage_path: row.get(4)?,
                receipt_mime_type: row.get(5)?,
                receipt_original_size_bytes: row.get(6)?,
                receipt_compressed_size_bytes: row.get(7)?,
                receipt_width: row.get(8)?,
                receipt_height: row.get(9)?,
                note: row.get(10)?,
                status: row.get(11)?,
                created_at: row.get(12)?,
                updated_at: row.get(13)?,
            })
        })
        .optional()?;

    Ok(record)
}

pub fn delete_record(conn: &Connection, id: &str) -> Result<()> {
    conn.execute("DELETE FROM payment_records WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn get_student_names(conn: &Connection) -> Result<Vec<String>> {
    let mut names = Vec::new();
    let mut seen = std::collections::HashSet::new();

    let mut stmt = conn.prepare(
        "SELECT name FROM students WHERE TRIM(name) != '' ORDER BY name COLLATE NOCASE ASC",
    )?;
    let rows = stmt.query_map([], |row| row.get::<_, String>(0))?;
    for r in rows {
        let name = r?;
        let trimmed = name.trim().to_string();
        if !trimmed.is_empty() && seen.insert(trimmed.to_lowercase()) {
            names.push(trimmed);
        }
    }

    let mut rec_stmt = conn.prepare(
        "SELECT DISTINCT TRIM(student_name) FROM payment_records WHERE TRIM(student_name) != '' ORDER BY student_name COLLATE NOCASE ASC",
    )?;
    let rec_rows = rec_stmt.query_map([], |row| row.get::<_, String>(0))?;
    for r in rec_rows {
        let name = r?;
        let trimmed = name.trim().to_string();
        if !trimmed.is_empty() && seen.insert(trimmed.to_lowercase()) {
            let _ = conn.execute(
                "INSERT OR IGNORE INTO students (name, created_at) VALUES (?1, datetime('now'))",
                params![trimmed],
            );
            names.push(trimmed);
        }
    }

    names.sort_by(|a, b| a.to_lowercase().cmp(&b.to_lowercase()));
    Ok(names)
}

pub fn get_records(conn: &Connection, filter: &RecordFilter) -> Result<Vec<PaymentRecord>> {
    let mut query = String::from(
        "
        SELECT
            id, student_name, payment_date, amount_idr,
            receipt_storage_path, receipt_mime_type,
            receipt_original_size_bytes, receipt_compressed_size_bytes,
            receipt_width, receipt_height, note, status, created_at, updated_at
        FROM payment_records
        WHERE 1=1
        ",
    );

    let mut sql_params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(ref search) = filter.search {
        let trimmed = search.trim();
        if !trimmed.is_empty() {
            query.push_str(" AND student_name LIKE ?");
            sql_params.push(Box::new(format!("%{}%", trimmed)));
        }
    }

    if let Some(ref month) = filter.month {
        let trimmed = month.trim();
        if !trimmed.is_empty() {
            query.push_str(" AND payment_date LIKE ?");
            sql_params.push(Box::new(format!("{}%", trimmed)));
        }
    }

    if let Some(ref from_date) = filter.from_date {
        let trimmed = from_date.trim();
        if !trimmed.is_empty() {
            query.push_str(" AND payment_date >= ?");
            sql_params.push(Box::new(trimmed.to_string()));
        }
    }

    if let Some(ref to_date) = filter.to_date {
        let trimmed = to_date.trim();
        if !trimmed.is_empty() {
            query.push_str(" AND payment_date <= ?");
            sql_params.push(Box::new(trimmed.to_string()));
        }
    }

    if let Some(ref status) = filter.status {
        let trimmed = status.trim().to_uppercase();
        if !trimmed.is_empty() {
            query.push_str(" AND UPPER(status) = ?");
            sql_params.push(Box::new(trimmed));
        }
    }

    query.push_str(" ORDER BY payment_date DESC, created_at DESC");

    let mut stmt = conn.prepare(&query)?;
    let param_refs: Vec<&dyn rusqlite::ToSql> = sql_params.iter().map(|b| b.as_ref()).collect();

    let rows = stmt.query_map(param_refs.as_slice(), |row| {
        Ok(PaymentRecord {
            id: row.get(0)?,
            student_name: row.get(1)?,
            payment_date: row.get(2)?,
            amount_idr: row.get(3)?,
            receipt_storage_path: row.get(4)?,
            receipt_mime_type: row.get(5)?,
            receipt_original_size_bytes: row.get(6)?,
            receipt_compressed_size_bytes: row.get(7)?,
            receipt_width: row.get(8)?,
            receipt_height: row.get(9)?,
            note: row.get(10)?,
            status: row.get(11)?,
            created_at: row.get(12)?,
            updated_at: row.get(13)?,
        })
    })?;

    let mut list = Vec::new();
    for item in rows {
        list.push(item?);
    }
    Ok(list)
}

pub fn get_summary(conn: &Connection, filter: &RecordFilter) -> Result<PaymentSummary> {
    // Total unfiltered
    let (total_amount, total_count): (Option<i64>, usize) = conn.query_row(
        "SELECT SUM(amount_idr), COUNT(*) FROM payment_records",
        [],
        |row| Ok((row.get(0)?, row.get(1)?)),
    )?;

    // Filtered
    let mut query = String::from("SELECT SUM(amount_idr), COUNT(*) FROM payment_records WHERE 1=1");
    let mut sql_params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(ref search) = filter.search {
        let trimmed = search.trim();
        if !trimmed.is_empty() {
            query.push_str(" AND student_name LIKE ?");
            sql_params.push(Box::new(format!("%{}%", trimmed)));
        }
    }

    if let Some(ref month) = filter.month {
        let trimmed = month.trim();
        if !trimmed.is_empty() {
            query.push_str(" AND payment_date LIKE ?");
            sql_params.push(Box::new(format!("{}%", trimmed)));
        }
    }

    if let Some(ref from_date) = filter.from_date {
        let trimmed = from_date.trim();
        if !trimmed.is_empty() {
            query.push_str(" AND payment_date >= ?");
            sql_params.push(Box::new(trimmed.to_string()));
        }
    }

    if let Some(ref to_date) = filter.to_date {
        let trimmed = to_date.trim();
        if !trimmed.is_empty() {
            query.push_str(" AND payment_date <= ?");
            sql_params.push(Box::new(trimmed.to_string()));
        }
    }

    if let Some(ref status) = filter.status {
        let trimmed = status.trim().to_uppercase();
        if !trimmed.is_empty() {
            query.push_str(" AND UPPER(status) = ?");
            sql_params.push(Box::new(trimmed));
        }
    }

    let mut stmt = conn.prepare(&query)?;
    let param_refs: Vec<&dyn rusqlite::ToSql> = sql_params.iter().map(|b| b.as_ref()).collect();

    let (filtered_amount, filtered_count): (Option<i64>, usize) =
        stmt.query_row(param_refs.as_slice(), |row| {
            Ok((row.get(0)?, row.get(1)?))
        })?;

    Ok(PaymentSummary {
        total_amount_idr: total_amount.unwrap_or(0),
        total_records: total_count,
        filtered_amount_idr: filtered_amount.unwrap_or(0),
        filtered_records: filtered_count,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn setup_test_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        init_db(&conn).unwrap();
        conn
    }

    #[test]
    fn test_crud_and_summary() {
        let conn = setup_test_db();

        let record1 = PaymentRecord {
            id: "rec-1".to_string(),
            student_name: "Budi Santoso".to_string(),
            payment_date: "2026-10-15".to_string(),
            amount_idr: 1_250_000,
            receipt_storage_path: Some("receipts/rec-1.jpg".to_string()),
            receipt_mime_type: Some("image/jpeg".to_string()),
            receipt_original_size_bytes: Some(1_500_000),
            receipt_compressed_size_bytes: Some(400_000),
            receipt_width: Some(1200),
            receipt_height: Some(1600),
            note: Some("Math tutoring".to_string()),
            status: Some("PAID".to_string()),
            created_at: "2026-10-15T10:00:00Z".to_string(),
            updated_at: "2026-10-15T10:00:00Z".to_string(),
        };

        create_record(&conn, &record1).unwrap();

        let fetched = get_record_by_id(&conn, "rec-1").unwrap().unwrap();
        assert_eq!(fetched.student_name, "Budi Santoso");
        assert_eq!(fetched.amount_idr, 1_250_000);
        assert_eq!(fetched.status.as_deref(), Some("PAID"));

        // Add second record in different month
        let record2 = PaymentRecord {
            id: "rec-2".to_string(),
            student_name: "Siti Rahma".to_string(),
            payment_date: "2026-09-20".to_string(),
            amount_idr: 750_000,
            receipt_storage_path: None,
            receipt_mime_type: None,
            receipt_original_size_bytes: None,
            receipt_compressed_size_bytes: None,
            receipt_width: None,
            receipt_height: None,
            note: None,
            status: Some("UNPAID".to_string()),
            created_at: "2026-09-20T08:00:00Z".to_string(),
            updated_at: "2026-09-20T08:00:00Z".to_string(),
        };
        create_record(&conn, &record2).unwrap();

        // Check total summary
        let summary_all = get_summary(&conn, &RecordFilter::default()).unwrap();
        assert_eq!(summary_all.total_amount_idr, 2_000_000);
        assert_eq!(summary_all.total_records, 2);
        assert_eq!(summary_all.filtered_amount_idr, 2_000_000);
        assert_eq!(summary_all.filtered_records, 2);

        // Filter by month
        let filter_oct = RecordFilter {
            month: Some("2026-10".to_string()),
            ..Default::default()
        };
        let summary_oct = get_summary(&conn, &filter_oct).unwrap();
        assert_eq!(summary_oct.total_amount_idr, 2_000_000);
        assert_eq!(summary_oct.filtered_amount_idr, 1_250_000);
        assert_eq!(summary_oct.filtered_records, 1);

        // Filter by search name
        let filter_name = RecordFilter {
            search: Some("siti".to_string()),
            ..Default::default()
        };
        let records = get_records(&conn, &filter_name).unwrap();
        assert_eq!(records.len(), 1);
        assert_eq!(records[0].id, "rec-2");
        assert_eq!(records[0].status.as_deref(), Some("UNPAID"));

        // Update record
        let mut updated_rec = record1.clone();
        updated_rec.amount_idr = 1_500_000;
        updated_rec.status = Some("UNPAID".to_string());
        update_record(&conn, &updated_rec).unwrap();
        let fetched_updated = get_record_by_id(&conn, "rec-1").unwrap().unwrap();
        assert_eq!(fetched_updated.amount_idr, 1_500_000);
        assert_eq!(fetched_updated.status.as_deref(), Some("UNPAID"));

        // Delete record
        delete_record(&conn, "rec-2").unwrap();
        let remaining = get_records(&conn, &RecordFilter::default()).unwrap();
        assert_eq!(remaining.len(), 1);
    }

    #[test]
    fn test_date_range_and_case_insensitive_search() {
        let conn = setup_test_db();

        let r1 = PaymentRecord {
            id: "1".to_string(),
            student_name: "ALEXANDER WIJAYA".to_string(),
            payment_date: "2026-10-01".to_string(),
            amount_idr: 500_000,
            receipt_storage_path: None,
            receipt_mime_type: None,
            receipt_original_size_bytes: None,
            receipt_compressed_size_bytes: None,
            receipt_width: None,
            receipt_height: None,
            note: None,
            status: Some("PAID".to_string()),
            created_at: "2026-10-01T10:00:00Z".to_string(),
            updated_at: "2026-10-01T10:00:00Z".to_string(),
        };

        let r2 = PaymentRecord {
            id: "2".to_string(),
            student_name: "Alexander Pratama".to_string(),
            payment_date: "2026-10-15".to_string(),
            amount_idr: 800_000,
            receipt_storage_path: None,
            receipt_mime_type: None,
            receipt_original_size_bytes: None,
            receipt_compressed_size_bytes: None,
            receipt_width: None,
            receipt_height: None,
            note: None,
            status: Some("PAID".to_string()),
            created_at: "2026-10-15T10:00:00Z".to_string(),
            updated_at: "2026-10-15T10:00:00Z".to_string(),
        };

        let r3 = PaymentRecord {
            id: "3".to_string(),
            student_name: "Dewi Lestari".to_string(),
            payment_date: "2026-10-31".to_string(),
            amount_idr: 1_200_000,
            receipt_storage_path: None,
            receipt_mime_type: None,
            receipt_original_size_bytes: None,
            receipt_compressed_size_bytes: None,
            receipt_width: None,
            receipt_height: None,
            note: None,
            status: Some("UNPAID".to_string()),
            created_at: "2026-10-31T10:00:00Z".to_string(),
            updated_at: "2026-10-31T10:00:00Z".to_string(),
        };

        create_record(&conn, &r1).unwrap();
        create_record(&conn, &r2).unwrap();
        create_record(&conn, &r3).unwrap();

        // Case-insensitive search: "alex"
        let filter_alex = RecordFilter {
            search: Some("alex".to_string()),
            ..Default::default()
        };
        let res = get_records(&conn, &filter_alex).unwrap();
        assert_eq!(res.len(), 2);

        // Date range: 2026-10-05 to 2026-10-20
        let filter_range = RecordFilter {
            from_date: Some("2026-10-05".to_string()),
            to_date: Some("2026-10-20".to_string()),
            ..Default::default()
        };
        let res_range = get_records(&conn, &filter_range).unwrap();
        assert_eq!(res_range.len(), 1);
        assert_eq!(res_range[0].id, "2");

        let sum_range = get_summary(&conn, &filter_range).unwrap();
        assert_eq!(sum_range.total_amount_idr, 2_500_000);
        assert_eq!(sum_range.filtered_amount_idr, 800_000);
        assert_eq!(sum_range.filtered_records, 1);
    }

    #[test]
    fn test_status_filtering_and_migration() {
        let conn = Connection::open_in_memory().unwrap();

        // Create legacy schema without status column
        conn.execute_batch(
            "
            CREATE TABLE payment_records (
                id TEXT PRIMARY KEY,
                student_name TEXT NOT NULL,
                payment_date TEXT NOT NULL,
                amount_idr INTEGER NOT NULL,
                receipt_storage_path TEXT,
                receipt_mime_type TEXT,
                receipt_original_size_bytes INTEGER,
                receipt_compressed_size_bytes INTEGER,
                receipt_width INTEGER,
                receipt_height INTEGER,
                note TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            INSERT INTO payment_records VALUES (
                'legacy-1', 'Legacy Student', '2026-10-10', 500000,
                NULL, NULL, NULL, NULL, NULL, NULL, 'Legacy note',
                '2026-10-10T10:00:00Z', '2026-10-10T10:00:00Z'
            );
            ",
        )
        .unwrap();

        // Run init_db which should idempotently migrate table and add status column defaulting to 'PAID'
        init_db(&conn).unwrap();

        let legacy_rec = get_record_by_id(&conn, "legacy-1").unwrap().unwrap();
        assert_eq!(legacy_rec.status.as_deref(), Some("PAID"));

        // Insert UNPAID record
        let unpaid = PaymentRecord {
            id: "rec-unpaid".to_string(),
            student_name: "Unpaid Student".to_string(),
            payment_date: "2026-10-11".to_string(),
            amount_idr: 600_000,
            receipt_storage_path: None,
            receipt_mime_type: None,
            receipt_original_size_bytes: None,
            receipt_compressed_size_bytes: None,
            receipt_width: None,
            receipt_height: None,
            note: None,
            status: Some("UNPAID".to_string()),
            created_at: "2026-10-11T10:00:00Z".to_string(),
            updated_at: "2026-10-11T10:00:00Z".to_string(),
        };
        create_record(&conn, &unpaid).unwrap();

        // Filter by PAID
        let filter_paid = RecordFilter {
            status: Some("PAID".to_string()),
            ..Default::default()
        };
        let paid_records = get_records(&conn, &filter_paid).unwrap();
        assert_eq!(paid_records.len(), 1);
        assert_eq!(paid_records[0].id, "legacy-1");

        // Filter by UNPAID
        let filter_unpaid = RecordFilter {
            status: Some("UNPAID".to_string()),
            ..Default::default()
        };
        let unpaid_records = get_records(&conn, &filter_unpaid).unwrap();
        assert_eq!(unpaid_records.len(), 1);
        assert_eq!(unpaid_records[0].id, "rec-unpaid");

        let sum_unpaid = get_summary(&conn, &filter_unpaid).unwrap();
        assert_eq!(sum_unpaid.filtered_amount_idr, 600_000);
        assert_eq!(sum_unpaid.filtered_records, 1);
        assert_eq!(sum_unpaid.total_amount_idr, 1_100_000);
        assert_eq!(sum_unpaid.total_records, 2);

        // Case-insensitive status query: "unpaid"
        let filter_unpaid_lower = RecordFilter {
            status: Some("unpaid".to_string()),
            ..Default::default()
        };
        let unpaid_lower = get_records(&conn, &filter_unpaid_lower).unwrap();
        assert_eq!(unpaid_lower.len(), 1);
        assert_eq!(unpaid_lower[0].id, "rec-unpaid");

        // Normalization of unknown status string to "PAID"
        let unknown = PaymentRecord {
            id: "rec-unknown".to_string(),
            student_name: "Unknown Status".to_string(),
            payment_date: "2026-10-12".to_string(),
            amount_idr: 300_000,
            receipt_storage_path: None,
            receipt_mime_type: None,
            receipt_original_size_bytes: None,
            receipt_compressed_size_bytes: None,
            receipt_width: None,
            receipt_height: None,
            note: None,
            status: Some("pending_custom".to_string()),
            created_at: "2026-10-12T10:00:00Z".to_string(),
            updated_at: "2026-10-12T10:00:00Z".to_string(),
        };
        create_record(&conn, &unknown).unwrap();
        let fetched_unknown = get_record_by_id(&conn, "rec-unknown").unwrap().unwrap();
        assert_eq!(fetched_unknown.status.as_deref(), Some("PAID"));
    }

    #[test]
    fn test_student_names_tracking_and_derivation() {
        let conn = Connection::open_in_memory().unwrap();
        init_db(&conn).unwrap();

        // 1. Initially empty
        let initial_names = get_student_names(&conn).unwrap();
        assert!(initial_names.is_empty());

        // 2. Add first record for Alice Smith
        let rec1 = PaymentRecord {
            id: "rec-1".to_string(),
            student_name: "Alice Smith".to_string(),
            payment_date: "2026-10-01".to_string(),
            amount_idr: 500_000,
            receipt_storage_path: None,
            receipt_mime_type: None,
            receipt_original_size_bytes: None,
            receipt_compressed_size_bytes: None,
            receipt_width: None,
            receipt_height: None,
            note: None,
            status: Some("PAID".to_string()),
            created_at: "2026-10-01T10:00:00Z".to_string(),
            updated_at: "2026-10-01T10:00:00Z".to_string(),
        };
        create_record(&conn, &rec1).unwrap();

        // 3. Add second record with same student (case/whitespace variant)
        let rec2 = PaymentRecord {
            id: "rec-2".to_string(),
            student_name: "  alice smith  ".to_string(),
            payment_date: "2026-10-02".to_string(),
            amount_idr: 600_000,
            receipt_storage_path: None,
            receipt_mime_type: None,
            receipt_original_size_bytes: None,
            receipt_compressed_size_bytes: None,
            receipt_width: None,
            receipt_height: None,
            note: None,
            status: Some("PAID".to_string()),
            created_at: "2026-10-02T10:00:00Z".to_string(),
            updated_at: "2026-10-02T10:00:00Z".to_string(),
        };
        create_record(&conn, &rec2).unwrap();

        // 4. Add third record for Bob Dylan
        let rec3 = PaymentRecord {
            id: "rec-3".to_string(),
            student_name: "Bob Dylan".to_string(),
            payment_date: "2026-10-03".to_string(),
            amount_idr: 700_000,
            receipt_storage_path: None,
            receipt_mime_type: None,
            receipt_original_size_bytes: None,
            receipt_compressed_size_bytes: None,
            receipt_width: None,
            receipt_height: None,
            note: None,
            status: Some("PAID".to_string()),
            created_at: "2026-10-03T10:00:00Z".to_string(),
            updated_at: "2026-10-03T10:00:00Z".to_string(),
        };
        create_record(&conn, &rec3).unwrap();

        let names = get_student_names(&conn).unwrap();
        assert_eq!(names.len(), 2);
        assert_eq!(names[0], "Alice Smith");
        assert_eq!(names[1], "Bob Dylan");

        // 5. Deleting a payment record does not erase student from students list
        delete_record(&conn, "rec-3").unwrap();
        let names_after_delete = get_student_names(&conn).unwrap();
        assert_eq!(names_after_delete.len(), 2);
        assert!(names_after_delete.contains(&"Bob Dylan".to_string()));

        // 6. Test migration/population from existing records without students table
        let conn2 = Connection::open_in_memory().unwrap();
        conn2.execute_batch("
            CREATE TABLE payment_records (
                id TEXT PRIMARY KEY,
                student_name TEXT NOT NULL,
                payment_date TEXT NOT NULL,
                amount_idr INTEGER NOT NULL,
                receipt_storage_path TEXT,
                receipt_mime_type TEXT,
                receipt_original_size_bytes INTEGER,
                receipt_compressed_size_bytes INTEGER,
                receipt_width INTEGER,
                receipt_height INTEGER,
                note TEXT,
                status TEXT NOT NULL DEFAULT 'PAID',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            INSERT INTO payment_records (id, student_name, payment_date, amount_idr, created_at, updated_at)
            VALUES ('leg-1', 'Legacy Student', '2026-09-01', 300000, '2026-09-01T00:00:00Z', '2026-09-01T00:00:00Z');
        ").unwrap();

        init_db(&conn2).unwrap();
        let legacy_names = get_student_names(&conn2).unwrap();
        assert_eq!(legacy_names, vec!["Legacy Student"]);
    }
}
