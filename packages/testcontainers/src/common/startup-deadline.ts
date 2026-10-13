import { AsyncLocalStorage } from "node:async_hooks";

export class StartupDeadline {
  private readonly deadline: number;

  constructor(startupTimeoutMs: number) {
    this.deadline = Date.now() + startupTimeoutMs;
  }

  public getRemainingMs(): number {
    return Math.max(this.deadline - Date.now(), 0);
  }
}

export function createStartupDeadline(startupTimeoutMs: number | undefined): StartupDeadline | undefined {
  return startupTimeoutMs !== undefined ? new StartupDeadline(startupTimeoutMs) : undefined;
}

type Startup = { deadline: StartupDeadline; inProgress: boolean };

const currentStartup = new AsyncLocalStorage<Startup>();

export async function withStartupDeadline<T>(
  startupDeadline: StartupDeadline | undefined,
  fn: () => Promise<T>
): Promise<T> {
  if (startupDeadline === undefined) {
    return fn();
  }

  const startup = { deadline: startupDeadline, inProgress: true };
  try {
    return await currentStartup.run(startup, fn);
  } finally {
    // Callbacks registered during the startup, such as log consumers, keep this context after it ends.
    startup.inProgress = false;
  }
}

export function limitToStartupDeadline(timeoutMs: number): number {
  const startup = currentStartup.getStore();
  return startup?.inProgress ? Math.min(timeoutMs, startup.deadline.getRemainingMs()) : timeoutMs;
}
