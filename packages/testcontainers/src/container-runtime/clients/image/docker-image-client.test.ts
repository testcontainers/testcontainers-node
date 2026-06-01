import Dockerode from "dockerode";
import { Readable } from "stream";
import { DockerImageClient } from "./docker-image-client";

describe("DockerImageClient", () => {
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
    const dockerode = {
      buildImage: vi.fn((stream: Readable) => {
        stream.destroy();
        setTimeout(() => buildStream.destroy(new Error("build failed")), 0);
        return Promise.resolve(buildStream);
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
});
