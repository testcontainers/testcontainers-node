import { GenericContainer } from "../generic-container/generic-container";
import { Wait } from "./wait";

describe("CompositeWaitStrategy", { timeout: 180_000 }, () => {
  it("should work with individual timeouts", async () => {
    const container = new GenericContainer("cristianrgreco/testcontainer:1.1.14").withWaitStrategy(
      Wait.forAll([
        Wait.forSuccessfulCommand("exit 1").withStartupTimeout(1000),
        Wait.forSuccessfulCommand("exit 2").withStartupTimeout(100),
      ])
    );

    await expect(container.start()).rejects.toThrowError(`Shell command "exit 2" not successful after 100ms`);
  });

  it("should work with outer timeout where inner strategy times out", async () => {
    const container = new GenericContainer("cristianrgreco/testcontainer:1.1.14").withWaitStrategy(
      Wait.forAll([
        Wait.forSuccessfulCommand("exit 1"),
        Wait.forSuccessfulCommand("exit 2").withStartupTimeout(100),
      ]).withStartupTimeout(1000)
    );

    await expect(container.start()).rejects.toThrowError(`Shell command "exit 2" not successful after 100ms`);
  });

  it("should work with outer timeout where outer strategy times out", async () => {
    const container = new GenericContainer("cristianrgreco/testcontainer:1.1.14").withWaitStrategy(
      Wait.forAll([
        Wait.forSuccessfulCommand("exit 1"),
        Wait.forSuccessfulCommand("exit 2").withStartupTimeout(1000),
      ]).withStartupTimeout(100)
    );

    await expect(container.start()).rejects.toThrowError(`Shell command "exit 1" not successful after 100ms`);
  });

  it("should work with maximum outer timeout", async () => {
    const container = new GenericContainer("cristianrgreco/testcontainer:1.1.14").withWaitStrategy(
      Wait.forAll([
        Wait.forListeningPorts(),
        Wait.forSuccessfulCommand("stat /tmp/never.sock").withStartupTimeout(1000),
      ]).withDeadline(100)
    );

    await expect(container.start()).rejects.toThrowError("Composite wait strategy not successful after 100ms");
  });
});
