# OSCode Image Uploader

Drag & drop an image from anywhere, get back a shareable URL with the **OSCode
watermark** stamped in the bottom-left corner. A self-contained Next.js app:
the browser UI and the watermarking/upload API live in the same project.

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
