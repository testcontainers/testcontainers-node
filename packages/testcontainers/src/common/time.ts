export const toSeconds = (ms: number) => Math.trunc(ms * 1e-3);

export const toNanos = (ms: number) => ms * 1e6;

/** Unix seconds for Docker log filters. Numbers are already seconds; Dates are converted. */
export const toUnixSeconds = (value: number | Date): number =>
  value instanceof Date ? Math.trunc(value.getTime() * 1e-3) : value;
