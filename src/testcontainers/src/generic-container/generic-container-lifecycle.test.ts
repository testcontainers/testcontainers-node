import { AbstractStartedContainer, GenericContainer, InspectResult, StartedTestContainer } from "../index";

describe("GenericContainer lifecycle", () => {
  jest.setTimeout(180_000);

  let beforeContainerCreated: jest.Func;
  let containerCreated: jest.Func;
  let containerStarting: jest.Func;
  let containerStarted: jest.Func;
  let containerStopping: jest.Func;
  let containerStopped: jest.Func;

  beforeEach(() => {
    beforeContainerCreated = jest.fn();
    containerCreated = jest.fn();
    containerStarting = jest.fn();
    containerStarted = jest.fn();
    containerStopping = jest.fn();
    containerStopped = jest.fn();
  });

  it("should call lifecycle callbacks for a non-reused, custom started generic container", async () => {
    const container = await new CustomContainerWithCustomStartedContainer("cristianrgreco/testcontainer:1.1.14")
      .withExposedPorts(8080)
      .start();

    expect(beforeContainerCreated).toHaveBeenCalled();
    expect(containerCreated).toHaveBeenCalledWith(container.getId());
    expect(containerStarting).toHaveBeenCalledWith(false);
    expect(containerStarted).toHaveBeenCalledWith(false);

    await container.stop();
    expect(containerStopping).toHaveBeenCalled();
    expect(containerStopped).toHaveBeenCalled();
  });

  it("should call lifecycle callbacks for a reused, custom generic container", async () => {
    const container1 = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withExposedPorts(8080)
      .withReuse()
      .start();
    const container2 = await new CustomContainer("cristianrgreco/testcontainer:1.1.14")
      .withExposedPorts(8080)
      .withReuse()
      .start();

    expect(container1.getId()).toEqual(container2.getId());
    expect(beforeContainerCreated).toHaveBeenCalled();
    expect(containerCreated).not.toHaveBeenCalled();
    expect(containerStarting).toHaveBeenCalledWith(true);
    expect(containerStarted).toHaveBeenCalledWith(true);

    await container1.stop();
  });

  class CustomContainer extends GenericContainer {
    protected override async beforeContainerCreated(): Promise<void> {
      beforeContainerCreated();
    }

    protected override async containerCreated(containerId: string): Promise<void> {
      containerCreated(containerId);
    }

    protected override async containerStarting(inspectResult: InspectResult, reused: boolean): Promise<void> {
      containerStarting(reused);
    }

    protected override async containerStarted(
      container: StartedTestContainer,
      inspectResult: InspectResult,
      reused: boolean
    ): Promise<void> {
      containerStarted(reused);
    }
  }

  class CustomContainerWithCustomStartedContainer extends CustomContainer {
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
