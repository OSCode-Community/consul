// Generates a placeholder OSCode watermark PNG so the app works out of the box.
// Replace src/assets/oscode-watermark.png with the real transparent logo.
//
//   node scripts/make-placeholder-watermark.mjs
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const out = fileURLToPath(new URL('../src/assets/oscode-watermark.png', import.meta.url));

// White glyphs with a dark outline drawn underneath, so it stays legible on
// both light and dark photos. No external font is required for the brackets;
// the wordmark falls back through common system faces.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="470" height="120" viewBox="0 0 470 120">
  <g fill="none" stroke-linecap="round" stroke-linejoin="round">
    <g stroke="#0f172a" stroke-width="15">
      <polyline points="46,36 20,60 46,84"/>
      <line x1="76" y1="28" x2="58" y2="92"/>
      <polyline points="88,36 114,60 88,84"/>
    </g>
    <g stroke="#ffffff" stroke-width="9">
      <polyline points="46,36 20,60 46,84"/>
      <line x1="76" y1="28" x2="58" y2="92"/>
      <polyline points="88,36 114,60 88,84"/>
    </g>
  </g>
  <text x="138" y="80" font-family="DejaVu Sans, Verdana, Arial, sans-serif" font-size="54"
        font-weight="700" fill="#ffffff" stroke="#0f172a" stroke-width="2" paint-order="stroke">OSCode</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(out);
console.log('Wrote placeholder watermark to', out);
