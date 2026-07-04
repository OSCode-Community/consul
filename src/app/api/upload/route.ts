import { nanoid } from 'nanoid';
import { NextResponse } from 'next/server';
import { HttpError } from '@/lib/http';
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from '@/lib/server/env';
import { convertHeicToJpeg } from '@/lib/server/image';
import { fetchRemoteImage } from '@/lib/server/remote';
import { publicUrl, upload } from '@/lib/server/s3';
import { watermarkToWebp } from '@/lib/server/watermark';

// sharp / heic-convert / the AWS SDK need the Node.js runtime, and the route
// must run per-request (never statically cached).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ACCEPTED = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/heic',
  'image/heif'
]);

const normalizeType = (type: string) => type.split(';')[0].trim().toLowerCase();

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') ?? '';
    let input: Buffer;
    let mime: string;
    let sourceName = 'image';

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
      // Some browsers don't set a MIME type on drag/paste — fall back to extension.
      if (!mime && /\.(heic|heif)$/i.test(sourceName)) mime = 'image/heic';
    } else if (contentType.includes('application/json')) {
      const body = (await request.json().catch(() => null)) as { imageUrl?: unknown } | null;
      const imageUrl = body?.imageUrl;
      if (typeof imageUrl !== 'string' || !imageUrl.trim())
        throw new HttpError(400, 'An imageUrl is required');
      const fetched = await fetchRemoteImage(imageUrl.trim(), MAX_UPLOAD_BYTES);
      input = fetched.buffer;
      mime = fetched.contentType;
      sourceName = imageUrl.split('/').pop()?.split('?')[0] || sourceName;
    } else {
      throw new HttpError(
        415,
        'Unsupported content type — send multipart/form-data or JSON { imageUrl }'
      );
    }

    if (!ACCEPTED.has(mime)) {
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
      processed = await watermarkToWebp(input);
    } catch (err) {
      console.error('Image processing failed', err);
      throw new HttpError(422, 'Could not process that image — is it a valid image file?');
    }

    const key = `osc/${nanoid()}.webp`;
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
