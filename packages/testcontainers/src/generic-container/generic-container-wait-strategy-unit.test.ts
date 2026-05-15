import { ContainerInspectInfo, ImageInspectInfo } from "dockerode";
import { ContainerRuntimeClient } from "../container-runtime";
import { HealthCheckWaitStrategy } from "../wait-strategies/health-check-wait-strategy";
import { HostPortWaitStrategy } from "../wait-strategies/host-port-wait-strategy";
import { GenericContainer } from "./generic-container";

class TestGenericContainer extends GenericContainer {
  public selectWaitStrategyForTest(client: ContainerRuntimeClient, inspectResult: ContainerInspectInfo) {
    return this.selectWaitStrategy(client, inspectResult);
  }
}

const containerInspectResult = (healthcheck?: { Test: string[] }): ContainerInspectInfo =>
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
    },
    NetworkSettings: {
      Ports: {},
      Networks: {},
    },
  }) as unknown as ContainerInspectInfo;

const client = (imageInspectResult: ImageInspectInfo): ContainerRuntimeClient =>
  ({
    image: {
      inspect: vi.fn().mockResolvedValue(imageInspectResult),
    },
  }) as unknown as ContainerRuntimeClient;

describe("GenericContainer wait strategy selection", () => {
  it("should fall back to image health check config when container config does not expose it", async () => {
    const imageInspectResult = {
      Config: {
        Healthcheck: {
          Test: ["CMD-SHELL", "test -f /tmp/ready"],
        },
      },
    } as unknown as ImageInspectInfo;

    await expect(
      new TestGenericContainer("image:latest").selectWaitStrategyForTest(
        client(imageInspectResult),
        containerInspectResult()
      )
    ).resolves.toBeInstanceOf(HealthCheckWaitStrategy);
  });

  it("should not fall back to image health check config when the container disables health checks", async () => {
    const imageInspectResult = {
      Config: {
        Healthcheck: {
          Test: ["CMD-SHELL", "test -f /tmp/ready"],
        },
      },
    } as unknown as ImageInspectInfo;

    await expect(
      new TestGenericContainer("image:latest").selectWaitStrategyForTest(
        client(imageInspectResult),
        containerInspectResult({ Test: ["NONE"] })
      )
    ).resolves.toBeInstanceOf(HostPortWaitStrategy);
  });
});
