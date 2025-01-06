import type { WrapOptions } from "retry";

let retryOptions: WrapOptions = {};

export function setRetryOptions(retryOptionsInput: Omit<WrapOptions, "forever">): void {
  retryOptions = retryOptionsInput;
}

export function getRetryOptions(): WrapOptions {
  return retryOptions;
}
