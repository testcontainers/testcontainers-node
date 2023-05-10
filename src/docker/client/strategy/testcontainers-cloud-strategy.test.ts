import { TestcontainersCloudStrategy } from "./testcontainers-cloud-strategy";

const mockGetDockerClientConfig = jest.fn();
jest.mock("../docker-client-config", () => ({
  getDockerClientConfig: () => mockGetDockerClientConfig(),
}));

describe("TestcontainersCloudStrategy", () => {
  it("should not be applicable when tcc.host property is not set", async () => {
    mockGetDockerClientConfig.mockResolvedValue({});

    const strategy = new TestcontainersCloudStrategy();

    await strategy.init();
    expect(strategy.isApplicable()).toBe(false);
  });

  it("should be applicable when tcc.host property is set", async () => {
    mockGetDockerClientConfig.mockResolvedValue({ testcontainersCloudHost: "tcp://tcc:2375" });

    const strategy = new TestcontainersCloudStrategy();
    await strategy.init();

    expect(strategy.isApplicable()).toBe(true);
  });

  it("should return relevant fields", async () => {
    mockGetDockerClientConfig.mockResolvedValue({ testcontainersCloudHost: "tcp://tcc:2375" });

    const strategy = new TestcontainersCloudStrategy();
    await strategy.init();
    const dockerClient = await strategy.getDockerClient();

    expect(dockerClient.uri).toEqual("tcp://tcc:2375");
    expect(dockerClient.composeEnvironment).toEqual({ DOCKER_HOST: "tcp://tcc:2375" });
    expect(dockerClient.allowUserOverrides).toBe(false);
  });
});
