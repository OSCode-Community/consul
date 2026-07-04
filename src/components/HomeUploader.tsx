'use client';

import { useCallback, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import Dropzone from '@/components/Dropzone';
import UploadResult from '@/components/UploadResult';
import { uploadImage, type UploadInput } from '@/lib/upload';
import type { UploadItem } from '@/lib/types';

export default function HomeUploader() {
  const [items, setItems] = useState<UploadItem[]>([]);
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

  const handleFile = useCallback((file: File) => upload({ kind: 'file', file }), [upload]);
  const handleUrl = useCallback((url: string) => upload({ kind: 'url', url }), [upload]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <main className="mx-auto flex max-w-180 flex-col gap-6 px-5 pt-12 pb-16">
        <header className="text-center">
          <h1 className="mb-[0.4rem] text-[1.9rem] font-bold">OSCode Image Uploader</h1>
          <p className="text-slate-400">
            Drop an image anywhere — we stamp the OSCode watermark bottom-left and hand you a URL.
          </p>
        </header>

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
