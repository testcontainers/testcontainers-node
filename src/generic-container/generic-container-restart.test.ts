import { GenericContainer } from "./generic-container";
import { checkContainerIsHealthy } from "../test-helper";

describe("GenericContainer", () => {
  jest.setTimeout(180_000);

  it("should restart", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withName("restartingContainer")
      .withExposedPorts(8080)
      .start();
    await checkContainerIsHealthy(container);

    await container.restart();
    await checkContainerIsHealthy(container);

    expect(container.getId()).toStrictEqual(container.getId());
    expect(container.getName()).toStrictEqual(container.getName());

    await container.stop();
  });

  it("should restart persisting state", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withName("restartingContainer2")
      .withExposedPorts(8080)
      .start();
    await checkContainerIsHealthy(container);
    await container.exec(["sh", "-c", "echo 'testconfig' >> config.txt"]);

    await container.restart();
    await checkContainerIsHealthy(container);
    const result = await container.exec(["cat", "config.txt"]);

    expect(result.output).toEqual(expect.stringContaining("testconfig"));

    await container.stop();
  });
});
