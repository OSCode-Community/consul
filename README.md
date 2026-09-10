# OSCode Image Uploader

Drag & drop an image from anywhere and get back a shareable S3/CDN URL. Choose
whether to add the **OSCode watermark**, and optionally place files in a nested
S3 subfolder. A self-contained Next.js app: the browser UI and upload API live
in the same project.

Every non-WebP image (including HEIC, PNG, JPEG, AVIF, GIF, and other formats
supported by Sharp) is converted to WebP before upload. In direct-upload mode,
an input WebP is stored unchanged; watermark mode necessarily re-encodes it to
apply the mark.

## API options

`POST /api/upload` accepts either multipart form data with `file`, or JSON with
`imageUrl`. Both forms may include:

- `watermark`: boolean, default `true`. Set to `false` for a direct upload.
- `subfolder`: optional nested path below `osc/`, for example
  `campaigns/september`.

## Development

```bash
pnpm install
cp .env.example .env   # fill in the AWS S3 credentials
pnpm dev               # http://localhost:3000
```

## Production

```bash
pnpm build
pnpm start
```
