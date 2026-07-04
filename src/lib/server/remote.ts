import dns from 'node:dns/promises';
import net from 'node:net';
import { httpError } from '@/lib/http';

/** True for loopback / private / link-local / CGNAT addresses we must not fetch. */
function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true; // link-local
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    return false;
  }
  const ip6 = ip.toLowerCase();
  if (ip6 === '::1' || ip6 === '::') return true;
  if (ip6.startsWith('::ffff:')) return isPrivateIp(ip6.slice('::ffff:'.length)); // IPv4-mapped
  if (ip6.startsWith('fe80') || ip6.startsWith('fc') || ip6.startsWith('fd')) return true;
  return false;
}

/** Reject hostnames that resolve to a private/loopback address (SSRF guard). */
async function assertPublicHost(hostname: string): Promise<void> {
  let addresses: string[];
  if (net.isIP(hostname)) {
    addresses = [hostname];
  } else {
    try {
      addresses = (await dns.lookup(hostname, { all: true })).map((r) => r.address);
    } catch {
      httpError(400, 'Could not resolve that host');
    }
  }
  if (addresses.length === 0 || addresses.some(isPrivateIp)) {
    httpError(400, 'Refusing to fetch from a private or loopback address');
  }
}

export interface FetchedImage {
  buffer: Buffer;
  contentType: string;
}

/**
 * Fetch a remote image URL with SSRF guards (http(s) only, no redirects, no
 * private hosts) and a hard size cap. Used for "drag an image from another
 * website" where the browser hands over a URL rather than file bytes.
 */
export async function fetchRemoteImage(rawUrl: string, maxBytes: number): Promise<FetchedImage> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    httpError(400, 'Invalid URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    httpError(400, 'Only http(s) URLs are supported');
  }
  await assertPublicHost(url.hostname);

  let res: Response;
  try {
    res = await fetch(url, {
      redirect: 'error', // a redirect could bypass the host check
      signal: AbortSignal.timeout(10_000),
      headers: { 'user-agent': 'oscode-image-uploader/1.0', accept: 'image/*' }
    });
  } catch {
    httpError(400, 'Could not fetch that URL');
  }
  if (!res.ok || !res.body) {
    httpError(400, `Remote server returned ${res.status}`);
  }

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      httpError(413, 'Remote image is too large');
    }
    chunks.push(value);
  }

  return {
    buffer: Buffer.concat(chunks),
    contentType: (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
  };
}
