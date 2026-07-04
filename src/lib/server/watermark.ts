import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

/**
 * Watermark asset path, resolved from the project root at runtime. Traced into
 * the build output via `outputFileTracingIncludes` in next.config.mjs so the
 * read succeeds in standalone/serverless output as well as `next start`.
 */
const WATERMARK_PATH = path.join(process.cwd(), 'src/assets/OSCode-Logo-White.svg');

/** Longest edge (width) the output image is capped to. */
const MAX_WIDTH = 1920;
/** Watermark width as a fraction of the image width, then clamped below. */
const WIDTH_RATIO = 0.08;
const MIN_WATERMARK_W = 50;
const MAX_WATERMARK_W = 200;
/** Padding from the bottom and left edges, as a fraction of image width. */
const PADDING_RATIO = 0.02;
/** Watermark opacity (0–1). */
const OPACITY = 0.85;
/** WebP encode quality. */
const WEBP_QUALITY = 85;
/**
 * SVG rasterization density (DPI). The logo is a vector, and sharp renders SVGs
 * at 72 DPI by default. Rasterizing at a higher density means the overlay is
 * always *downscaled* to its target width (≤MAX_WATERMARK_W) rather than
 * enlarged, keeping the mark crisp at every image size.
 */
const SVG_DENSITY = 300;

let watermarkRaw: Buffer | null = null;

/** Load the watermark asset once (works in dev and in the production build). */
async function loadWatermark(): Promise<Buffer> {
  if (!watermarkRaw) {
    watermarkRaw = await readFile(WATERMARK_PATH);
  }
  return watermarkRaw;
}

/**
 * Uniformly reduce a PNG's alpha. Tiling a 1×1 semi-transparent white pixel with
 * the `dest-in` blend multiplies the existing alpha channel by `opacity`, so the
 * result is correct regardless of the source PNG's own transparency.
 */
async function withOpacity(png: Buffer, opacity: number): Promise<Buffer> {
  if (opacity >= 1) return png;
  const alpha = Math.round(255 * Math.min(1, Math.max(0, opacity)));
  return sharp(png)
    .ensureAlpha()
    .composite([
      {
        input: Buffer.from([255, 255, 255, alpha]),
        raw: { width: 1, height: 1, channels: 4 },
        tile: true,
        blend: 'dest-in'
      }
    ])
    .png()
    .toBuffer();
}

/** Build the watermark overlay sized proportionally to a base image width. */
async function buildOverlay(
  baseWidth: number
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const targetW = Math.round(
    Math.min(MAX_WATERMARK_W, Math.max(MIN_WATERMARK_W, baseWidth * WIDTH_RATIO))
  );
  const resized = await sharp(await loadWatermark(), { density: SVG_DENSITY })
    .resize({ width: targetW })
    .png()
    .toBuffer();
  const buffer = await withOpacity(resized, OPACITY);
  const meta = await sharp(buffer).metadata();
  return { buffer, width: meta.width ?? targetW, height: meta.height ?? 0 };
}

export interface WatermarkedImage {
  data: Buffer;
  width: number;
  height: number;
}

/**
 * Auto-orient + resize (≤MAX_WIDTH, never upscaled), stamp the OSCode watermark
 * in the bottom-left corner, then encode to WebP. Resizing happens first so the
 * watermark is sized relative to the final image.
 */
export async function watermarkToWebp(input: Buffer): Promise<WatermarkedImage> {
  // `failOn: 'none'` tolerates slightly malformed but decodable images.
  const resized = await sharp(input, { failOn: 'none' })
    .rotate() // honour EXIF orientation (phone photos)
    .resize(MAX_WIDTH, null, { fit: 'inside', withoutEnlargement: true })
    .png() // lossless intermediate for compositing
    .toBuffer();

  const meta = await sharp(resized).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  let composited = resized;
  if (width > 0 && height > 0) {
    const overlay = await buildOverlay(width);
    const pad = Math.round(width * PADDING_RATIO);
    const left = Math.max(0, Math.min(pad, width - overlay.width));
    const top = Math.max(0, height - overlay.height - pad);
    composited = await sharp(resized)
      .composite([{ input: overlay.buffer, top, left }])
      .toBuffer();
  }

  const data = await sharp(composited).webp({ quality: WEBP_QUALITY }).toBuffer();
  const out = await sharp(data).metadata();
  return { data, width: out.width ?? width, height: out.height ?? height };
}
