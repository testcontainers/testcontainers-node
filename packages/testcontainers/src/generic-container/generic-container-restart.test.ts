import { RandomUuid } from "../common";
import { checkContainerIsHealthy } from "../utils/test-helper";
import { GenericContainer } from "./generic-container";

describe("GenericContainer restart", { timeout: 180_000 }, () => {
  it("should restart", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withName(`container-${new RandomUuid().nextUuid()}`)
      .withExposedPorts(8080)
      .start();

    await container.restart();

    await checkContainerIsHealthy(container);
    expect(container.getId()).toStrictEqual(container.getId());
    expect(container.getName()).toStrictEqual(container.getName());

    await container.stop();
  });

  it("should restart persisting state", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withName(`container-${new RandomUuid().nextUuid()}`)
      .withExposedPorts(8080)
      .start();
    await container.exec(["sh", "-c", "echo 'testconfig' >> config.txt"]);

    await container.restart();

    await checkContainerIsHealthy(container);
    expect((await container.exec(["cat", "config.txt"])).output).toEqual(expect.stringContaining("testconfig"));
    await container.stop();
  });
});
