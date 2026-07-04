'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  onFile: (file: File) => void;
  onUrl: (url: string) => void;
}

const isImageFile = (f: File) => f.type.startsWith('image/') || /\.(heic|heif|avif)$/i.test(f.name);

function extractUrl(dt: DataTransfer): string | null {
  const raw = dt.getData('text/uri-list') || dt.getData('text/plain');
  if (!raw) return null;
  return (
    raw
      .split(/\r?\n/)
      .map((s) => s.trim())
      .find((s) => /^https?:\/\//i.test(s)) ?? null
  );
}

export default function Dropzone({ onFile, onUrl }: Props) {
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Counter so nested elements don't cause the overlay to flicker on dragleave.
  const depth = useRef(0);

  // Keep the latest callbacks in refs so the window listeners (registered once)
  // never go stale without needing to re-subscribe on every render.
  const onFileRef = useRef(onFile);
  const onUrlRef = useRef(onUrl);
  onFileRef.current = onFile;
  onUrlRef.current = onUrl;

  useEffect(() => {
    const emitFiles = (list: FileList | File[]) => {
      for (const f of Array.from(list)) if (isImageFile(f)) onFileRef.current(f);
    };

    function onDragEnter(e: DragEvent) {
      if (!e.dataTransfer) return;
      e.preventDefault();
      depth.current += 1;
      setDragging(true);
    }
    function onDragOver(e: DragEvent) {
      if (e.dataTransfer) e.preventDefault();
    }
    function onDragLeave() {
      depth.current -= 1;
      if (depth.current <= 0) {
        depth.current = 0;
        setDragging(false);
      }
    }
    function onDrop(e: DragEvent) {
      e.preventDefault();
      depth.current = 0;
      setDragging(false);
      const dt = e.dataTransfer;
      if (!dt) return;
      if (dt.files && dt.files.length) {
        emitFiles(dt.files);
        return;
      }
      const url = extractUrl(dt);
      if (url) onUrlRef.current(url);
    }
    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      let handled = false;
      for (const it of Array.from(items)) {
        if (it.kind === 'file' && it.type.startsWith('image/')) {
          const f = it.getAsFile();
          if (f) {
            onFileRef.current(f);
            handled = true;
          }
        }
      }
      if (!handled) {
        const text = e.clipboardData?.getData('text/plain')?.trim();
        if (text && /^https?:\/\/\S+\.(png|jpe?g|webp|gif|avif|heic|heif)(\?\S*)?$/i.test(text)) {
          onUrlRef.current(text);
        }
      }
    }

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    window.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
      window.removeEventListener('paste', onPaste);
    };
  }, []);

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const target = e.currentTarget;
    if (target.files) {
      for (const f of Array.from(target.files)) if (isImageFile(f)) onFile(f);
    }
    target.value = '';
  }

  function openPicker() {
    fileInputRef.current?.click();
  }

  return (
    <>
      <div
        className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900 px-6 py-11 text-slate-400 transition-colors hover:border-indigo-500 hover:bg-[#111a30] hover:text-slate-200 focus-visible:border-indigo-500 focus-visible:bg-[#111a30] focus-visible:text-slate-200 focus-visible:outline-none"
        role="button"
        tabIndex={0}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openPicker();
          }
        }}
      >
        <svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true">
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 16V4m0 0L8 8m4-4 4 4M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"
          />
        </svg>
        <p className="mt-1 text-[1.05rem] font-semibold text-slate-200">
          Drag &amp; drop images anywhere
        </p>
        <p className="text-[0.85rem]">
          …or click to browse · paste from clipboard · drop an image from another tab
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        hidden
        onChange={onInputChange}
      />

      {dragging && (
        <div
          className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-slate-950/72 backdrop-blur-[3px]"
          aria-hidden="true"
        >
          <div className="rounded-2xl border-2 border-dashed border-indigo-500 bg-slate-900/90 px-10 py-6 text-xl font-bold text-slate-200">
            Drop to watermark &amp; upload
          </div>
        </div>
      )}
    </>
  );
}
