import { MAX_TIMEOUT_MS } from "./retry";

export function createStartupSignal(startupTimeoutMs: number | undefined): AbortSignal | undefined {
  if (startupTimeoutMs === undefined) {
    return undefined;
  }

  return AbortSignal.timeout(Math.min(Math.max(Math.ceil(startupTimeoutMs), 0), MAX_TIMEOUT_MS));
}
