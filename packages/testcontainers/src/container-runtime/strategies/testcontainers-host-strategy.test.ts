import { TestcontainersHostStrategy } from "./testcontainers-host-strategy";

const mockGetContainerRuntimeConfig = vi.fn();
vi.mock("./utils/config", () => ({
  getContainerRuntimeConfig: () => mockGetContainerRuntimeConfig(),
}));

describe("TestcontainersHostStrategy", { concurrent: false }, () => {
  it("should not apply when tc.host property is not set", async () => {
    mockGetContainerRuntimeConfig.mockResolvedValue({});

    const strategy = new TestcontainersHostStrategy();
    const result = await strategy.getResult();

    expect(result).toEqual({ notApplicable: "tc.host is not set in ~/.testcontainers.properties" });
  });

  it("should apply when tc.host property is set", async () => {
    mockGetContainerRuntimeConfig.mockResolvedValue({ tcHost: "tcp://tc:2375" });

    const strategy = new TestcontainersHostStrategy();
    const result = await strategy.getResult();

    expect(result).not.toHaveProperty("notApplicable");
  });

  it("should return relevant fields", async () => {
    mockGetContainerRuntimeConfig.mockResolvedValue({ tcHost: "tcp://tc:2375" });

    const strategy = new TestcontainersHostStrategy();
    const result = await strategy.getResult();
    assert(!("notApplicable" in result));

    expect(result.uri).toEqual("tcp://tc:2375");
    expect(result.composeEnvironment).toEqual({ DOCKER_HOST: "tcp://tc:2375" });
    expect(result.allowUserOverrides).toBe(false);
  });
});
