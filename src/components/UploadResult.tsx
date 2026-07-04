'use client';

import { useState } from 'react';
import type { UploadItem } from '@/lib/types';

interface Props {
  item: UploadItem;
}

export default function UploadResult({ item }: Props) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(text: string, field: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(field);
      setTimeout(() => {
        setCopied((cur) => (cur === field ? null : cur));
      }, 1500);
    } catch {
      // Clipboard API unavailable (e.g. non-secure context) — ignore.
    }
  }

  const kb = (bytes?: number) => (bytes ? `${Math.round(bytes / 1024)} KB` : '');

  return (
    <div className="flex gap-4 rounded-xl border border-slate-700 bg-slate-900 p-3">
      <div className="relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-lg bg-slate-950">
        {item.preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.preview} alt={item.name} className="h-full w-full object-cover" />
        )}
        {item.status === 'uploading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/55">
            <span
              className="h-[22px] w-[22px] animate-spin rounded-full border-[3px] border-slate-200/30 border-t-slate-200 [animation-duration:0.8s]"
              aria-label="Uploading"
            ></span>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-[0.4rem]">
        <div className="truncate font-semibold text-slate-200" title={item.name}>
          {item.name}
        </div>

        {item.status === 'uploading' ? (
          <div className="text-[0.85rem] text-slate-400">Watermarking &amp; uploading…</div>
        ) : item.status === 'error' ? (
          <div className="text-[0.85rem] text-red-400">{item.error ?? 'Upload failed'}</div>
        ) : item.status === 'done' && item.url ? (
          <>
            <div className="text-[0.78rem] text-slate-400">
              {item.width}×{item.height} · {kb(item.bytes)} · webp
            </div>
            <div className="flex gap-[0.4rem]">
              <input
                className="min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-950 px-[0.6rem] py-[0.4rem] font-mono text-[0.82rem] text-slate-200"
                readOnly
                value={item.url}
                onFocus={(e) => e.currentTarget.select()}
              />
              <button
                className="cursor-pointer rounded-md bg-indigo-500 px-[0.8rem] py-[0.4rem] text-[0.82rem] font-semibold text-white hover:bg-indigo-600"
                onClick={() => copy(item.url!, 'url')}
              >
                {copied === 'url' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="flex gap-4">
              <button
                className="cursor-pointer border-none bg-transparent p-0 text-[0.8rem] text-indigo-400 no-underline hover:underline"
                onClick={() => copy(`![${item.name}](${item.url})`, 'md')}
              >
                {copied === 'md' ? 'Copied!' : 'Copy Markdown'}
              </button>
              <a
                className="p-0 text-[0.8rem] text-indigo-400 no-underline hover:underline"
                href={item.url}
                target="_blank"
                rel="noreferrer"
              >
                Open ↗
              </a>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
