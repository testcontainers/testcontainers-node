import type { Mock } from "vitest";
import { RandomUuid } from "../common";
import {
  AbstractStartedContainer,
  GenericContainer,
  getContainerRuntimeClient,
  type InspectResult,
  type StartedTestContainer,
} from "../index";

describe("GenericContainer lifecycle", { concurrent: false, timeout: 180_000 }, () => {
  let beforeContainerCreated: Mock;
  let containerCreated: Mock;
  let containerStarting: Mock;
  let containerStarted: Mock;
  let containerStopping: Mock;
  let containerStopped: Mock;

  beforeEach(() => {
    beforeContainerCreated = vi.fn();
    containerCreated = vi.fn();
    containerStarting = vi.fn();
    containerStarted = vi.fn();
    containerStopping = vi.fn();
    containerStopped = vi.fn();
  });

  it("should call lifecycle callbacks for a non-reused, generic container", async () => {
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

  it("should not call lifecycle callbacks for a reused, generic container", async () => {
    await using container1 = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
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
    expect(containerStarting).not.toHaveBeenCalled();
    expect(containerStarted).not.toHaveBeenCalled();
  });

  it.each(["containerCreated", "containerStarting", "containerStarted"] as const)(
    "should remove the container when the %s callback fails",
    async (callback) => {
      const containerName = `container-${new RandomUuid().nextUuid()}`;
      ({ containerCreated, containerStarting, containerStarted })[callback].mockImplementation(() => {
        throw new Error(`${callback} failed`);
      });

      await expect(
        new CustomContainer("cristianrgreco/testcontainer:1.1.14")
          .withName(containerName)
          .withExposedPorts(8080)
          .start()
      ).rejects.toThrowError(`${callback} failed`);

      const client = await getContainerRuntimeClient();
      await expect(client.container.getById(containerName).inspect()).rejects.toThrow(/404/);
    }
  );

  it("should not reuse a container when a lifecycle callback failed", async () => {
    const labels = { "failed-start": new RandomUuid().nextUuid() };
    const startContainer = () =>
      new CustomContainer("cristianrgreco/testcontainer:1.1.14")
        .withLabels(labels)
        .withExposedPorts(8080)
        .withReuse()
        .start();
    containerStarted.mockImplementationOnce(() => {
      throw new Error("containerStarted failed");
    });

    await expect(startContainer()).rejects.toThrowError("containerStarted failed");
    await using container = await startContainer();

    expect(container.getId()).not.toEqual(containerCreated.mock.calls[0][0]);
  });

  class CustomContainer extends GenericContainer {
    protected override async beforeContainerCreated(): Promise<void> {
      beforeContainerCreated();
    }

    protected override async containerCreated(containerId: string): Promise<void> {
      containerCreated(containerId);
    }

    protected override async containerStarting(_inspectResult: InspectResult, reused: boolean): Promise<void> {
      containerStarting(reused);
    }

    protected override async containerStarted(
      _container: StartedTestContainer,
      _inspectResult: InspectResult,
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
