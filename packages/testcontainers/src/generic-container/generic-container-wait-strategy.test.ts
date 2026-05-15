import { ContainerInspectInfo, ImageInspectInfo } from "dockerode";
import { ContainerRuntimeClient } from "../container-runtime";
import { HealthCheckWaitStrategy } from "../wait-strategies/health-check-wait-strategy";
import { HostPortWaitStrategy } from "../wait-strategies/host-port-wait-strategy";
import { Wait } from "../wait-strategies/wait";
import { WaitStrategy } from "../wait-strategies/wait-strategy";
import { GenericContainer } from "./generic-container";

class TestGenericContainer extends GenericContainer {
  public selectWaitStrategyForTest(
    client: ContainerRuntimeClient,
    inspectResult: ContainerInspectInfo,
    waitStrategy?: WaitStrategy
  ) {
    return this.selectWaitStrategy(client, inspectResult, waitStrategy);
  }
}

type ContainerInspectResultOptions = {
  healthcheck?: { Test: string[] };
  healthcheckStatus?: string;
};

const containerInspectResult = ({
  healthcheck,
  healthcheckStatus,
}: ContainerInspectResultOptions = {}): ContainerInspectInfo =>
  ({
    Config: {
      Hostname: "hostname",
      Image: "image:latest",
      Labels: {},
      Healthcheck: healthcheck,
    },
    State: {
      Status: "running",
      Running: true,
      StartedAt: "2026-05-14T10:00:00.000Z",
      FinishedAt: "0001-01-01T00:00:00.000Z",
      ...(healthcheckStatus === undefined ? {} : { Healthcheck: { Status: healthcheckStatus } }),
    },
    NetworkSettings: {
      Ports: {},
      Networks: {},
    },
  }) as unknown as ContainerInspectInfo;

const imageInspectResultWithHealthCheck = (): ImageInspectInfo =>
  ({
    Config: {
      Healthcheck: {
        Test: ["CMD-SHELL", "test -f /tmp/ready"],
      },
    },
  }) as unknown as ImageInspectInfo;

const client = (imageInspectResult: ImageInspectInfo): ContainerRuntimeClient =>
  ({
    image: {
      inspect: vi.fn().mockResolvedValue(imageInspectResult),
    },
  }) as unknown as ContainerRuntimeClient;

const clientWithImageInspectFailure = (): ContainerRuntimeClient =>
  ({
    image: {
      inspect: vi.fn().mockRejectedValue(new Error("inspect failed")),
    },
  }) as unknown as ContainerRuntimeClient;

describe("GenericContainer default wait strategy", () => {
  it("should use an explicitly defined wait strategy", async () => {
    const runtimeClient = client(imageInspectResultWithHealthCheck());
    const waitStrategy = Wait.forLogMessage("ready");

    await expect(
      new TestGenericContainer("image:latest")
        .withHealthCheck({
          test: ["CMD-SHELL", "test -f /tmp/ready"],
        })
        .selectWaitStrategyForTest(
          runtimeClient,
          containerInspectResult({
            healthcheck: {
              Test: ["CMD-SHELL", "test -f /tmp/ready"],
            },
          }),
          waitStrategy
        )
    ).resolves.toBe(waitStrategy);
    expect(runtimeClient.image.inspect).not.toHaveBeenCalled();
  });

  it("should select a healthcheck configured with withHealthCheck", async () => {
    const runtimeClient = client({} as ImageInspectInfo);

    await expect(
      new TestGenericContainer("image:latest")
        .withHealthCheck({
          test: ["CMD-SHELL", "test -f /tmp/ready"],
        })
        .selectWaitStrategyForTest(runtimeClient, containerInspectResult())
    ).resolves.toBeInstanceOf(HealthCheckWaitStrategy);
    expect(runtimeClient.image.inspect).not.toHaveBeenCalled();
  });

  it("should select a healthcheck configured on the container", async () => {
    const runtimeClient = client({} as ImageInspectInfo);

    await expect(
      new TestGenericContainer("image:latest").selectWaitStrategyForTest(
        runtimeClient,
        containerInspectResult({
          healthcheck: {
            Test: ["CMD-SHELL", "test -f /tmp/ready"],
          },
        })
      )
    ).resolves.toBeInstanceOf(HealthCheckWaitStrategy);
    expect(runtimeClient.image.inspect).not.toHaveBeenCalled();
  });

  it("should select a healthcheck when container inspect includes healthcheck status", async () => {
    const runtimeClient = client({} as ImageInspectInfo);

    await expect(
      new TestGenericContainer("image:latest").selectWaitStrategyForTest(
        runtimeClient,
        containerInspectResult({ healthcheckStatus: "starting" })
      )
    ).resolves.toBeInstanceOf(HealthCheckWaitStrategy);
    expect(runtimeClient.image.inspect).not.toHaveBeenCalled();
  });

  it("should select listening ports when no healthcheck is configured", async () => {
    await expect(
      new TestGenericContainer("image:latest").selectWaitStrategyForTest(
        client({} as ImageInspectInfo),
        containerInspectResult()
      )
    ).resolves.toBeInstanceOf(HostPortWaitStrategy);
  });

  it("should select image healthcheck when container inspect omits healthcheck config", async () => {
    await expect(
      new TestGenericContainer("image:latest").selectWaitStrategyForTest(
        client(imageInspectResultWithHealthCheck()),
        containerInspectResult()
      )
    ).resolves.toBeInstanceOf(HealthCheckWaitStrategy);
  });

  it("should select listening ports when image inspect fails", async () => {
    await expect(
      new TestGenericContainer("image:latest").selectWaitStrategyForTest(
        clientWithImageInspectFailure(),
        containerInspectResult()
      )
    ).resolves.toBeInstanceOf(HostPortWaitStrategy);
  });

  it("should select listening ports when the container disables image healthchecks", async () => {
    const runtimeClient = client(imageInspectResultWithHealthCheck());

    await expect(
      new TestGenericContainer("image:latest").selectWaitStrategyForTest(
        runtimeClient,
        containerInspectResult({ healthcheck: { Test: ["NONE"] } })
      )
    ).resolves.toBeInstanceOf(HostPortWaitStrategy);
    expect(runtimeClient.image.inspect).not.toHaveBeenCalled();
  });
});
