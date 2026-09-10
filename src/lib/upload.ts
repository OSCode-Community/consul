import type { UploadResponse } from '@/lib/types';

export interface UploadOptions {
  /** Defaults to true so existing API consumers retain the current behavior. */
  watermark?: boolean;
  /** Optional S3 folder below the app's `osc/` namespace. */
  subfolder?: string;
}

/** Discriminated input for a single upload — either a local file or a remote URL. */
export type UploadInput =
  ({ kind: 'file'; file: File } & UploadOptions) | ({ kind: 'url'; url: string } & UploadOptions);

/**
 * POST a file or image URL to `/api/upload` and return the uploaded result.
 * Throws an `Error` (with the server's `message`) on any non-2xx response so it
 * flows into TanStack Query's `onError`.
 */
export async function uploadImage(input: UploadInput): Promise<UploadResponse> {
  const res =
    input.kind === 'file'
      ? await fetch('/api/upload', { method: 'POST', body: fileForm(input) })
      : await fetch('/api/upload', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            imageUrl: input.url,
            watermark: input.watermark,
            subfolder: input.subfolder
          })
        });

  const data = (await res.json().catch(() => ({}) as Record<string, unknown>)) as Partial<
    UploadResponse & { message: string }
  >;

  if (!res.ok) {
    throw new Error(data.message ?? `Upload failed (${res.status})`);
  }

  return data as UploadResponse;
}

function fileForm(input: Extract<UploadInput, { kind: 'file' }>): FormData {
  const fd = new FormData();
  fd.append('file', input.file);
  if (input.watermark !== undefined) fd.append('watermark', String(input.watermark));
  if (input.subfolder) fd.append('subfolder', input.subfolder);
  return fd;
}
