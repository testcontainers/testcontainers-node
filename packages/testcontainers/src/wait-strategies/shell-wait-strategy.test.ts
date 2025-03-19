import { GenericContainer } from "../generic-container/generic-container";
import { Wait } from "./wait";

describe("ShellWaitStrategy", { timeout: 180_000 }, () => {
  it("should wait for successful command", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withCommand(["/bin/sh", "-c", "sleep 0.5; touch /tmp/test.lock; node index.js"])
      .withWaitStrategy(Wait.forSuccessfulCommand("stat /tmp/test.lock"))
      .start();

    await container.stop();
  });

  it("should timeout when command not successful", async () => {
    await expect(() =>
      new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withWaitStrategy(Wait.forSuccessfulCommand("stat /tmp/test.lock"))
        .withStartupTimeout(1000)
        .start()
    ).rejects.toThrowError(`Shell command "stat /tmp/test.lock" not successful`);
  });
});
