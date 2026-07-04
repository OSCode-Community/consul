import 'server-only';

/**
 * Public CDN base that fronts the S3 bucket (matches oscode-be's
 * S3StorageService). Trailing slashes are stripped so `publicUrl()` can join
 * with a single `/`.
 */
export const AWS_S3_PUBLIC_BASE_URL = (
  process.env.AWS_S3_PUBLIC_BASE_URL || 'https://cdn.oscode.co.in'
).replace(/\/+$/, '');

/** Maximum accepted upload size. */
export const MAX_UPLOAD_MB = Math.max(1, Number(process.env.MAX_UPLOAD_MB) || 10);
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

export interface S3Config {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

/**
 * Reads and validates the AWS credentials. Called lazily (and cached in s3.ts)
 * so `next build` succeeds without secrets present — the error only surfaces on
 * the first real upload if something is missing.
 */
export function requireS3Config(): S3Config {
  // Trim every value: copy-pasted secrets and bucket names routinely carry a
  // stray trailing space, which the S3 SDK rejects with `InvalidBucketName`.
  const region = process.env.AWS_REGION?.trim() || 'ap-south-1';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.AWS_S3_BUCKET?.trim();

  const missing = (
    [
      ['AWS_ACCESS_KEY_ID', accessKeyId],
      ['AWS_SECRET_ACCESS_KEY', secretAccessKey],
      ['AWS_S3_BUCKET', bucket]
    ] as const
  )
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(`Missing required S3 environment variables: ${missing.join(', ')}`);
  }

  return {
    region,
    accessKeyId: accessKeyId as string,
    secretAccessKey: secretAccessKey as string,
    bucket: bucket as string
  };
}
