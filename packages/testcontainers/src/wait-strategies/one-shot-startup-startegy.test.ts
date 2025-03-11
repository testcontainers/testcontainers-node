import { GenericContainer } from "../generic-container/generic-container";
import { Wait } from "./wait";

describe("OneShotStartupCheckStrategy", { timeout: 180_000 }, () => {
  it("should wait for container to finish", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withCommand(["/bin/sh", "-c", 'sleep 2; echo "Ready"'])
      .withWaitStrategy(Wait.forOneShotStartup())
      .start();

    await container.stop();
  });

  it("should fail if container did not finish succesfully", async () => {
    await expect(() =>
      new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withCommand(["/bin/sh", "-c", "not-existing"])
        .withWaitStrategy(Wait.forOneShotStartup())
        .start()
    ).rejects.toThrow("Container failed to start for");
  });
});
