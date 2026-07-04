'use client';

import { useRef, useState } from 'react';

interface UploadFile {
  id: string;
  name: string;
  size: number;
  file: File;
}

interface Props {
  /** Max size per file, in megabytes. */
  maxSizeMB?: number;
  /** Max number of files that can be queued. */
  maxFiles?: number;
  /** `accept` attribute for the file input (e.g. "image/*,.pdf"). */
  accept?: string;
  /** Fired whenever the file list changes. */
  onChange?: (files: File[]) => void;
}

// ── file-type → label + icon category ───────────────────────────────
type IconKind = 'file' | 'archive' | 'image';
interface TypeInfo {
  label: string;
  icon: IconKind;
}

const TYPE_MAP: Record<string, TypeInfo> = {
  pdf: { label: 'PDF', icon: 'file' },
  zip: { label: 'Archive', icon: 'archive' },
  rar: { label: 'Archive', icon: 'archive' },
  '7z': { label: 'Archive', icon: 'archive' },
  tar: { label: 'Archive', icon: 'archive' },
  gz: { label: 'Archive', icon: 'archive' },
  tgz: { label: 'Archive', icon: 'archive' },
  doc: { label: 'Word', icon: 'file' },
  docx: { label: 'Word', icon: 'file' },
  xls: { label: 'Excel', icon: 'file' },
  xlsx: { label: 'Excel', icon: 'file' },
  csv: { label: 'Excel', icon: 'file' },
  ppt: { label: 'Slides', icon: 'file' },
  pptx: { label: 'Slides', icon: 'file' },
  json: { label: 'JSON', icon: 'file' },
  js: { label: 'Code', icon: 'file' },
  ts: { label: 'Code', icon: 'file' },
  html: { label: 'Code', icon: 'file' },
  css: { label: 'Code', icon: 'file' },
  txt: { label: 'Text', icon: 'file' },
  md: { label: 'Text', icon: 'file' },
  png: { label: 'Image', icon: 'image' },
  jpg: { label: 'Image', icon: 'image' },
  jpeg: { label: 'Image', icon: 'image' },
  gif: { label: 'Image', icon: 'image' },
  webp: { label: 'Image', icon: 'image' },
  svg: { label: 'Image', icon: 'image' }
};

function typeInfo(name: string): TypeInfo {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return TYPE_MAP[ext] ?? { label: ext ? ext.toUpperCase() : 'File', icon: 'file' };
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}Bytes`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(2)}KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(2)}MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)}GB`;
}

function FileIcon({ kind }: { kind: IconKind }) {
  if (kind === 'archive') {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14 2v5a1 1 0 0 0 1 1h5M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7zM11 6h1M11 9h1M11 12h1M11 15h2v3a1 1 0 0 1-1 1 1 1 0 0 1-1-1z"
        />
      </svg>
    );
  }
  if (kind === 'image') {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14 2v5a1 1 0 0 0 1 1h5M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7zM9.5 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2M20 16l-3.5-3.5L8 21"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14 2v5a1 1 0 0 0 1 1h5M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7zM8 13h8M8 17h8M8 9h2"
      />
    </svg>
  );
}

export default function FileUpload({ maxSizeMB = 50, maxFiles = 10, accept, onChange }: Props) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Counter so nested elements don't flicker the drag state on dragleave.
  const depth = useRef(0);
  const seq = useRef(0);
  const uid = () =>
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `f-${++seq.current}`;

  const errorTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  function flash(message: string) {
    setError(message);
    clearTimeout(errorTimer.current);
    errorTimer.current = setTimeout(() => setError(null), 3200);
  }

  // ── mutations ───────────────────────────────────────────────────────
  function addFiles(list: FileList | File[]) {
    const limit = maxSizeMB * 1024 * 1024;
    let rejectedSize = 0;
    let rejectedFull = false;
    const next = [...files];

    for (const file of Array.from(list)) {
      if (next.length >= maxFiles) {
        rejectedFull = true;
        break;
      }
      if (file.size > limit) {
        rejectedSize += 1;
        continue;
      }
      next.push({ id: uid(), name: file.name || 'untitled', size: file.size, file });
    }

    setFiles(next);

    if (rejectedFull) flash(`You can upload at most ${maxFiles} files.`);
    else if (rejectedSize)
      flash(
        `${rejectedSize} file${rejectedSize > 1 ? 's' : ''} exceeded ${maxSizeMB}MB and were skipped.`
      );

    onChange?.(next.map((f) => f.file));
  }

  function remove(id: string) {
    const next = files.filter((f) => f.id !== id);
    setFiles(next);
    onChange?.(next.map((f) => f.file));
  }

  function removeAll() {
    setFiles([]);
    onChange?.([]);
  }

  function downloadFile(f: UploadFile) {
    const url = URL.createObjectURL(f.file);
    const a = document.createElement('a');
    a.href = url;
    a.download = f.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // ── input + drag/drop handlers ──────────────────────────────────────
  function openPicker() {
    fileInputRef.current?.click();
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const target = e.currentTarget;
    if (target.files?.length) addFiles(target.files);
    target.value = '';
  }

  function onDragEnter(e: React.DragEvent) {
    if (!e.dataTransfer) return;
    e.preventDefault();
    depth.current += 1;
    setDragging(true);
  }
  function onDragOver(e: React.DragEvent) {
    if (e.dataTransfer) e.preventDefault();
  }
  function onDragLeave() {
    depth.current -= 1;
    if (depth.current <= 0) {
      depth.current = 0;
      setDragging(false);
    }
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    depth.current = 0;
    setDragging(false);
    if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
  }

  return (
    <div className="flex w-full flex-col gap-5 font-sans text-[#ededed]">
      {/* Drop zone */}
      <div
        className={`group flex cursor-pointer flex-col items-center justify-center gap-[0.85rem] rounded-[14px] border-[1.5px] border-dashed px-6 py-11 text-center transition hover:border-[#3a3a3a] hover:bg-[rgba(255,255,255,0.015)] focus-visible:border-[#3a3a3a] focus-visible:bg-[rgba(255,255,255,0.015)] focus-visible:outline-none ${
          dragging
            ? '[transform:scale(1.005)] border-[#5a5a5a] bg-[rgba(255,255,255,0.04)]'
            : 'border-neutral-800 bg-transparent'
        }`}
        role="button"
        tabIndex={0}
        aria-label="Drop files here or browse files"
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openPicker();
          }
        }}
      >
        <span
          className={`grid h-[60px] w-[60px] place-items-center rounded-full transition group-hover:bg-[#1f1f1f] group-hover:text-[#ededed] ${
            dragging
              ? '[transform:translateY(-2px)_scale(1.06)] bg-[#1f1f1f] text-[#ededed]'
              : 'bg-neutral-900 text-[#8b8b8b]'
          }`}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
            <path
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"
            />
          </svg>
        </span>
        <p className="text-[1.06rem] font-medium text-[#ededed]">
          Drop files here or{' '}
          <span className="underline decoration-[#6b6b6b] underline-offset-[3px]">
            browse files
          </span>
        </p>
        <p className="text-[0.86rem] text-[#6b6b6b]">
          Maximum file size: {maxSizeMB}MB • Maximum files: {maxFiles}
        </p>
      </div>

      {error && (
        <p
          className="mt-[-0.5rem] text-[0.83rem] text-red-400"
          style={{ animation: 'slide-in 180ms ease-out' }}
        >
          {error}
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple
        hidden
        onChange={onInputChange}
      />

      {/* File list */}
      {files.length > 0 && (
        <section style={{ animation: 'slide-in 220ms cubic-bezier(0.23, 1, 0.32, 1)' }}>
          <div className="mb-[0.85rem] flex items-center justify-between gap-4">
            <h2 className="text-[1.2rem] font-medium text-[#ededed]">Files ({files.length})</h2>
            <div className="flex gap-[0.6rem]">
              <button
                className="inline-flex cursor-pointer items-center gap-2 rounded-[9px] border border-neutral-800 bg-transparent px-[0.85rem] py-2 text-[0.9rem] font-medium text-[#ededed] transition enabled:hover:border-[#3a3a3a] enabled:hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={openPicker}
                disabled={files.length >= maxFiles}
              >
                <svg
                  className="text-[#8b8b8b]"
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  aria-hidden="true"
                >
                  <path
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 13v8M8 17l4-4 4 4M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.2"
                  />
                </svg>
                Add files
              </button>
              <button
                className="inline-flex cursor-pointer items-center gap-2 rounded-[9px] border border-neutral-800 bg-transparent px-[0.85rem] py-2 text-[0.9rem] font-medium text-[#ededed] transition enabled:hover:border-[#3a3a3a] enabled:hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={removeAll}
              >
                <svg
                  className="text-[#8b8b8b]"
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  aria-hidden="true"
                >
                  <path
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"
                  />
                </svg>
                Remove all
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-[#1c1c1c]">
            <div
              className="grid min-h-[52px] grid-cols-[minmax(0,1fr)_130px_150px_92px] items-center gap-4 border-b border-[#1c1c1c] px-[1.1rem] text-[0.94rem] font-medium text-[#8b8b8b] max-[560px]:grid-cols-[minmax(0,1fr)_auto_84px] max-[560px]:gap-[0.6rem]"
              aria-hidden="true"
            >
              <span>Name</span>
              <span className="max-[560px]:hidden">Type</span>
              <span>Size</span>
              <span className="text-right">Actions</span>
            </div>

            {files.map((f) => {
              const info = typeInfo(f.name);
              return (
                <div
                  key={f.id}
                  className="grid min-h-[60px] grid-cols-[minmax(0,1fr)_130px_150px_92px] items-center gap-4 border-b border-[#1c1c1c] px-[1.1rem] transition-colors last:border-b-0 hover:bg-[rgba(255,255,255,0.022)] max-[560px]:grid-cols-[minmax(0,1fr)_auto_84px] max-[560px]:gap-[0.6rem]"
                  style={{ animation: 'fly-in 260ms cubic-bezier(0.23, 1, 0.32, 1)' }}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="grid shrink-0 place-items-center text-[#8b8b8b]">
                      <FileIcon kind={info.icon} />
                    </span>
                    <span className="truncate text-base text-[#ededed]" title={f.name}>
                      {f.name}
                    </span>
                  </span>

                  <span className="flex min-w-0 items-center max-[560px]:hidden">
                    <span className="inline-flex items-center rounded-[7px] bg-[#1f1f1f] px-[0.6rem] py-[0.2rem] text-[0.82rem] font-medium text-neutral-300">
                      {info.label}
                    </span>
                  </span>

                  <span className="flex min-w-0 items-center text-[0.98rem] text-[#6b6b6b]">
                    {formatSize(f.size)}
                  </span>

                  <span className="flex min-w-0 items-center justify-end gap-[0.35rem] text-right">
                    <button
                      className="grid h-8 w-8 cursor-pointer place-items-center rounded-[7px] border-none bg-transparent text-[#8b8b8b] transition-colors hover:bg-neutral-900 hover:text-[#ededed]"
                      title="Download"
                      aria-label={`Download ${f.name}`}
                      onClick={() => downloadFile(f)}
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                        <path
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"
                        />
                      </svg>
                    </button>
                    <button
                      className="grid h-8 w-8 cursor-pointer place-items-center rounded-[7px] border-none bg-transparent text-[#8b8b8b] transition-colors hover:bg-neutral-900 hover:text-red-400"
                      title="Remove"
                      aria-label={`Remove ${f.name}`}
                      onClick={() => remove(f.id)}
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                        <path
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"
                        />
                      </svg>
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
