import { ContainerRuntimeClient, getContainerRuntimeClient } from "../container-runtime";
import { RandomPortGenerator } from "../utils/port-generator";

describe("Reaper", { timeout: 120_000 }, () => {
  let client: ContainerRuntimeClient;

  const getReaper = async () => await (await import("./reaper")).getReaper(client);

  beforeEach(async () => {
    vi.resetModules();
    vi.stubEnv("TESTCONTAINERS_RYUK_TEST_LABEL", "true");
    client = await getContainerRuntimeClient();
  });

  it.concurrent("should create disabled reaper when TESTCONTAINERS_RYUK_DISABLED=true", async () => {
    vi.stubEnv("TESTCONTAINERS_RYUK_DISABLED", "true");
    vi.spyOn(client.container, "list").mockResolvedValue([]);

    const reaper = await getReaper();

    expect(() => reaper.addSession("test-session")).not.toThrow();
    expect(() => reaper.addComposeProject("test-project")).not.toThrow();
  });

  it.concurrent("should return cached reaper instance", async () => {
    vi.spyOn(client.container, "list").mockResolvedValue([]);

    const reaper = await getReaper();
    const reaper2 = await getReaper();

    expect(reaper2.containerId).toBe(reaper.containerId);
  });

  it.concurrent("should create new reaper container if one is not running", async () => {
    vi.spyOn(client.container, "list").mockResolvedValue([]);
    const reaper = await getReaper();
    vi.resetModules();

    const reaper2 = await getReaper();

    expect(reaper2.containerId).not.toBe(reaper.containerId);
  });

  it.concurrent("should reuse existing reaper container if one is already running", async () => {
    const reaper = await getReaper();
    vi.resetModules();
    const reaperContainerInfo = (await client.container.list()).filter((c) => c.Id === reaper.containerId)[0];
    reaperContainerInfo.Labels["TESTCONTAINERS_RYUK_TEST_LABEL"] = "false";
    vi.spyOn(client.container, "list").mockResolvedValue([reaperContainerInfo]);

    const reaper2 = await getReaper();

    expect(reaper2.containerId).toBe(reaper.containerId);
  });

  it.concurrent("should use custom port when TESTCONTAINERS_RYUK_PORT is set", async () => {
    const customPort = (await new RandomPortGenerator().generatePort()).toString();
    vi.stubEnv("TESTCONTAINERS_RYUK_PORT", customPort);
    vi.spyOn(client.container, "list").mockResolvedValue([]);

    const reaper = await getReaper();

    const reaperContainer = client.container.getById(reaper.containerId);
    const ports = (await reaperContainer.inspect()).HostConfig.PortBindings;
    const port = ports["8080"] || ports["8080/tcp"];
    expect(port[0].HostPort).toBe(customPort);
  });

  it.concurrent("should create Reaper container without RYUK_VERBOSE env var by default", async () => {
    vi.spyOn(client.container, "list").mockResolvedValue([]);
    const reaper = await getReaper();

    const reaperContainer = client.container.getById(reaper.containerId);
    const reaperContainerEnv = (await reaperContainer.inspect()).Config.Env;
    expect(reaperContainerEnv).not.toContain("RYUK_VERBOSE=true");
    expect(reaperContainerEnv).not.toContain("RYUK_VERBOSE=false");
  });

  it.concurrent("should propagate TESTCONTAINERS_RYUK_VERBOSE into Reaper container", async () => {
    vi.stubEnv("TESTCONTAINERS_RYUK_VERBOSE", "true");
    vi.spyOn(client.container, "list").mockResolvedValue([]);

    const reaper = await getReaper();

    const reaperContainer = client.container.getById(reaper.containerId);
    expect((await reaperContainer.inspect()).Config.Env).toContain("RYUK_VERBOSE=true");
  });
});
