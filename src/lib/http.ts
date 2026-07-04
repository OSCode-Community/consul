/**
 * Small HTTP error used by server code to signal a specific status + message,
 * replacing SvelteKit's `error()` helper. The upload route catches these and
 * renders them as `{ message }` JSON, matching the shape the client reads.
 */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/** Throwable factory mirroring the ergonomics of `error(status, message)`. */
export function httpError(status: number, message: string): never {
  throw new HttpError(status, message);
}
