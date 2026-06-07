import Dockerode from "dockerode";
import { Readable } from "stream";
import { DockerImageClient } from "./docker-image-client";

describe("DockerImageClient", () => {
  const createDockerode = (buildStream: Readable): Dockerode =>
    ({
      buildImage: vi.fn((stream: Readable) => {
        stream.destroy();
        return Promise.resolve(buildStream);
      }),
      modem: {
        followProgress: vi.fn(
          (
            stream: Readable,
            onFinished: (error: Error | null, output: unknown[]) => void,
            onProgress: (event: unknown) => void
          ) => {
            const output: unknown[] = [];
            stream.on("data", (line) => {
              const event = JSON.parse(line.toString());
              output.push(event);
              onProgress(event);
            });
            stream.on("error", (error) => onFinished(error, output));
            stream.on("end", () => onFinished(null, output));
          }
        ),
      },
    }) as unknown as Dockerode;

  it("rejects when the Docker image build cannot start", async () => {
    const dockerode = {
      buildImage: vi.fn((stream: Readable) => {
        stream.destroy();
        return Promise.reject(new Error("build failed"));
      }),
    } as unknown as Dockerode;
    const imageClient = new DockerImageClient(dockerode, "");

    const result = await Promise.race([
      imageClient.build(__dirname, { t: "image" }).then(
        () => "resolved",
        () => "rejected"
      ),
      new Promise((resolve) => setTimeout(() => resolve("timeout"), 100)),
    ]);

    expect(result).toBe("rejected");
  });

  it("rejects when the Docker image build stream errors", async () => {
    const buildStream = new Readable({ read() {} });
    const dockerode = createDockerode(buildStream);
    const imageClient = new DockerImageClient(dockerode, "");
    setTimeout(() => buildStream.destroy(new Error("build failed")), 0);

    const result = await Promise.race([
      imageClient.build(__dirname, { t: "image" }).then(
        () => "resolved",
        () => "rejected"
      ),
      new Promise((resolve) => setTimeout(() => resolve("timeout"), 100)),
    ]);

    expect(result).toBe("rejected");
  });

  it("rejects when the Docker image build progress reports an error", async () => {
    const buildStream = Readable.from([`${JSON.stringify({ errorDetail: { message: "build failed" } })}\n`]);
    const dockerode = createDockerode(buildStream);
    const imageClient = new DockerImageClient(dockerode, "");

    await expect(imageClient.build(__dirname, { t: "image" })).rejects.toThrow("build failed");
  });
});
