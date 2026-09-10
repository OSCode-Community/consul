import heicConvert from 'heic-convert';
import sharp from 'sharp';

const WEBP_QUALITY = 85;

export interface ProcessedImage {
  data: Buffer;
  width: number;
  height: number;
}

/**
 * Convert an HEIC/HEIF buffer (iPhone photos) to JPEG so the rest of the
 * pipeline can process it reliably, regardless of the sharp build's codecs.
 * Mirrors oscode-be's `convertHeicToJpeg`.
 */
export async function convertHeicToJpeg(buffer: Buffer): Promise<Buffer> {
  const out = await heicConvert({ buffer, format: 'JPEG', quality: 0.9 });
  return Buffer.from(out);
}

/**
 * Return dimensions for an existing WebP without re-encoding it. This is used
 * by direct uploads so a WebP supplied by the user remains byte-for-byte
 * unchanged.
 */
export async function inspectWebp(buffer: Buffer): Promise<ProcessedImage | null> {
  const metadata = await sharp(buffer, { failOn: 'none' }).metadata();
  if (metadata.format !== 'webp') return null;
  if (!metadata.width || !metadata.height) throw new Error('Image has no dimensions');
  return { data: buffer, width: metadata.width, height: metadata.height };
}

/**
 * Convert any image format supported by sharp to WebP. Auto-orientation is
 * applied so photos taken on phones have the same visual orientation after
 * conversion.
 */
export async function convertImageToWebp(input: Buffer): Promise<ProcessedImage> {
  const data = await sharp(input, { failOn: 'none' })
    .rotate()
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
  const metadata = await sharp(data).metadata();
  if (!metadata.width || !metadata.height) throw new Error('Image has no dimensions');
  return { data, width: metadata.width, height: metadata.height };
}
