import { GenericContainer } from "./generic-container";
import { containerLog } from "../logger";

describe("GenericContainer logs", () => {
  jest.setTimeout(180_000);

  it("should stream logs from a container before start", async () => {
    const line = await new Promise((resolve) => {
      return new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withExposedPorts(8080)
        .withLogConsumer((stream) => stream.on("data", (line) => resolve(line)))
        .start()
        .then((startedContainer) => startedContainer.stop());
    });

    expect(line).toContain("Listening on port 8080");
  });

  it("should stream logs from a started container", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14").withExposedPorts(8080).start();

    const stream = await container.logs();
    const log = await new Promise((resolve) => stream.on("data", (line) => resolve(line)));
    expect(log).toContain("Listening on port 8080");

    await container.stop();
  });

  it("should stream logs from a running container after restart", async () => {
    const containerLogTraceSpy = jest.spyOn(containerLog, "trace");
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14").withExposedPorts(8080).start();

    await container.restart();

    const logs = containerLogTraceSpy.mock.calls;
    expect(logs.some((line) => line.includes("Listening on port 8080"))).toBe(true);

    await container.stop();
  });
});
