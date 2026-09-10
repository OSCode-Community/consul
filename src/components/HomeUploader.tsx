'use client';

import { useCallback, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import Dropzone from '@/components/Dropzone';
import UploadResult from '@/components/UploadResult';
import { uploadImage, type UploadInput } from '@/lib/upload';
import type { UploadItem } from '@/lib/types';

export default function HomeUploader() {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [watermark, setWatermark] = useState(true);
  const [subfolder, setSubfolder] = useState('');
  const seq = useRef(0);
  const nextId = () => `${Date.now()}-${seq.current++}`;

  const prepend = useCallback((item: UploadItem) => {
    setItems((cur) => [item, ...cur]);
  }, []);

  const patch = useCallback((id: string, changes: Partial<UploadItem>) => {
    setItems((cur) => cur.map((it) => (it.id === id ? { ...it, ...changes } : it)));
  }, []);

  // A single mutation drives every upload. `mutate()` can be called
  // concurrently for multiple files; we thread each row's `id` through the
  // mutation context so the lifecycle callbacks patch the right row instead of
  // relying on the (single) latest mutation state.
  const { mutate: upload } = useMutation({
    mutationFn: uploadImage,
    onMutate: (input: UploadInput) => {
      const id = nextId();
      prepend({
        id,
        name: rowName(input),
        preview: rowPreview(input),
        status: 'uploading'
      });
      return { id };
    },
    onSuccess: (data, _input, ctx) => {
      patch(ctx.id, {
        status: 'done',
        url: data.url,
        preview: data.url,
        width: data.width,
        height: data.height,
        bytes: data.bytes
      });
    },
    onError: (err, _input, ctx) => {
      if (ctx) patch(ctx.id, { status: 'error', error: err.message });
    }
  });

  const uploadOptions = useCallback(
    () => ({ watermark, subfolder: subfolder.trim() || undefined }),
    [subfolder, watermark]
  );
  const handleFile = useCallback(
    (file: File) => upload({ kind: 'file', file, ...uploadOptions() }),
    [upload, uploadOptions]
  );
  const handleUrl = useCallback(
    (url: string) => upload({ kind: 'url', url, ...uploadOptions() }),
    [upload, uploadOptions]
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <main className="mx-auto flex max-w-180 flex-col gap-6 px-5 pt-12 pb-16">
        <header className="text-center">
          <h1 className="mb-[0.4rem] text-[1.9rem] font-bold">OSCode Image Uploader</h1>
          <p className="text-slate-400">
            Upload images to S3 as WebP, with or without the OSCode watermark.
          </p>
        </header>

        <section className="grid gap-4 rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:grid-cols-[1fr_1fr]">
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-slate-200">Upload mode</legend>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={watermark}
                onClick={() => setWatermark(true)}
                className={`cursor-pointer rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                  watermark
                    ? 'bg-indigo-500 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Add watermark
              </button>
              <button
                type="button"
                aria-pressed={!watermark}
                onClick={() => setWatermark(false)}
                className={`cursor-pointer rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                  !watermark
                    ? 'bg-indigo-500 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Direct upload
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              {watermark
                ? 'Adds the logo and converts the image to WebP.'
                : 'Uploads WebP unchanged; all other image formats are converted to WebP.'}
            </p>
          </fieldset>

          <label className="block text-sm font-semibold text-slate-200">
            S3 subfolder <span className="font-normal text-slate-500">(optional)</span>
            <input
              value={subfolder}
              onChange={(event) => setSubfolder(event.target.value)}
              placeholder="campaigns/september"
              className="mt-2 block w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm font-normal text-slate-200 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
            />
            <span className="mt-2 block text-xs font-normal text-slate-400">
              Stored below <code className="text-slate-300">osc/</code>. Use letters, numbers, dots,
              underscores, hyphens, and slashes.
            </span>
          </label>
        </section>

        <Dropzone onFile={handleFile} onUrl={handleUrl} />

        {items.length > 0 && (
          <section className="flex flex-col gap-3">
            {items.map((item) => (
              <UploadResult key={item.id} item={item} />
            ))}
          </section>
        )}
      </main>
    </div>
  );
}

function rowName(input: UploadInput): string {
  if (input.kind === 'file') return input.file.name || 'pasted image';
  return input.url.split('/').pop()?.split('?')[0] || 'linked image';
}

function rowPreview(input: UploadInput): string {
  return input.kind === 'file' ? URL.createObjectURL(input.file) : input.url;
}
