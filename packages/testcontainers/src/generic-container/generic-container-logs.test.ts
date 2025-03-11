import { containerLog } from "../common";
import { Wait } from "../wait-strategies/wait";
import { GenericContainer } from "./generic-container";

describe("GenericContainer logs", { timeout: 180_000 }, () => {
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

  it("should stream logs with since option from a started container", async () => {
    const pauseMs = 5 * 1000;
    const logBeforeSleep = "first";
    const logAfterSleep = "second";
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withEntrypoint([
        "/bin/sh",
        "-c",
        `echo ${logBeforeSleep} && sleep ${pauseMs / 1000} && echo ${logAfterSleep} && sleep infinity`,
      ])
      .withWaitStrategy(Wait.forLogMessage(logBeforeSleep))
      .start();

    await new Promise((resolve) => setTimeout(resolve, pauseMs));

    const inSleepTimestamp = new Date().getTime() - pauseMs + 1000;
    const since = Math.floor(inSleepTimestamp / 1000);

    const stream = await container.logs({ since });
    const log: string = await new Promise((resolve) => stream.on("data", (line) => resolve(line.trim())));

    expect(log).toBe(logAfterSleep);

    await container.stop();
  });

  it("should stream logs from a running container after restart", async () => {
    const containerLogTraceSpy = vi.spyOn(containerLog, "trace");
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14").withExposedPorts(8080).start();

    await container.restart();

    const logs = containerLogTraceSpy.mock.calls;
    expect(logs.some((line) => line.includes("Listening on port 8080"))).toBe(true);

    await container.stop();
  });
});
