import { getContainerRuntimeClient } from "./client";

describe("ContainerRuntimeClient", () => {
  it("should detect the container runtime", async () => {
    const client = await getContainerRuntimeClient();

    expect(client.info.containerRuntime.name).toBe(process.env.CI_PODMAN ? "podman" : "docker");
  });
});
