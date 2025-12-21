import { Mock } from "vitest";
import { AbstractStartedContainer, GenericContainer } from "../index";

describe.sequential("AbstractStartedContainer", { timeout: 60_000 }, () => {
  let containerStopping: Mock;
  let containerStopped: Mock;

  beforeEach(() => {
    containerStopping = vi.fn();
    containerStopped = vi.fn();
  });

  it("should call overridden lifecycle methods when disposing asynchronously", async () => {
    {
      await using _container = await new CustomContainerWithCustomStartedContainer(
        "cristianrgreco/testcontainer:1.1.14"
      )
        .withExposedPorts(8080)
        .start();
    }

    expect(containerStopping).toHaveBeenCalled();
    expect(containerStopped).toHaveBeenCalled();
  });

  class CustomContainerWithCustomStartedContainer extends GenericContainer {
    public override async start(): Promise<CustomStartedContainer> {
      return new CustomStartedContainer(await super.start());
    }
  }

  class CustomStartedContainer extends AbstractStartedContainer {
    protected override async containerStopping(): Promise<void> {
      containerStopping();
    }

    protected override async containerStopped(): Promise<void> {
      containerStopped();
    }
  }
});
