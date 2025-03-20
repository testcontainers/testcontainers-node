import { ContainerRuntimeClient, getContainerRuntimeClient } from "../container-runtime";
import { Reaper } from "./reaper";

let getReaperFn: (client: ContainerRuntimeClient) => Promise<Reaper>;

async function mockGetContainerRuntimeClient(realClient: ContainerRuntimeClient) {
  const ContainerRuntimeClient = vi.fn();
  ContainerRuntimeClient.prototype.info = vi.fn();
  vi.spyOn(ContainerRuntimeClient.prototype, "info", "get").mockReturnValue(realClient.info);
  ContainerRuntimeClient.prototype.container = vi.fn();
  ContainerRuntimeClient.prototype.container.list = vi.fn().mockReturnValue([]);
  const getContainerRuntimeClientMock = vi
    .fn(getContainerRuntimeClient)
    .mockImplementation(async () => new ContainerRuntimeClient());
  return getContainerRuntimeClientMock;
}

describe("Reaper", { timeout: 120_000 }, () => {
  beforeEach(async () => {
    // This code will reset global variable `reaper` before each test.
    // The variable is used to store reference to reaper container,
    // it must be 'fresh' instance of reaper before any test is run.
    getReaperFn = (await import("./reaper")).getReaper;
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("should create Reaper container without RYUK_VERBOSE env var by default", async () => {
    const client = await getContainerRuntimeClient();
    const mockGetClientFn = await mockGetContainerRuntimeClient(client);
    const reaper = await getReaperFn(await mockGetClientFn());
    expect(reaper.containerId).toBeTruthy(); // will fail if TESTCONTAINERS_RYUK_DISABLED=true
    const reaperContainer = client.container.getById(reaper.containerId);
    const reaperContainerEnv = (await reaperContainer.inspect()).Config.Env;
    expect(reaperContainerEnv).not.toContain("RYUK_VERBOSE=true");
    expect(reaperContainerEnv).not.toContain("RYUK_VERBOSE=false");
  });

  it("should propagate TESTCONTAINERS_RYUK_VERBOSE into Reaper container", async () => {
    vitest.stubEnv("TESTCONTAINERS_RYUK_VERBOSE", "true");
    try {
      const client = await getContainerRuntimeClient();
      const mockGetClientFn = await mockGetContainerRuntimeClient(client);
      const reaper = await getReaperFn(await mockGetClientFn());
      expect(reaper.containerId).toBeTruthy(); // will fail if TESTCONTAINERS_RYUK_DISABLED=true
      const reaperContainer = client.container.getById(reaper.containerId);
      expect((await reaperContainer.inspect()).Config.Env).toContain("RYUK_VERBOSE=true");
    } finally {
      vitest.unstubAllEnvs();
    }
  });
});
