import { GenericContainer, AbstractStartedContainer, StartedTestContainer, InspectResult } from "../index";

describe("GenericContainer lifecycle", () => {
  jest.setTimeout(180_000);

  let beforeStart: jest.Func;
  let containerIsCreated: jest.Func;
  let containerIsStarting: jest.Func;
  let containerIsStarted: jest.Func;
  let containerIsStopping: jest.Func;
  let containerIsStopped: jest.Func;

  beforeEach(() => {
    beforeStart = jest.fn();
    containerIsCreated = jest.fn();
    containerIsStarting = jest.fn();
    containerIsStarted = jest.fn();
    containerIsStopping = jest.fn();
    containerIsStopped = jest.fn();
  });

  it("should call lifecycle callbacks for a non-reused, custom started generic container", async () => {
    const container = await new CustomContainerWithCustomStartedContainer("cristianrgreco/testcontainer:1.1.14")
      .withExposedPorts(8080)
      .start();

    expect(beforeStart).toHaveBeenCalled();
    expect(containerIsCreated).toHaveBeenCalledWith(container.getId());
    expect(containerIsStarting).toHaveBeenCalledWith(false);
    expect(containerIsStarted).toHaveBeenCalledWith(false);

    await container.stop();
    expect(containerIsStopping).toHaveBeenCalled();
    expect(containerIsStopped).toHaveBeenCalled();
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
    expect(beforeStart).toHaveBeenCalled();
    expect(containerIsCreated).not.toHaveBeenCalled();
    expect(containerIsStarting).toHaveBeenCalledWith(true);
    expect(containerIsStarted).toHaveBeenCalledWith(true);

    await container1.stop();
  });

  class CustomContainer extends GenericContainer {
    protected override async beforeStart(): Promise<void> {
      beforeStart();
    }

    protected override async containerIsCreated(containerId: string): Promise<void> {
      containerIsCreated(containerId);
    }

    protected override async containerIsStarting(inspectResult: InspectResult, reused: boolean): Promise<void> {
      containerIsStarting(reused);
    }

    protected override async containerIsStarted(
      container: StartedTestContainer,
      inspectResult: InspectResult,
      reused: boolean
    ): Promise<void> {
      containerIsStarted(reused);
    }
  }

  class CustomContainerWithCustomStartedContainer extends CustomContainer {
    public override async start(): Promise<CustomStartedContainer> {
      return new CustomStartedContainer(await super.start());
    }
  }

  class CustomStartedContainer extends AbstractStartedContainer {
    protected override async containerIsStopping(): Promise<void> {
      containerIsStopping();
    }

    protected override async containerIsStopped(): Promise<void> {
      containerIsStopped();
    }
  }
});
