import { RandomUuid } from "../common";
import { checkContainerIsHealthy } from "../utils/test-helper";
import { Wait } from "../wait-strategies/wait";
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

  it("should include the container logs since the restart in the error when the restart fails", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withCommand([
        "/bin/sh",
        "-c",
        "if [ -f /tmp/started ]; then echo 'second start'; exit 1; fi; touch /tmp/started; echo 'first start'; sleep infinity",
      ])
      .withWaitStrategy(Wait.forLogMessage("first start"))
      .start();

    await expect(container.restart()).rejects.toThrow(
      new Error(
        'Log stream ended and message "first start" was not received\nContainer logs (last 50 lines):\nsecond start'
      )
    );
  });
});
