import { ContainerInspectInfo, ImageInspectInfo } from "dockerode";
import path from "path";
import { randomUuid } from "../common/uuid";
import { ContainerRuntimeClient } from "../container-runtime";
import { checkContainerIsHealthy, getHealthCheckStatus } from "../utils/test-helper";
import { HealthCheckWaitStrategy } from "../wait-strategies/health-check-wait-strategy";
import { HostPortWaitStrategy } from "../wait-strategies/host-port-wait-strategy";
import { Wait } from "../wait-strategies/wait";
import { GenericContainer } from "./generic-container";

const fixtures = path.resolve(__dirname, "..", "..", "fixtures", "docker");

class TestGenericContainer extends GenericContainer {
  public selectWaitStrategyForTest(client: ContainerRuntimeClient, inspectResult: ContainerInspectInfo) {
    return this.selectWaitStrategy(client, inspectResult);
  }
}

const containerInspectResult = (healthcheck?: { Test: string[] }): ContainerInspectInfo =>
  ({
    Config: {
      Hostname: "hostname",
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

describe("GenericContainer default wait strategy", { timeout: 180_000 }, () => {
  it("should select listening ports when no healthcheck is configured", async () => {
    await expect(
      new TestGenericContainer("image:latest").selectWaitStrategyForTest(
        client({} as ImageInspectInfo),
        containerInspectResult()
      )
    ).resolves.toBeInstanceOf(HostPortWaitStrategy);
  });

  it("should select image healthcheck when container inspect omits healthcheck config", async () => {
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

  it("should select listening ports when the container disables image healthchecks", async () => {
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

  it("should wait for a healthcheck configured with withHealthCheck", async () => {
    await using container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withExposedPorts(8080)
      .withCommand(["sh", "-c", "rm -f /tmp/ready; (sleep 4; touch /tmp/ready) & node index.js"])
      .withHealthCheck({
        test: ["CMD-SHELL", "test -f /tmp/ready"],
        interval: 1_000,
        timeout: 1_000,
        retries: 10,
      })
      .start();

    expect(await getHealthCheckStatus(container)).toBe("healthy");
    await checkContainerIsHealthy(container);
  });

  it("should prefer a healthcheck configured with withHealthCheck over an image healthcheck", async () => {
    const context = path.resolve(fixtures, "docker-with-delayed-health-check");
    const genericContainer = await GenericContainer.fromDockerfile(context).build();
    await using container = await genericContainer
      .withExposedPorts(8080)
      .withCommand(["sh", "-c", "rm -f /tmp/ready /tmp/custom-ready; touch /tmp/custom-ready; node index.js"])
      .withHealthCheck({
        test: ["CMD-SHELL", "test -f /tmp/custom-ready"],
        interval: 1_000,
        timeout: 1_000,
        retries: 10,
      })
      .start();

    expect(await getHealthCheckStatus(container)).toBe("healthy");
    await checkContainerIsHealthy(container);
  });

  it("should wait for a healthcheck defined in the image", async () => {
    const context = path.resolve(fixtures, "docker-with-delayed-health-check");
    const genericContainer = await GenericContainer.fromDockerfile(context).build();
    await using container = await genericContainer.withExposedPorts(8080).start();

    expect(await getHealthCheckStatus(container)).toBe("healthy");
    await checkContainerIsHealthy(container);
  });

  it("should use listening ports if the image disables healthcheck", async () => {
    const context = path.resolve(fixtures, "docker-with-disabled-health-check");
    const genericContainer = await GenericContainer.fromDockerfile(context).build();
    await using container = await genericContainer.withExposedPorts(8080).withStartupTimeout(1_000).start();

    await checkContainerIsHealthy(container);
    expect(await getHealthCheckStatus(container)).toBeUndefined();
  });

  it.sequential("should wait for an image healthcheck when reusing a stopped container", async () => {
    vi.stubEnv("TESTCONTAINERS_REUSE_ENABLE", "true");

    const imageName = `localhost/${randomUuid()}:${randomUuid()}`;
    const containerName = `reusable-healthcheck-${randomUuid()}`;
    const context = path.resolve(fixtures, "docker-with-delayed-health-check");
    await GenericContainer.fromDockerfile(context).build(imageName);

    const container1 = await new GenericContainer(imageName)
      .withName(containerName)
      .withExposedPorts(8080)
      .withReuse()
      .start();
    await container1.stop({ remove: false, timeout: 10_000 });

    await using container2 = await new GenericContainer(imageName)
      .withName(containerName)
      .withExposedPorts(8080)
      .withReuse()
      .start();

    expect(container2.getId()).toBe(container1.getId());
    expect(await getHealthCheckStatus(container2)).toBe("healthy");
    await container2.stop({ remove: true });
  });

  it("should use an explicitly defined wait strategy even if image defines healthcheck", async () => {
    const context = path.resolve(fixtures, "docker-with-delayed-health-check");
    const genericContainer = await GenericContainer.fromDockerfile(context).build();
    await using container = await genericContainer
      .withExposedPorts(8080)
      .withWaitStrategy(Wait.forListeningPorts())
      .withStartupTimeout(1_000)
      .start();

    await checkContainerIsHealthy(container);
  });

  it("should use an explicitly defined wait strategy even if withHealthCheck is called", async () => {
    await using container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withExposedPorts(8080)
      .withCommand(["sh", "-c", "rm -f /tmp/ready; (sleep 4; touch /tmp/ready) & node index.js"])
      .withHealthCheck({
        test: ["CMD-SHELL", "test -f /tmp/ready"],
        interval: 1_000,
        timeout: 1_000,
        retries: 10,
      })
      .withWaitStrategy(Wait.forListeningPorts())
      .withStartupTimeout(1_000)
      .start();

    await checkContainerIsHealthy(container);
  });
});
