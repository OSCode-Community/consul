export type UploadStatus = 'uploading' | 'done' | 'error';

export interface UploadItem {
  id: string;
  name: string;
  /** Local object URL while uploading, swapped for the CDN URL once done. */
  preview: string;
  status: UploadStatus;
  url?: string;
  width?: number;
  height?: number;
  bytes?: number;
  error?: string;
}

/** Shape returned by POST /api/upload on success. */
export interface UploadResponse {
  url: string;
  key: string;
  name: string;
  width: number;
  height: number;
  bytes: number;
}
