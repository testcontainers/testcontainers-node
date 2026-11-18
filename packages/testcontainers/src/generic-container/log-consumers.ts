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

export const LogConsumers = { lines };
