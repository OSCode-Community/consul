/** @type {import('next').NextConfig} */
const nextConfig = {
  // sharp and heic-convert ship native / large binary payloads that must not be
  // bundled by the server compiler — they are required from node_modules at
  // runtime instead. (@aws-sdk/client-s3 is likewise happier left external.)
  serverExternalPackages: ['sharp', 'heic-convert', '@aws-sdk/client-s3'],

  // The watermark SVG is read from disk at runtime by the upload route. Trace it
  // into the standalone/serverless output so the read succeeds after `next build`.
  outputFileTracingIncludes: {
    '/api/upload': ['./src/assets/**']
  }
};

export default nextConfig;
