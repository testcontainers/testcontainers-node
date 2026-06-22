import { PassThrough, Readable } from "stream";
import { DockerContainerClient } from "./docker-container-client";

describe("DockerContainerClient", () => {
  describe("exec", () => {
    it("should not truncate output when the demuxed streams flush after the raw stream ends", async () => {
      // Reproduces the output-truncation race. Like the real docker-modem, our fake
      // demuxStream writes demuxed content into the stdout PassThrough as the raw stream
      // emits "data" and never ends the PassThrough itself. We cork the PassThrough so the
      // write stays buffered on its writable side and is only released on a macrotask
      // (setImmediate) — after the raw stream's "end" and the microtask-resolved
      // exec.inspect() have completed. Pre-fix, exec() reads its still-empty chunk arrays at
      // that point and truncates the output; the fix must end + flush the PassThroughs and
      // let their "data" handlers run before reading the arrays.
      const payload = "the-final-line-that-must-not-be-truncated\n";

      // Raw multiplexed stream as handed to us by Dockerode.
      const rawStream = new PassThrough();

      const exec = {
        start: vi.fn(async () => {
          // Emit the final frame, then end, once exec() has wired up its listeners.
          process.nextTick(() => {
            rawStream.write(payload);
            rawStream.end();
          });
          return rawStream;
        }),
        // Resolves on a microtask — represents the inspect() HTTP round-trip that, in the
        // buggy version, completes before the demuxed data has been flushed.
        inspect: vi.fn(async () => ({ ExitCode: 0 })),
      };

      const container = {
        id: "container-id",
        exec: vi.fn(async () => exec),
      };

      const dockerode = {
        modem: {
          // Mimic docker-modem's demuxStream: forward raw "data" into the stdout
          // PassThrough without ever ending it. The PassThrough is corked, so the written
          // payload stays buffered (undelivered to "data" handlers) until it is uncorked on
          // a macrotask — i.e. after the raw stream's "end" has already fired.
          demuxStream: (raw: Readable, stdout: PassThrough) => {
            stdout.cork();
            raw.on("data", (chunk) => stdout.write(chunk));
            setImmediate(() => stdout.uncork());
          },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      const client = new DockerContainerClient(dockerode);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await client.exec(container as any, ["echo", "hi"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe(payload);
      expect(result.output).toBe(payload);
    });
  });
});
