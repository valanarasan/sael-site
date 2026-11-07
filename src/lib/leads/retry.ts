/** Retries an async call with exponential backoff (300 ms, 900 ms, … by default). */

export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  /** Injected so tests don't wait. */
  sleep?: (ms: number) => Promise<void>;
  onRetry?: (attempt: number, error: unknown) => void;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { attempts = 3, baseDelayMs = 300, sleep = wait, onRetry } = options;
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        onRetry?.(attempt, error);
        await sleep(baseDelayMs * 3 ** (attempt - 1));
      }
    }
  }
  throw lastError;
}
