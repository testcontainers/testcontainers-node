import { RandomUuid } from "../common";
import { checkContainerIsHealthy } from "../utils/test-helper";
import { GenericContainer } from "./generic-container";

describe("GenericContainer restart", { timeout: 180_000 }, () => {
  it("should restart", async () => {
    await using container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withName(`container-${new RandomUuid().nextUuid()}`)
      .withExposedPorts(8080)
      .start();

    await container.restart();

    await checkContainerIsHealthy(container);
    expect(container.getId()).toStrictEqual(container.getId());
    expect(container.getName()).toStrictEqual(container.getName());
  });

  it("should restart persisting state", async () => {
    await using container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withName(`container-${new RandomUuid().nextUuid()}`)
      .withExposedPorts(8080)
      .start();
    await container.exec(["sh", "-c", "echo 'testconfig' >> config.txt"]);

    await container.restart();

    await checkContainerIsHealthy(container);
    expect((await container.exec(["cat", "config.txt"])).output).toEqual(expect.stringContaining("testconfig"));
  });

  it("should keep streaming logs to the log consumer after restart", async () => {
    const lines: string[] = [];
    await using container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withExposedPorts(8080)
      .withLogConsumer((stream) => stream.on("data", (line) => lines.push(line)))
      .start();
    await vi.waitFor(() => expect(lines.filter((l) => l.includes("Listening on port 8080"))).toHaveLength(1));

    await container.restart();

    await vi.waitFor(() => expect(lines.filter((l) => l.includes("Listening on port 8080"))).toHaveLength(2), {
      timeout: 10_000,
    });
  });
});
