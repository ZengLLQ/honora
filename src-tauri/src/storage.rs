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
    if target_path.exists() {
        fs::remove_file(target_path)?;
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
}
