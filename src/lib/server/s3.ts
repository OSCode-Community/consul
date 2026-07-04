import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { AWS_S3_PUBLIC_BASE_URL, requireS3Config } from './env';

let client: S3Client | null = null;
let bucketName = '';

function getClient(): { s3: S3Client; bucket: string } {
  if (!client) {
    const cfg = requireS3Config();
    client = new S3Client({
      region: cfg.region,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey
      }
    });
    bucketName = cfg.bucket;
  }
  return { s3: client, bucket: bucketName };
}

/**
 * Server-side upload to the oscode S3 bucket. The bucket needs no public ACL —
 * objects are served through the CDN (see `publicUrl`). Ported from oscode-be's
 * S3StorageService.
 */
export async function upload(key: string, body: Buffer, contentType: string): Promise<void> {
  const { s3, bucket } = getClient();
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      // Keys are unique (nanoid), so objects are immutable and cacheable forever.
      CacheControl: 'public, max-age=31536000, immutable'
    })
  );
}

/** Public CDN URL for an object key. */
export function publicUrl(key: string): string {
  return `${AWS_S3_PUBLIC_BASE_URL}/${key}`;
}
