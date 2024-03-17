import { GenericContainer } from "../generic-container/generic-container";
import { Wait } from "./wait";
import { checkContainerIsHealthy } from "../utils/test-helper";

jest.setTimeout(180_000);

const mockImageInspect = jest.fn();
jest.mock(
  "dockerode",
  () =>
    function () {
      return {
        getContainer: () => ({
          inspect: mockImageInspect,
        }),
      };
    }
);

describe("OneShotStartupCheckStrategy", () => {
  it("should wait for log", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withExposedPorts(8080)
      .withWaitStrategy(Wait.forOneShotStartup())
      .start();

    await checkContainerIsHealthy(container);

    await container.stop();
  });
});
