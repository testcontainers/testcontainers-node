import { ContainerRuntimeClient, getContainerRuntimeClient } from "../container-runtime";

describe("Reaper", { timeout: 120_000 }, () => {
  let client: ContainerRuntimeClient;

  const getReaper = async () => await (await import("./reaper")).getReaper(client);

  beforeEach(async () => {
    vi.resetModules();
    vitest.unstubAllEnvs();

    client = await getContainerRuntimeClient();
  });

  it("should create Reaper container without RYUK_VERBOSE env var by default", async () => {
    vi.spyOn(client.container, "list").mockResolvedValue([]);
    const reaper = await getReaper();

    const reaperContainer = client.container.getById(reaper.containerId);
    const reaperContainerEnv = (await reaperContainer.inspect()).Config.Env;
    expect(reaperContainerEnv).not.toContain("RYUK_VERBOSE=true");
    expect(reaperContainerEnv).not.toContain("RYUK_VERBOSE=false");
  });

  it("should propagate TESTCONTAINERS_RYUK_VERBOSE into Reaper container", async () => {
    vitest.stubEnv("TESTCONTAINERS_RYUK_VERBOSE", "true");

    vi.spyOn(client.container, "list").mockResolvedValue([]);
    const reaper = await getReaper();

    const reaperContainer = client.container.getById(reaper.containerId);
    expect((await reaperContainer.inspect()).Config.Env).toContain("RYUK_VERBOSE=true");
  });
});
