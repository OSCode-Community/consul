'use client';

import { useCallback, useRef, useState } from 'react';
import Dropzone from '@/components/Dropzone';
import UploadResult from '@/components/UploadResult';
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

  const finish = useCallback(
    async (id: string, res: Response) => {
      const data = await res.json().catch(() => ({}) as Record<string, unknown>);
      if (!res.ok) {
        patch(id, {
          status: 'error',
          error: (data?.message as string) ?? `Upload failed (${res.status})`
        });
        return;
      }
      patch(id, {
        status: 'done',
        url: data.url as string,
        preview: data.url as string,
        width: data.width as number,
        height: data.height as number,
        bytes: data.bytes as number
      });
    },
    [patch]
  );

  const handleFile = useCallback(
    async (file: File) => {
      const id = nextId();
      prepend({
        id,
        name: file.name || 'pasted image',
        preview: URL.createObjectURL(file),
        status: 'uploading'
      });
      const fd = new FormData();
      fd.append('file', file);
      try {
        await finish(id, await fetch('/api/upload', { method: 'POST', body: fd }));
      } catch {
        patch(id, { status: 'error', error: 'Network error' });
      }
    },
    [prepend, finish, patch]
  );

  const handleUrl = useCallback(
    async (url: string) => {
      const id = nextId();
      prepend({
        id,
        name: url.split('/').pop()?.split('?')[0] || 'linked image',
        preview: url,
        status: 'uploading'
      });
      try {
        await finish(
          id,
          await fetch('/api/upload', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ imageUrl: url })
          })
        );
      } catch {
        patch(id, { status: 'error', error: 'Network error' });
      }
    },
    [prepend, finish, patch]
  );

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
