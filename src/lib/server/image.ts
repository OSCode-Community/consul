import heicConvert from 'heic-convert';

/**
 * Convert an HEIC/HEIF buffer (iPhone photos) to JPEG so the rest of the
 * pipeline can process it reliably, regardless of the sharp build's codecs.
 * Mirrors oscode-be's `convertHeicToJpeg`.
 */
export async function convertHeicToJpeg(buffer: Buffer): Promise<Buffer> {
  const out = await heicConvert({ buffer, format: 'JPEG', quality: 0.9 });
  return Buffer.from(out);
}
