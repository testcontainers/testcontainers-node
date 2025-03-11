import { TestcontainersHostStrategy } from "./testcontainers-host-strategy";

const mockGetContainerRuntimeConfig = vi.fn();
vi.mock("./utils/config", () => ({
  getContainerRuntimeConfig: () => mockGetContainerRuntimeConfig(),
}));

describe("TestcontainersHostStrategy", () => {
  it("should return undefined when tc.host property is not set", async () => {
    mockGetContainerRuntimeConfig.mockResolvedValue({});

    const strategy = new TestcontainersHostStrategy();
    const result = await strategy.getResult();

    expect(result).toBeUndefined();
  });

  it("should be defined when tc.host property is set", async () => {
    mockGetContainerRuntimeConfig.mockResolvedValue({ tcHost: "tcp://tc:2375" });

    const strategy = new TestcontainersHostStrategy();
    const result = await strategy.getResult();

    expect(result).toBeDefined();
  });

  it("should return relevant fields", async () => {
    mockGetContainerRuntimeConfig.mockResolvedValue({ tcHost: "tcp://tc:2375" });

    const strategy = new TestcontainersHostStrategy();
    const result = await strategy.getResult();

    expect(result?.uri).toEqual("tcp://tc:2375");
    expect(result?.composeEnvironment).toEqual({ DOCKER_HOST: "tcp://tc:2375" });
    expect(result?.allowUserOverrides).toBe(false);
  });
});
