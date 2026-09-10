import { nanoid } from 'nanoid';
import { NextResponse } from 'next/server';
import { HttpError } from '@/lib/http';
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from '@/lib/server/env';
import { convertHeicToJpeg, convertImageToWebp, inspectWebp } from '@/lib/server/image';
import { fetchRemoteImage } from '@/lib/server/remote';
import { publicUrl, upload } from '@/lib/server/s3';
import { watermarkToWebp } from '@/lib/server/watermark';

// sharp / heic-convert / the AWS SDK need the Node.js runtime, and the route
// must run per-request (never statically cached).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const normalizeType = (type: string) => type.split(';')[0].trim().toLowerCase();

interface UploadOptions {
  watermark: boolean;
  subfolder: string;
}

function parseWatermark(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  throw new HttpError(400, 'watermark must be true or false');
}

/**
 * Permit nested folder names but reject traversal and characters that make the
 * resulting CDN URL ambiguous. The upload namespace remains under `osc/`.
 */
function parseSubfolder(value: unknown): string {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value !== 'string') throw new HttpError(400, 'subfolder must be a string');
  const segments = value.trim().replaceAll('\\', '/').split('/').filter(Boolean);
  if (
    segments.length === 0 ||
    segments.some(
      (segment) =>
        segment === '.' || segment === '..' || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(segment)
    )
  ) {
    throw new HttpError(
      400,
      'subfolder may contain letters, numbers, dots, underscores, hyphens, and nested slashes'
    );
  }
  return segments.join('/');
}

function imageKey(subfolder: string): string {
  return `osc/${subfolder ? `${subfolder}/` : ''}${nanoid()}.webp`;
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') ?? '';
    let input: Buffer;
    let mime: string;
    let sourceName = 'image';
    let options: UploadOptions;

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const file = form.get('file');
      if (!(file instanceof File)) throw new HttpError(400, 'No file was provided');
      if (file.size === 0) throw new HttpError(400, 'The file is empty');
      if (file.size > MAX_UPLOAD_BYTES)
        throw new HttpError(413, `File exceeds the ${MAX_UPLOAD_MB}MB limit`);
      input = Buffer.from(await file.arrayBuffer());
      mime = normalizeType(file.type || '');
      sourceName = file.name || sourceName;
      options = {
        watermark: parseWatermark(form.get('watermark')),
        subfolder: parseSubfolder(form.get('subfolder'))
      };
      // Some browsers don't set a MIME type on drag/paste — fall back to extension.
      if (!mime && /\.(heic|heif)$/i.test(sourceName)) mime = 'image/heic';
    } else if (contentType.includes('application/json')) {
      const body = (await request.json().catch(() => null)) as {
        imageUrl?: unknown;
        watermark?: unknown;
        subfolder?: unknown;
      } | null;
      const imageUrl = body?.imageUrl;
      if (typeof imageUrl !== 'string' || !imageUrl.trim())
        throw new HttpError(400, 'An imageUrl is required');
      const fetched = await fetchRemoteImage(imageUrl.trim(), MAX_UPLOAD_BYTES);
      input = fetched.buffer;
      mime = fetched.contentType;
      sourceName = imageUrl.split('/').pop()?.split('?')[0] || sourceName;
      options = {
        watermark: parseWatermark(body?.watermark),
        subfolder: parseSubfolder(body?.subfolder)
      };
    } else {
      throw new HttpError(
        415,
        'Unsupported content type — send multipart/form-data or JSON { imageUrl }'
      );
    }

    // MIME types are often missing or inaccurate for dragged files. The image
    // decoder below is the final validation, but reject known non-image types.
    if (mime && !mime.startsWith('image/')) {
      throw new HttpError(415, `Unsupported image type${mime ? `: ${mime}` : ''}`);
    }

    if (mime === 'image/heic' || mime === 'image/heif') {
      try {
        input = await convertHeicToJpeg(input);
      } catch {
        throw new HttpError(422, 'Could not decode the HEIC image');
      }
    }

    let processed;
    try {
      if (options.watermark) {
        processed = await watermarkToWebp(input);
      } else {
        // Keep an already-WebP upload intact. Every other decodable image
        // (PNG, JPEG, HEIC, AVIF, GIF, TIFF, etc.) is normalized to WebP.
        processed = (await inspectWebp(input)) ?? (await convertImageToWebp(input));
      }
    } catch (err) {
      console.error('Image processing failed', err);
      throw new HttpError(422, 'Could not process that image — is it a valid image file?');
    }

    const key = imageKey(options.subfolder);
    try {
      await upload(key, processed.data, 'image/webp');
    } catch (err) {
      console.error('S3 upload failed', err);
      throw new HttpError(502, 'Upload to storage failed');
    }

    return NextResponse.json({
      url: publicUrl(key),
      key,
      name: sourceName,
      width: processed.width,
      height: processed.height,
      bytes: processed.data.byteLength
    });
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    console.error('Unexpected upload error', err);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
