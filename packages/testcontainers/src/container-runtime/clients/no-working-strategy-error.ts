export type StrategyAttempt = { name: string; reason: string; error?: unknown };

export function createNoWorkingStrategyError(attempts: StrategyAttempt[]): Error {
  const lines = attempts.map(({ name, reason }) => `  - ${name}: ${reason}`);
  const errors = attempts.map(({ error }) => error).filter((error) => error !== undefined);

  return new Error(
    [
      "Could not find a working container runtime strategy. Tried:",
      ...lines,
      "See https://node.testcontainers.org/supported-container-runtimes/",
    ].join("\n"),
    errors.length > 0 ? { cause: new AggregateError(errors) } : undefined
  );
}
