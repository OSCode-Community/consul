// `heic-convert` ships no type definitions. It is a CommonJS module whose
// default export is the conversion function.
declare module 'heic-convert' {
  interface ConvertOptions {
    buffer: Buffer | Uint8Array | ArrayBuffer;
    format: 'JPEG' | 'PNG';
    /** 0–1, JPEG only. */
    quality?: number;
  }
  function convert(options: ConvertOptions): Promise<ArrayBuffer>;
  export = convert;
}
