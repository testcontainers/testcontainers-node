import { ContainerRuntimeClient, getContainerRuntimeClient } from "../container-runtime";
import { FindReaperContainerFn, Reaper } from "./reaper";

// FindReaperContainerFn is used in each test to intentionally 'fail' to find reaper container.
// Failing this check will trigger re-creation of new reaper container, which is needed for testing.
// Otherwise `getReaperFn` will always get a reference to already running reaper container,
// which is not desired in the context of unit testing.

let getReaperFn: (client: ContainerRuntimeClient, findReaperContainerFn?: FindReaperContainerFn) => Promise<Reaper>;

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
    const reaper = await getReaperFn(client, async () => undefined);
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
      const reaper = await getReaperFn(client, async () => undefined);
      expect(reaper.containerId).toBeTruthy(); // will fail if TESTCONTAINERS_RYUK_DISABLED=true
      const reaperContainer = client.container.getById(reaper.containerId);
      expect((await reaperContainer.inspect()).Config.Env).toContain("RYUK_VERBOSE=true");
    } finally {
      vitest.unstubAllEnvs();
    }
  });
});
