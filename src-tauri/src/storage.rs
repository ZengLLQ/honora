use std::fs;
use std::path::{Path, PathBuf};

pub fn get_receipts_dir(base_dir: &Path) -> Result<PathBuf, std::io::Error> {
    let dir = base_dir.join("receipts");
    if !dir.exists() {
        fs::create_dir_all(&dir)?;
    }
    Ok(dir)
}

pub fn save_receipt_file(
    base_dir: &Path,
    record_id: &str,
    extension: &str,
    data: &[u8],
) -> Result<String, std::io::Error> {
    let receipts_dir = get_receipts_dir(base_dir)?;
    let safe_ext = match extension.trim_start_matches('.').to_lowercase().as_str() {
        "png" => "png",
        "webp" => "webp",
        _ => "jpg",
    };
    let file_name = format!("{}.{}", record_id, safe_ext);
    let target_path = receipts_dir.join(&file_name);
    fs::write(&target_path, data)?;
    Ok(format!("receipts/{}", file_name))
}

pub fn read_receipt_file(base_dir: &Path, rel_path: &str) -> Result<Vec<u8>, std::io::Error> {
    // Sanitize relative path to prevent path traversal
    let clean_path = rel_path.trim_start_matches('/').trim_start_matches('\\');
    if clean_path.contains("..") {
        return Err(std::io::Error::new(
            std::io::ErrorKind::PermissionDenied,
            "Invalid path",
        ));
    }
    let target_path = base_dir.join(clean_path);
    if target_path.exists() && target_path.is_file() {
        return fs::read(target_path);
    }
    if let Ok(receipts_dir) = get_receipts_dir(base_dir) {
        let in_receipts = receipts_dir.join(clean_path);
        if in_receipts.exists() && in_receipts.is_file() {
            return fs::read(in_receipts);
        }
    }
    fs::read(target_path)
}

pub fn delete_receipt_file(base_dir: &Path, rel_path: &str) -> Result<(), std::io::Error> {
    let clean_path = rel_path.trim_start_matches('/').trim_start_matches('\\');
    if clean_path.contains("..") {
        return Err(std::io::Error::new(
            std::io::ErrorKind::PermissionDenied,
            "Invalid path",
        ));
    }
    let target_path = base_dir.join(clean_path);
    let mut deleted = false;
    if target_path.exists() && target_path.is_file() {
        fs::remove_file(&target_path)?;
        deleted = true;
    }
    if let Ok(receipts_dir) = get_receipts_dir(base_dir) {
        let in_receipts = receipts_dir.join(clean_path);
        if in_receipts.exists() && in_receipts.is_file() {
            fs::remove_file(in_receipts)?;
            deleted = true;
        }
    }
    let _ = deleted;
    Ok(())
}

pub fn save_backup_receipt(
    base_dir: &Path,
    receipt_path: &str,
    data: &[u8],
) -> Result<String, std::io::Error> {
    let clean_path = receipt_path.trim_start_matches('/').trim_start_matches('\\');
    if clean_path.contains("..") {
        return Err(std::io::Error::new(
            std::io::ErrorKind::PermissionDenied,
            "Invalid path",
        ));
    }

    let target_path = if clean_path.starts_with("receipts/") || clean_path.starts_with("receipts\\") {
        base_dir.join(clean_path)
    } else {
        let receipts_dir = get_receipts_dir(base_dir)?;
        receipts_dir.join(clean_path)
    };

    if let Some(parent) = target_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)?;
        }
    }

    fs::write(&target_path, data)?;
    Ok(clean_path.to_string())
}

pub fn clear_all_receipts(base_dir: &Path) -> Result<(), std::io::Error> {
    let receipts_dir = get_receipts_dir(base_dir)?;
    if receipts_dir.exists() {
        if let Ok(entries) = fs::read_dir(&receipts_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() {
                    let _ = fs::remove_file(path);
                }
            }
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    #[test]
    fn test_receipt_storage_lifecycle() {
        let temp_dir = env::temp_dir().join(format!("tutor_test_{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&temp_dir).unwrap();

        let dummy_data = b"optimized receipt content";
        let rel_path = save_receipt_file(&temp_dir, "test-rec-1", "jpg", dummy_data).unwrap();
        assert_eq!(rel_path, "receipts/test-rec-1.jpg");

        let read_data = read_receipt_file(&temp_dir, &rel_path).unwrap();
        assert_eq!(read_data, dummy_data);

        delete_receipt_file(&temp_dir, &rel_path).unwrap();
        assert!(read_receipt_file(&temp_dir, &rel_path).is_err());

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_backup_receipt_save_and_cross_path_resolution() {
        let temp_dir = env::temp_dir().join(format!("tutor_test_bk_{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&temp_dir).unwrap();

        // 1. Save with "receipts/" prefix (standard desktop path)
        let dummy_1 = b"desktop receipt bytes";
        save_backup_receipt(&temp_dir, "receipts/rec-desktop.jpg", dummy_1).unwrap();
        let read_1 = read_receipt_file(&temp_dir, "receipts/rec-desktop.jpg").unwrap();
        assert_eq!(read_1, dummy_1);

        // 2. Save with bare identifier without "receipts/" prefix (standard web path)
        let dummy_2 = b"web receipt bytes";
        save_backup_receipt(&temp_dir, "receipt_web_rec_99", dummy_2).unwrap();
        // Read with bare id
        let read_2 = read_receipt_file(&temp_dir, "receipt_web_rec_99").unwrap();
        assert_eq!(read_2, dummy_2);

        // 3. Clear all receipts
        clear_all_receipts(&temp_dir).unwrap();
        assert!(read_receipt_file(&temp_dir, "receipts/rec-desktop.jpg").is_err());
        assert!(read_receipt_file(&temp_dir, "receipt_web_rec_99").is_err());

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_path_traversal_prevention() {
        let temp_dir = env::temp_dir().join(format!("tutor_test_sec_{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&temp_dir).unwrap();

        assert!(read_receipt_file(&temp_dir, "../secret.txt").is_err());
        assert!(save_backup_receipt(&temp_dir, "../../../evil.txt", b"hack").is_err());
        assert!(delete_receipt_file(&temp_dir, "../../etc/passwd").is_err());

        let _ = fs::remove_dir_all(&temp_dir);
    }
}

