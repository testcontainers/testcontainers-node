import { DockerodeClientFactory } from "./docker-client-factory";
import { FakeFileHelper } from "./file-helper";

describe("DockerClientFactory", () => {
  it("should set hostname to localhost", async () => {
    const factory = new DockerodeClientFactory({}, new FakeFileHelper(false));
    await expect(factory.getHost()).resolves.toBe("localhost");
  });

  it("should set hostname to default gateway if running inside a container", async () => {
    const factory = new DockerodeClientFactory({}, new FakeFileHelper(true));
    await expect(factory.getHost()).resolves.toBe("172.17.0.1");
  });

  it("should set hostname to the host in the DOCKER_HOST env variable", async () => {
    const factory = new DockerodeClientFactory({ DOCKER_HOST: "http://another-host:443" }, new FakeFileHelper(false));
    await expect(factory.getHost()).resolves.toBe("another-host");
  });
});
