use crate::models::OptimizationResult;
use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use image::imageops::FilterType;
use image::{DynamicImage, GenericImageView, ImageEncoder, ImageFormat};
use thiserror::Error;

const MAX_INPUT_FILE_SIZE: usize = 20 * 1024 * 1024; // 20 MB
const MAX_DIMENSION_WIDTH: u32 = 2000;
const MAX_DIMENSION_HEIGHT: u32 = 3000;
const JPEG_QUALITY: u8 = 85;

#[derive(Error, Debug)]
pub enum ImageProcessingError {
    #[error("File exceeds maximum allowed size of 20 MB")]
    FileTooLarge,
    #[error("Unsupported image format. Please upload JPEG, PNG, or WebP")]
    UnsupportedFormat,
    #[error("Corrupted or invalid image data: {0}")]
    CorruptedData(String),
    #[error("Image encoding failed: {0}")]
    EncodingFailed(String),
}

#[derive(Debug, PartialEq, Clone, Copy)]
pub enum SupportedFormat {
    Jpeg,
    Png,
    WebP,
}

impl SupportedFormat {
    pub fn mime_type(&self) -> &'static str {
        match self {
            SupportedFormat::Jpeg => "image/jpeg",
            SupportedFormat::Png => "image/png",
            SupportedFormat::WebP => "image/webp",
        }
    }
}

pub fn detect_format(bytes: &[u8]) -> Result<SupportedFormat, ImageProcessingError> {
    if bytes.len() < 12 {
        return Err(ImageProcessingError::UnsupportedFormat);
    }

    // JPEG magic bytes: FF D8 FF
    if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
        return Ok(SupportedFormat::Jpeg);
    }

    // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
    if bytes.starts_with(&[0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A]) {
        return Ok(SupportedFormat::Png);
    }

    // WebP magic bytes: RIFF .... WEBP
    if bytes.starts_with(b"RIFF") && &bytes[8..12] == b"WEBP" {
        return Ok(SupportedFormat::WebP);
    }

    Err(ImageProcessingError::UnsupportedFormat)
}

pub fn calculate_resize_dimensions(orig_w: u32, orig_h: u32) -> (u32, u32) {
    if orig_w == 0 || orig_h == 0 {
        return (orig_w, orig_h);
    }

    // Never upscale
    if orig_w <= MAX_DIMENSION_WIDTH && orig_h <= MAX_DIMENSION_HEIGHT {
        return (orig_w, orig_h);
    }

    let ratio_w = MAX_DIMENSION_WIDTH as f64 / orig_w as f64;
    let ratio_h = MAX_DIMENSION_HEIGHT as f64 / orig_h as f64;
    let scale = ratio_w.min(ratio_h);

    let new_w = ((orig_w as f64 * scale).round() as u32).max(1);
    let new_h = ((orig_h as f64 * scale).round() as u32).max(1);

    (new_w, new_h)
}

pub fn optimize_image_bytes(raw_bytes: &[u8]) -> Result<OptimizationResult, ImageProcessingError> {
    let original_size = raw_bytes.len();
    if original_size > MAX_INPUT_FILE_SIZE {
        return Err(ImageProcessingError::FileTooLarge);
    }

    let detected_format = detect_format(raw_bytes)?;

    // Safely load and decode image
    let image_format = match detected_format {
        SupportedFormat::Jpeg => ImageFormat::Jpeg,
        SupportedFormat::Png => ImageFormat::Png,
        SupportedFormat::WebP => ImageFormat::WebP,
    };

    let img = image::load_from_memory_with_format(raw_bytes, image_format)
        .map_err(|e| ImageProcessingError::CorruptedData(e.to_string()))?;

    let (orig_w, orig_h) = img.dimensions();
    let (target_w, target_h) = calculate_resize_dimensions(orig_w, orig_h);

    let processed_img: DynamicImage = if target_w != orig_w || target_h != orig_h {
        img.resize(target_w, target_h, FilterType::Lanczos3)
    } else {
        img
    };

    let (final_w, final_h) = processed_img.dimensions();

    // Encode to appropriate format
    let mut compressed_bytes = Vec::new();

    match detected_format {
        SupportedFormat::Jpeg => {
            let rgb_img = processed_img.to_rgb8();
            let encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(
                &mut compressed_bytes,
                JPEG_QUALITY,
            );
            encoder
                .write_image(
                    rgb_img.as_raw(),
                    final_w,
                    final_h,
                    image::ExtendedColorType::Rgb8,
                )
                .map_err(|e| ImageProcessingError::EncodingFailed(e.to_string()))?;
        }
        SupportedFormat::Png => {
            // For PNG, try lossless PNG encoding
            let rgba_img = processed_img.to_rgba8();
            let encoder = image::codecs::png::PngEncoder::new(&mut compressed_bytes);
            encoder
                .write_image(
                    rgba_img.as_raw(),
                    final_w,
                    final_h,
                    image::ExtendedColorType::Rgba8,
                )
                .map_err(|e| ImageProcessingError::EncodingFailed(e.to_string()))?;
        }
        SupportedFormat::WebP => {
            // Encode as WebP
            let rgba_img = processed_img.to_rgba8();
            let encoder = image::codecs::webp::WebPEncoder::new_lossless(&mut compressed_bytes);
            encoder
                .write_image(
                    rgba_img.as_raw(),
                    final_w,
                    final_h,
                    image::ExtendedColorType::Rgba8,
                )
                .map_err(|e| ImageProcessingError::EncodingFailed(e.to_string()))?;
        }
    }

    // If compressed output is larger than original and original dimensions didn't need resize,
    // keep original bytes
    let (final_bytes, final_size) = if compressed_bytes.len() >= original_size
        && orig_w <= MAX_DIMENSION_WIDTH
        && orig_h <= MAX_DIMENSION_HEIGHT
    {
        (raw_bytes.to_vec(), original_size)
    } else {
        let size = compressed_bytes.len();
        (compressed_bytes, size)
    };

    let savings_pct = if original_size > 0 && final_size < original_size {
        ((original_size - final_size) as f64 / original_size as f64) * 100.0
    } else {
        0.0
    };

    let base64_str = BASE64.encode(&final_bytes);

    Ok(OptimizationResult {
        mime_type: detected_format.mime_type().to_string(),
        original_size_bytes: original_size,
        compressed_size_bytes: final_size,
        width: final_w,
        height: final_h,
        data_base64: base64_str,
        savings_percentage: (savings_pct * 10.0).round() / 10.0,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_format() {
        let jpeg_header = [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01];
        assert_eq!(detect_format(&jpeg_header).unwrap(), SupportedFormat::Jpeg);

        let png_header = [0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D];
        assert_eq!(detect_format(&png_header).unwrap(), SupportedFormat::Png);

        let webp_header = b"RIFF\x00\x00\x00\x00WEBPVP8 \x00\x00\x00\x00";
        assert_eq!(detect_format(webp_header).unwrap(), SupportedFormat::WebP);

        let bad_header = [0x00, 0x01, 0x02, 0x03];
        assert!(detect_format(&bad_header).is_err());
    }

    #[test]
    fn test_calculate_resize_dimensions_no_upscale() {
        let (w, h) = calculate_resize_dimensions(800, 600);
        assert_eq!(w, 800);
        assert_eq!(h, 600);
    }

    #[test]
    fn test_calculate_resize_dimensions_downscale() {
        let (w, h) = calculate_resize_dimensions(4000, 6000);
        assert!(w <= MAX_DIMENSION_WIDTH);
        assert!(h <= MAX_DIMENSION_HEIGHT);
        // Ratio should be 1:1.5
        assert_eq!(w, 2000);
        assert_eq!(h, 3000);
    }

    #[test]
    fn test_file_too_large() {
        let fake_large = vec![0u8; MAX_INPUT_FILE_SIZE + 1];
        let result = optimize_image_bytes(&fake_large);
        assert!(matches!(result, Err(ImageProcessingError::FileTooLarge)));
    }

    #[test]
    fn test_optimize_real_jpeg_image() {
        use image::{ImageBuffer, Rgb};
        // Create a 100x100 synthetic JPEG image
        let img: ImageBuffer<Rgb<u8>, Vec<u8>> = ImageBuffer::from_fn(100, 100, |x, y| {
            Rgb([(x % 256) as u8, (y % 256) as u8, 128])
        });

        let mut jpeg_bytes = Vec::new();
        let encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut jpeg_bytes, 95);
        encoder
            .write_image(img.as_raw(), 100, 100, image::ExtendedColorType::Rgb8)
            .unwrap();

        let result = optimize_image_bytes(&jpeg_bytes).unwrap();
        assert_eq!(result.mime_type, "image/jpeg");
        assert_eq!(result.width, 100);
        assert_eq!(result.height, 100);
        assert!(result.compressed_size_bytes > 0);
        assert!(!result.data_base64.is_empty());
    }

    #[test]
    fn test_optimize_real_png_image() {
        use image::{ImageBuffer, Rgba};
        // Create a 200x200 synthetic PNG screenshot image with text-like sharp contrast
        let img: ImageBuffer<Rgba<u8>, Vec<u8>> = ImageBuffer::from_fn(200, 200, |x, y| {
            if (x + y) % 20 < 10 {
                Rgba([16, 17, 22, 255])
            } else {
                Rgba([241, 237, 226, 255])
            }
        });

        let mut png_bytes = Vec::new();
        let encoder = image::codecs::png::PngEncoder::new(&mut png_bytes);
        encoder
            .write_image(img.as_raw(), 200, 200, image::ExtendedColorType::Rgba8)
            .unwrap();

        let result = optimize_image_bytes(&png_bytes).unwrap();
        assert_eq!(result.mime_type, "image/png");
        assert_eq!(result.width, 200);
        assert_eq!(result.height, 200);
        assert!(result.compressed_size_bytes > 0);
    }

    #[test]
    fn test_optimize_large_image_resizing() {
        use image::{ImageBuffer, Rgb};
        // Create a 2500x3500 image which exceeds max bounds 2000x3000
        let img: ImageBuffer<Rgb<u8>, Vec<u8>> = ImageBuffer::from_fn(2500, 3500, |_x, _y| {
            Rgb([200, 200, 200])
        });

        let mut jpeg_bytes = Vec::new();
        let encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut jpeg_bytes, 80);
        encoder
            .write_image(img.as_raw(), 2500, 3500, image::ExtendedColorType::Rgb8)
            .unwrap();

        let result = optimize_image_bytes(&jpeg_bytes).unwrap();
        assert!(result.width <= MAX_DIMENSION_WIDTH);
        assert!(result.height <= MAX_DIMENSION_HEIGHT);
        // Scaled proportionally: 2500 -> ~1786, 3500 -> 2500 or 2000 x 2800
        assert_eq!(result.height, 2800);
        assert_eq!(result.width, 2000);
    }

    #[test]
    fn test_corrupted_image_handling() {
        // Valid JPEG header but broken body
        let corrupted_jpeg = vec![0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
        let result = optimize_image_bytes(&corrupted_jpeg);
        assert!(matches!(result, Err(ImageProcessingError::CorruptedData(_))));
    }

    #[test]
    fn test_reject_non_image() {
        let pdf_data = b"%PDF-1.4 header text data not an image";
        let result = optimize_image_bytes(pdf_data);
        assert!(matches!(result, Err(ImageProcessingError::UnsupportedFormat)));
    }
}
