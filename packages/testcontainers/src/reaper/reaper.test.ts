import { getContainerRuntimeClient } from "../container-runtime";
import { getReaper } from "./reaper";

// ryuk container is created as global variable
// so it's impossible to test against it in isolation.
// both of this tests work if run manually one after another
// and ensuring that ryuk container does not exist before either test.

describe("Reaper", { timeout: 120_000 }, () => {
  it.skip("should create Reaper container without RYUK_VERBOSE env var by default", async () => {
    const client = await getContainerRuntimeClient();
    const reaper = await getReaper(client);
    const reaperContainer = client.container.getById(reaper.reaperContainerId);
    const reaperContainerEnv = (await reaperContainer.inspect()).Config.Env;
    expect(reaperContainerEnv).not.toContain("RYUK_VERBOSE=true");
    expect(reaperContainerEnv).not.toContain("RYUK_VERBOSE=false");
  });

  it.skip("should propagate TESTCONTAINERS_RYUK_VERBOSE into Reaper container", async () => {
    vitest.stubEnv("TESTCONTAINERS_RYUK_VERBOSE", "true");
    try {
      const client = await getContainerRuntimeClient();
      const reaper = await getReaper(client);
      const reaperContainer = client.container.getById(reaper.reaperContainerId);
      expect((await reaperContainer.inspect()).Config.Env).toContain("RYUK_VERBOSE=true");
    } finally {
      vitest.unstubAllEnvs();
    }
  });
});
