import type { Readable } from "node:stream";

const lines =
  (fn: (line: string) => void): ((stream: Readable) => void) =>
  (stream) => {
    let pending = "";

    stream.on("data", (chunk) => {
      pending += chunk.toString();
      const parts = pending.split(/\r?\n/);
      pending = parts.pop() ?? "";
      for (const line of parts) {
        fn(line);
      }
    });

    stream.on("end", () => {
      if (pending) {
        fn(pending);
      }
    });
  };

const toConsole = ({ prefix }: { prefix: string }): ((stream: Readable) => void) =>
  lines((line) => {
    // biome-ignore lint/suspicious/noConsole: this consumer's purpose is to print logs to the console.
    console.log(`[${prefix}] ${line}`);
  });

export const LogConsumers = { lines, toConsole };
