import type { UploadResponse } from '@/lib/types';

/** Discriminated input for a single upload — either a local file or a remote URL. */
export type UploadInput = { kind: 'file'; file: File } | { kind: 'url'; url: string };

/**
 * POST a file or image URL to `/api/upload` and return the watermarked result.
 * Throws an `Error` (with the server's `message`) on any non-2xx response so it
 * flows into TanStack Query's `onError`.
 */
export async function uploadImage(input: UploadInput): Promise<UploadResponse> {
  const res =
    input.kind === 'file'
      ? await fetch('/api/upload', { method: 'POST', body: fileForm(input.file) })
      : await fetch('/api/upload', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ imageUrl: input.url })
        });

  const data = (await res.json().catch(() => ({}) as Record<string, unknown>)) as Partial<
    UploadResponse & { message: string }
  >;

  if (!res.ok) {
    throw new Error(data.message ?? `Upload failed (${res.status})`);
  }

  return data as UploadResponse;
}

function fileForm(file: File): FormData {
  const fd = new FormData();
  fd.append('file', file);
  return fd;
}
