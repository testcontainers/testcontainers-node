import { randomUUID } from "crypto";
import Dockerode from "dockerode";
import { Readable } from "stream";
import { getAuthConfig } from "../../auth/get-auth-config";
import { ImageName } from "../../image-name";
import { pullImage } from "../../utils/pull-image";
import { DockerImageClient } from "./docker-image-client";

vi.mock("../../auth/get-auth-config", () => ({ getAuthConfig: vi.fn() }));

describe.sequential.each(["client", "helper"])("%s image pull policy", (implementation) => {
  function setup() {
    const inspect = vi.fn().mockResolvedValue({ Id: "local-image" });
    const pull = vi.fn().mockImplementation(async () => Readable.from([]));
    const dockerode = { getImage: () => ({ inspect }), pull } as unknown as Dockerode;
    const client = new DockerImageClient(dockerode, "https://index.docker.io/v1/");
    const imageName = ImageName.fromString(`testcontainers/ryuk:0.14.0-${randomUUID()}`);
    return {
      inspect,
      pull,
      run: (force = false) =>
        implementation === "client"
          ? client.pull(imageName, { force, platform: undefined })
          : pullImage(dockerode, "https://index.docker.io/v1/", { imageName, force }),
    };
  }

  it("uses a local image even when forced pulling is requested", async () => {
    vi.stubEnv("TESTCONTAINERS_PULL_POLICY", "never");
    const { run, pull } = setup();
    await run(true);
    expect(pull).not.toHaveBeenCalled();
    expect(getAuthConfig).not.toHaveBeenCalled();
  });

  it("fails before registry authentication or pulling when the image is missing", async () => {
    vi.stubEnv("TESTCONTAINERS_PULL_POLICY", "never");
    const { run, inspect, pull } = setup();
    inspect.mockRejectedValue(new Error("No such image"));
    await expect(run()).rejects.toThrow(/testcontainers\/ryuk:0.14.0.*TESTCONTAINERS_PULL_POLICY=never/);
    expect(pull).not.toHaveBeenCalled();
    expect(getAuthConfig).not.toHaveBeenCalled();
  });

  it("checks the daemon again if a previously available image disappears", async () => {
    vi.stubEnv("TESTCONTAINERS_PULL_POLICY", "never");
    const { run, inspect, pull } = setup();
    await run();
    inspect.mockRejectedValue(new Error("No such image"));
    await expect(run()).rejects.toThrow("TESTCONTAINERS_PULL_POLICY=never");
    expect(pull).not.toHaveBeenCalled();
    expect(getAuthConfig).not.toHaveBeenCalled();
  });

  it("preserves the inspection failure as the cause", async () => {
    vi.stubEnv("TESTCONTAINERS_PULL_POLICY", "never");
    const { run, inspect, pull } = setup();
    const cause = new Error("Docker permission denied");
    inspect.mockRejectedValue(cause);
    await expect(run()).rejects.toMatchObject({ cause });
    expect(pull).not.toHaveBeenCalled();
    expect(getAuthConfig).not.toHaveBeenCalled();
  });

  it("still pulls missing images by default", async () => {
    vi.stubEnv("TESTCONTAINERS_PULL_POLICY", undefined);
    const { run, inspect, pull } = setup();
    inspect.mockRejectedValue(new Error("No such image"));
    await run();
    expect(pull).toHaveBeenCalledOnce();
    expect(getAuthConfig).toHaveBeenCalledOnce();
  });
});
