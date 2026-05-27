import { ContainerInspectInfo, ImageInspectInfo } from "dockerode";
import { ContainerRuntimeClient } from "../../container-runtime";
import { HealthCheckWaitStrategy } from "../health-check-wait-strategy";
import { HostPortWaitStrategy } from "../host-port-wait-strategy";
import { Wait } from "../wait";
import { selectWaitStrategy } from "./wait-strategy-selector";

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

const imageInspectResultWithPodmanHealthCheck = (): ImageInspectInfo =>
  ({
    HealthCheck: {
      Test: ["CMD-SHELL", "test -f /tmp/ready"],
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

describe("wait strategy selector", () => {
  it("should use an explicitly defined wait strategy", async () => {
    const runtimeClient = client(imageInspectResultWithHealthCheck());
    const waitStrategy = Wait.forLogMessage("ready");

    await expect(
      selectWaitStrategy({
        client: runtimeClient,
        inspectResult: containerInspectResult({
          healthcheck: {
            Test: ["CMD-SHELL", "test -f /tmp/ready"],
          },
        }),
        waitStrategy,
        healthCheck: {
          test: ["CMD-SHELL", "test -f /tmp/ready"],
        },
        imageNames: ["image:latest"],
      })
    ).resolves.toBe(waitStrategy);
    expect(runtimeClient.image.inspect).not.toHaveBeenCalled();
  });

  it("should select a user-configured healthcheck", async () => {
    const runtimeClient = client({} as ImageInspectInfo);

    await expect(
      selectWaitStrategy({
        client: runtimeClient,
        inspectResult: containerInspectResult(),
        healthCheck: {
          test: ["CMD-SHELL", "test -f /tmp/ready"],
        },
        imageNames: ["image:latest"],
      })
    ).resolves.toBeInstanceOf(HealthCheckWaitStrategy);
    expect(runtimeClient.image.inspect).not.toHaveBeenCalled();
  });

  it("should select a healthcheck configured on the container", async () => {
    const runtimeClient = client({} as ImageInspectInfo);

    await expect(
      selectWaitStrategy({
        client: runtimeClient,
        inspectResult: containerInspectResult({
          healthcheck: {
            Test: ["CMD-SHELL", "test -f /tmp/ready"],
          },
        }),
        imageNames: ["image:latest"],
      })
    ).resolves.toBeInstanceOf(HealthCheckWaitStrategy);
    expect(runtimeClient.image.inspect).not.toHaveBeenCalled();
  });

  it("should select a healthcheck when container inspect includes healthcheck status", async () => {
    const runtimeClient = client({} as ImageInspectInfo);

    await expect(
      selectWaitStrategy({
        client: runtimeClient,
        inspectResult: containerInspectResult({ healthcheckStatus: "starting" }),
        imageNames: ["image:latest"],
      })
    ).resolves.toBeInstanceOf(HealthCheckWaitStrategy);
    expect(runtimeClient.image.inspect).not.toHaveBeenCalled();
  });

  it("should select listening ports when no healthcheck is configured", async () => {
    await expect(
      selectWaitStrategy({
        client: client({} as ImageInspectInfo),
        inspectResult: containerInspectResult(),
        imageNames: ["image:latest"],
      })
    ).resolves.toBeInstanceOf(HostPortWaitStrategy);
  });

  it("should select the default wait strategy when no healthcheck is configured", async () => {
    const defaultWaitStrategy = Wait.forLogMessage("ready");

    await expect(
      selectWaitStrategy({
        client: client({} as ImageInspectInfo),
        inspectResult: containerInspectResult(),
        imageNames: ["image:latest"],
        defaultWaitStrategy,
      })
    ).resolves.toBe(defaultWaitStrategy);
  });

  it("should select image healthcheck when container inspect omits healthcheck config", async () => {
    await expect(
      selectWaitStrategy({
        client: client(imageInspectResultWithHealthCheck()),
        inspectResult: containerInspectResult(),
        imageNames: ["image:latest"],
      })
    ).resolves.toBeInstanceOf(HealthCheckWaitStrategy);
  });

  it("should select Podman image healthcheck when container inspect omits healthcheck config", async () => {
    await expect(
      selectWaitStrategy({
        client: client(imageInspectResultWithPodmanHealthCheck()),
        inspectResult: containerInspectResult(),
        imageNames: ["image:latest"],
      })
    ).resolves.toBeInstanceOf(HealthCheckWaitStrategy);
  });

  it("should select listening ports when image inspect fails", async () => {
    await expect(
      selectWaitStrategy({
        client: clientWithImageInspectFailure(),
        inspectResult: containerInspectResult(),
        imageNames: ["image:latest"],
      })
    ).resolves.toBeInstanceOf(HostPortWaitStrategy);
  });

  it("should select listening ports when the container disables image healthchecks", async () => {
    const runtimeClient = client(imageInspectResultWithHealthCheck());

    await expect(
      selectWaitStrategy({
        client: runtimeClient,
        inspectResult: containerInspectResult({ healthcheck: { Test: ["NONE"] } }),
        imageNames: ["image:latest"],
      })
    ).resolves.toBeInstanceOf(HostPortWaitStrategy);
    expect(runtimeClient.image.inspect).not.toHaveBeenCalled();
  });
});
