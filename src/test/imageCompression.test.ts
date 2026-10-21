import { describe, it, expect } from 'vitest';
import {
  calculateResizeDimensions,
  detectMimeFromBytes,
} from '../services/imageCompression';

describe('imageCompression utilities', () => {
  describe('detectMimeFromBytes', () => {
    it('detects JPEG header bytes', async () => {
      const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
      const blob = new Blob([jpegBytes]);
      const mime = await detectMimeFromBytes(blob);
      expect(mime).toBe('image/jpeg');
    });

    it('detects PNG header bytes', async () => {
      const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
      const blob = new Blob([pngBytes]);
      const mime = await detectMimeFromBytes(blob);
      expect(mime).toBe('image/png');
    });

    it('detects WebP header bytes', async () => {
      // "RIFF" + 4 bytes + "WEBP"
      const webpBytes = new Uint8Array([
        0x52, 0x49, 0x46, 0x46,
        0x00, 0x00, 0x00, 0x00,
        0x57, 0x45, 0x42, 0x50,
      ]);
      const blob = new Blob([webpBytes]);
      const mime = await detectMimeFromBytes(blob);
      expect(mime).toBe('image/webp');
    });

    it('rejects unsupported files like PDF or text', async () => {
      const textBlob = new Blob(['Not an image file at all!']);
      await expect(detectMimeFromBytes(textBlob)).rejects.toThrow('Unsupported image format');
    });

    it('rejects truncated tiny files', async () => {
      const tinyBlob = new Blob([new Uint8Array([0x01, 0x02])]);
      await expect(detectMimeFromBytes(tinyBlob)).rejects.toThrow('File is too small');
    });
  });

  describe('calculateResizeDimensions', () => {
    it('does not upscale small images', () => {
      const result = calculateResizeDimensions(800, 600);
      expect(result).toEqual({ width: 800, height: 600, needsResize: false });
    });

    it('correctly downscales portrait images exceeding max bounds', () => {
      // 4000 x 6000 exceeds 2000 x 3000
      const result = calculateResizeDimensions(4000, 6000);
      expect(result.needsResize).toBe(true);
      expect(result.width).toBeLessThanOrEqual(2000);
      expect(result.height).toBeLessThanOrEqual(3000);
      // Aspect ratio should be 2:3
      expect(result.width).toBe(2000);
      expect(result.height).toBe(3000);
    });

    it('correctly downscales landscape images exceeding width', () => {
      const result = calculateResizeDimensions(4000, 2000);
      expect(result.needsResize).toBe(true);
      expect(result.width).toBe(2000);
      expect(result.height).toBe(1000);
    });
  });
});
