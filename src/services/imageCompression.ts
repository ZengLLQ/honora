import type { OptimizationResult } from '../types/payment';

const MAX_INPUT_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const MAX_DIMENSION_WIDTH = 2000;
const MAX_DIMENSION_HEIGHT = 3000;
const JPEG_QUALITY = 0.85;

export type SupportedMime = 'image/jpeg' | 'image/png' | 'image/webp';

/**
 * Validates file magic bytes to verify JPEG, PNG, or WebP.
 */
export async function detectMimeFromBytes(file: File | Blob): Promise<SupportedMime> {
  const buffer = await file.slice(0, 16).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (bytes.length < 12) {
    throw new Error('File is too small to be a valid image.');
  }

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png';
  }

  // WebP: RIFF ... WEBP
  const riff = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  const webp = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
  if (riff === 'RIFF' && webp === 'WEBP') {
    return 'image/webp';
  }

  throw new Error('Unsupported image format. Please select a JPEG, PNG, or WebP file.');
}

/**
 * Calculates resize dimensions preserving aspect ratio without upscaling.
 */
export function calculateResizeDimensions(
  origW: number,
  origH: number
): { width: number; height: number; needsResize: boolean } {
  if (origW <= 0 || origH <= 0) {
    return { width: origW, height: origH, needsResize: false };
  }

  if (origW <= MAX_DIMENSION_WIDTH && origH <= MAX_DIMENSION_HEIGHT) {
    return { width: origW, height: origH, needsResize: false };
  }

  const ratioW = MAX_DIMENSION_WIDTH / origW;
  const ratioH = MAX_DIMENSION_HEIGHT / origH;
  const scale = Math.min(ratioW, ratioH);

  return {
    width: Math.max(1, Math.round(origW * scale)),
    height: Math.max(1, Math.round(origH * scale)),
    needsResize: true,
  };
}

/**
 * Reads a File/Blob to base64 string without data URI prefix.
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read image data.'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Browser image compression pipeline.
 */
export async function optimizeReceiptInBrowser(file: File): Promise<OptimizationResult> {
  if (file.size > MAX_INPUT_FILE_SIZE) {
    throw new Error('File exceeds maximum allowed size of 20 MB.');
  }

  const mime = await detectMimeFromBytes(file);
  const originalSize = file.size;

  let origW = 0;
  let origH = 0;
  let sourceImage: ImageBitmap | HTMLImageElement;

  if (typeof createImageBitmap === 'function') {
    try {
      sourceImage = await createImageBitmap(file, { imageOrientation: 'from-image' });
      origW = sourceImage.width;
      origH = sourceImage.height;
    } catch {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Corrupted or unreadable image file.'));
        img.src = objectUrl;
      });
      URL.revokeObjectURL(objectUrl);
      origW = img.naturalWidth || img.width;
      origH = img.naturalHeight || img.height;
      sourceImage = img;
    }
  } else {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Corrupted or unreadable image file.'));
      img.src = objectUrl;
    });
    URL.revokeObjectURL(objectUrl);
    origW = img.naturalWidth || img.width;
    origH = img.naturalHeight || img.height;
    sourceImage = img;
  }

  if (origW === 0 || origH === 0) {
    if ('close' in sourceImage && typeof sourceImage.close === 'function') {
      sourceImage.close();
    }
    throw new Error('Image has invalid dimensions.');
  }

  const { width: targetW, height: targetH, needsResize } = calculateResizeDimensions(origW, origH);

  // Render to Canvas with high quality image smoothing
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    if ('close' in sourceImage && typeof sourceImage.close === 'function') {
      sourceImage.close();
    }
    throw new Error('Could not initialize canvas context for image processing.');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(sourceImage, 0, 0, targetW, targetH);
  if ('close' in sourceImage && typeof sourceImage.close === 'function') {
    sourceImage.close();
  }

  // Determine output format and quality
  let outputFormat: string = mime;
  let quality: number | undefined = undefined;

  if (mime === 'image/jpeg') {
    outputFormat = 'image/jpeg';
    quality = JPEG_QUALITY;
  } else if (mime === 'image/webp') {
    outputFormat = 'image/webp';
    quality = 0.85;
  } else {
    outputFormat = 'image/png';
    quality = undefined;
  }

  let compressedBlob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), outputFormat, quality);
  });

  // Fallback to JPEG if browser canvas cannot encode WebP
  if (!compressedBlob && outputFormat === 'image/webp') {
    outputFormat = 'image/jpeg';
    quality = JPEG_QUALITY;
    compressedBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), outputFormat, quality);
    });
  }

  if (!compressedBlob) {
    throw new Error('Failed to compress image.');
  }

  // Compare sizes: if compressed blob is bigger than original and original didn't need resize, keep original
  let finalBlob: Blob = compressedBlob;
  let finalMime = outputFormat;

  if (compressedBlob.size >= originalSize && !needsResize) {
    finalBlob = file;
    finalMime = mime;
  }

  const compressedSize = finalBlob.size;
  const base64Data = await blobToBase64(finalBlob);

  const savingsPct =
    originalSize > 0 && compressedSize < originalSize
      ? ((originalSize - compressedSize) / originalSize) * 100
      : 0;

  return {
    mime_type: finalMime,
    original_size_bytes: originalSize,
    compressed_size_bytes: compressedSize,
    width: targetW,
    height: targetH,
    data_base64: base64Data,
    savings_percentage: Math.round(savingsPct * 10) / 10,
  };
}
