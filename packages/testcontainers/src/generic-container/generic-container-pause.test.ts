import { getContainerRuntimeClient } from "../container-runtime";
import { checkContainerIsHealthy } from "../utils/test-helper";
import { GenericContainer } from "./generic-container";

describe("GenericContainer pause, unpause and kill", { timeout: 180_000 }, () => {
  it("should pause and unpause", async () => {
    await using container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withExposedPorts(8080)
      .start();
    const client = await getContainerRuntimeClient();
    const dockerContainer = client.container.getById(container.getId());

    await container.pause();
    expect((await client.container.inspect(dockerContainer)).State.Paused).toBe(true);

    await container.unpause();
    expect((await client.container.inspect(dockerContainer)).State.Paused).toBe(false);
    await checkContainerIsHealthy(container);
  });

  it("should kill with SIGKILL by default", async () => {
    await using container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withExposedPorts(8080)
      .start();
    const client = await getContainerRuntimeClient();

    await container.kill();

    const { State } = await client.container.inspect(client.container.getById(container.getId()));
    expect(State.Running).toBe(false);
    expect(State.ExitCode).toBe(137);
  });

  it("should kill with the given signal", async () => {
    await using container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withExposedPorts(8080)
      .start();
    const client = await getContainerRuntimeClient();
    const events = await client.container.events(client.container.getById(container.getId()), ["kill"]);
    const signal = new Promise<string>((resolve) =>
      events.on("data", (data) => resolve(JSON.parse(data.toString()).Actor.Attributes.signal))
    );

    await container.kill("SIGTERM");

    expect(await signal).toBe("15");
    events.destroy();
  });
});
