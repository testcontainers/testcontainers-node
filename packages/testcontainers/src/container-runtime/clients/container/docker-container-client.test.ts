import { PassThrough, Readable } from "stream";
import { DockerContainerClient } from "./docker-container-client";

describe("DockerContainerClient", () => {
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
