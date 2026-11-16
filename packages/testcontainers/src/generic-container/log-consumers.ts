import type { Readable } from "node:stream";

export const LogConsumers = {
  lines:
    (fn: (line: string) => void): ((stream: Readable) => void) =>
    (stream) => {
      let pending = "";

      stream.on("data", (chunk) => {
        pending += chunk.toString();
        const lines = pending.split(/\r?\n/);
        pending = lines.pop() ?? "";
        for (const line of lines) {
          fn(line);
        }
      });

      stream.on("end", () => {
        if (pending) {
          fn(pending);
        }
      });
    },
};
