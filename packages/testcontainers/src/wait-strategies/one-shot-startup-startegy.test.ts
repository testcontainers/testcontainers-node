import { GenericContainer } from "../generic-container/generic-container";
import { Wait } from "./wait";

jest.setTimeout(180_000);

describe("OneShotStartupCheckStrategy", () => {
  it("should wait for container to finish", async () => {
    const container = await new GenericContainer("hello-world").withWaitStrategy(Wait.forOneShotStartup()).start();

    await container.stop();
  });
});
