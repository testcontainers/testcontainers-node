import * as dockerCompose from "docker-compose";
import { Duration, TemporalUnit } from "node-duration";
import { BoundPorts } from "./bound-ports";
import { Container } from "./container";
import { ContainerState } from "./container-state";
import { DockerClient } from "./docker-client";
import { DockerodeClientFactory } from "./docker-client-factory";
import { StartedGenericContainer } from "./generic-container";
import log from "./logger";
import { Port } from "./port";
import { HostPortCheck, InternalPortCheck } from "./port-check";
import { HostPortWaitStrategy, WaitStrategy } from "./wait-strategy";

export class DockerComposeEnvironment {
  private startupTimeout: Duration = new Duration(60_000, TemporalUnit.MILLISECONDS);

  constructor(
    private readonly composeFilePath: string,
    private readonly composeFile: string,
    private readonly dockerClient: DockerClient = new DockerodeClientFactory().getClient()
  ) {}

  public async start(): Promise<StartedDockerComposeEnvironment> {
    try {
      const options = { cwd: this.composeFilePath, config: this.composeFile, log: true };
      await dockerCompose.upAll(options);

      const containers = await this.dockerClient.listContainers();
      const dockerComposeContainers = containers.filter(
        container => container.Labels["com.docker.compose.version"] !== undefined
      );

      const startedGenericContainers = await Promise.all(
        dockerComposeContainers.map(async container => {
          const dockerodeContainer = await this.dockerClient.getContainer(container.Id);
          const inspectResult = await dockerodeContainer.inspect();
          const containerState = new ContainerState(inspectResult);
          const boundPorts = new BoundPorts();
          container.Ports.forEach(port => boundPorts.setBinding(port.PrivatePort, port.PublicPort));

          await this.waitForContainer(dockerodeContainer, containerState, boundPorts);

          return new StartedGenericContainer(
            await this.dockerClient.getContainer(container.Id),
            this.dockerClient.getHost(),
            boundPorts,
            container.Names[0].match(/^.*docker-compose_(.*$)/)!![1],
            this.dockerClient
          );
        })
      );

      return new StartedDockerComposeEnvironment(startedGenericContainers);
    } catch ({ err }) {
      throw new Error(err.trim());
    }
  }

  private async waitForContainer(
    container: Container,
    containerState: ContainerState,
    boundPorts: BoundPorts
  ): Promise<void> {
    log.debug("Waiting for container to be ready");
    const waitStrategy = this.getWaitStrategy(container);
    await waitStrategy.withStartupTimeout(this.startupTimeout).waitUntilReady(container, containerState, boundPorts);
    log.info("Container is ready");
  }

  private getWaitStrategy(container: Container): WaitStrategy {
    const hostPortCheck = new HostPortCheck(this.dockerClient.getHost());
    const internalPortCheck = new InternalPortCheck(container, this.dockerClient);
    return new HostPortWaitStrategy(this.dockerClient, hostPortCheck, internalPortCheck);
  }
}

export class StartedDockerComposeEnvironment {
  constructor(private readonly startedGenericContainers: StartedGenericContainer[]) {}

  public getContainerIpAddress(containerName: string) {
    // @ts-ignore
    return this.startedGenericContainers
      .find(container => container.getName() === containerName)
      .getContainerIpAddress();
  }

  public getMappedPort(containerName: string, port: Port): Port {
    // @ts-ignore
    return this.startedGenericContainers.find(container => container.getName() === containerName).getMappedPort(port);
  }
}
