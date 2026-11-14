import { PassThrough, type Readable } from "node:stream";
import type Dockerode from "dockerode";
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
      } as unknown as Dockerode;
      const client = new DockerContainerClient(dockerode);

      const stream = await client.logs(container as unknown as Dockerode.Container);
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
      } as unknown as Dockerode;

      const client = new DockerContainerClient(dockerode);

      const result = await client.exec(container as unknown as Dockerode.Container, ["echo", "hi"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe(payload);
      expect(result.output).toBe(payload);
    });

    it("should reject and destroy the Docker stream when the signal aborts", async () => {
      const rawStream = new PassThrough();
      let started = false;
      const exec = {
        start: async () => {
          started = true;
          return rawStream;
        },
        inspect: async () => ({ ExitCode: 0 }),
      };
      const container = { id: "container-id", exec: async () => exec };
      const dockerode = { modem: { demuxStream: () => {} } } as unknown as Dockerode;
      const client = new DockerContainerClient(dockerode);
      const controller = new AbortController();

      const result = client.exec(container as unknown as Dockerode.Container, ["sleep", "30"], {
        signal: controller.signal,
      });
      await vi.waitFor(() => expect(started).toBe(true));
      controller.abort(new Error("aborted"));

      await expect(result).rejects.toThrow("aborted");
      expect(rawStream.destroyed).toBe(true);
    });

    it("should not create an exec when the signal has already aborted", async () => {
      let created = false;
      const container = {
        id: "container-id",
        exec: async () => {
          created = true;
          return {
            start: async () => new PassThrough().end(),
            inspect: async () => ({ ExitCode: 0 }),
          };
        },
      };
      const dockerode = { modem: { demuxStream: () => {} } } as unknown as Dockerode;
      const client = new DockerContainerClient(dockerode);

      await expect(
        client.exec(container as unknown as Dockerode.Container, ["echo", "hi"], {
          signal: AbortSignal.abort(new Error("aborted")),
        })
      ).rejects.toThrow("aborted");
      expect(created).toBe(false);
    });
  });

  describe("inspect", () => {
    it("should reject when the signal aborts", async () => {
      const container = {
        id: "container-id",
        inspect: (opts?: { abortSignal?: AbortSignal }) =>
          new Promise((_, reject) => {
            opts?.abortSignal?.addEventListener("abort", () => reject(opts.abortSignal?.reason));
          }),
      };
      const client = new DockerContainerClient({} as Dockerode);
      const controller = new AbortController();

      const result = client.inspect(container as unknown as Dockerode.Container, { signal: controller.signal });
      controller.abort(new Error("aborted"));

      await expect(result).rejects.toThrow("aborted");
    });
  });
});
