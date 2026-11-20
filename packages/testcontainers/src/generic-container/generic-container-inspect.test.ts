import { getContainerRuntimeClient } from "../container-runtime";
import { AbstractStartedContainer } from "./abstract-started-container";
import { GenericContainer } from "./generic-container";

describe("GenericContainer inspect", { timeout: 180_000 }, () => {
  it("should inspect a running container", async () => {
    await using container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withExposedPorts(8080)
      .withLabels({ purpose: "inspect" })
      .start();

    const inspectResult = await container.inspect();

    expect(inspectResult.name).toBe(container.getName());
    expect(inspectResult.labels.purpose).toBe("inspect");
    expect(inspectResult.state).toMatchObject({ status: "running", running: true });
    expect(await container.isRunning()).toBe(true);
    expect(await container.getExitCode()).toBeUndefined();
  });

  it("should report the current state after the container is killed", async () => {
    await using container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withExposedPorts(8080)
      .start();
    const client = await getContainerRuntimeClient();

    await client.container.getById(container.getId()).kill({ signal: "SIGKILL" });

    expect((await container.inspect()).state).toMatchObject({ status: "exited", running: false, exitCode: 137 });
    expect(await container.isRunning()).toBe(false);
    expect(await container.getExitCode()).toBe(137);
  });

  it("should forward inspect, isRunning and getExitCode from an AbstractStartedContainer", async () => {
    await using container = new CustomStartedContainer(
      await new GenericContainer("cristianrgreco/testcontainer:1.1.14").withExposedPorts(8080).start()
    );

    expect((await container.inspect()).state.running).toBe(true);
    expect(await container.isRunning()).toBe(true);
    expect(await container.getExitCode()).toBeUndefined();
  });

  class CustomStartedContainer extends AbstractStartedContainer {}
});
