import { PassThrough, type Readable } from "node:stream";
import { DockerContainerClient } from "./docker-container-client";

describe("DockerContainerClient", () => {
  describe("logs", () => {
    it("should destroy the Docker stream when the consumer closes the log stream", async () => {
      const actualLogStream = new PassThrough();
      const demuxStream = vi.fn();
      const container = {
        id: "container-id",
        logs: vi.fn(async () => actualLogStream),
      };
      const dockerode = {
        modem: { demuxStream },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
      const client = new DockerContainerClient(dockerode);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stream = await client.logs(container as any);
      await vi.waitFor(() => expect(demuxStream).toHaveBeenCalledOnce());
      stream.destroy();

      await vi.waitFor(() => expect(actualLogStream.destroyed).toBe(true));
    });
  });

  describe("exec", () => {
    it("should not truncate output when the demuxed streams flush after the raw stream ends", async () => {
      const payload = "the-final-line-that-must-not-be-truncated\n";

      const rawStream = new PassThrough();

      const exec = {
        start: vi.fn(async () => {
          process.nextTick(() => {
            rawStream.write(payload);
            rawStream.end();
          });
          return rawStream;
        }),
        inspect: vi.fn(async () => ({ ExitCode: 0 })),
      };

      const container = {
        id: "container-id",
        exec: vi.fn(async () => exec),
      };

      const dockerode = {
        modem: {
          demuxStream: (raw: Readable, stdout: PassThrough) => {
            stdout.cork();
            raw.on("data", (chunk) => stdout.write(chunk));
            setImmediate(() => stdout.uncork());
          },
        },
        // biome-ignore lint/suspicious/noExplicitAny: partial dockerode stub for this test
      } as any;

      const client = new DockerContainerClient(dockerode);

      // biome-ignore lint/suspicious/noExplicitAny: partial container stub for this test
      const result = await client.exec(container as any, ["echo", "hi"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe(payload);
      expect(result.output).toBe(payload);
    });
  });
});
