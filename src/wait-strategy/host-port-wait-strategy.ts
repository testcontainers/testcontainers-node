import { HostPortCheck, InternalPortCheck, PortCheck } from "../port-check";
import Dockerode from "dockerode";
import { BoundPorts } from "../bound-ports";
import { log } from "../logger";
import { IntervalRetryStrategy } from "../retry-strategy";
import { AbstractWaitStrategy } from "./wait-strategy";
import { dockerClient } from "../docker/docker-client";

export class HostPortWaitStrategy extends AbstractWaitStrategy {
  public async waitUntilReady(container: Dockerode.Container, boundPorts: BoundPorts): Promise<void> {
    const { dockerode, provider, host } = await dockerClient();
    const hostPortCheck = new HostPortCheck(host);
    const internalPortCheck = new InternalPortCheck(dockerode, provider, container);

    await Promise.all([
      this.waitForHostPorts(hostPortCheck, container, boundPorts),
      this.waitForInternalPorts(internalPortCheck, container, boundPorts),
    ]);
  }

  private async waitForHostPorts(
    portCheck: PortCheck,
    container: Dockerode.Container,
    boundPorts: BoundPorts
  ): Promise<void> {
    for (const [, hostPort] of boundPorts.iterator()) {
      log.debug(`Waiting for host port ${hostPort} for ${container.id}`);
      await this.waitForPort(container, hostPort, portCheck);
      log.debug(`Host port ${hostPort} ready for ${container.id}`);
    }
  }

  private async waitForInternalPorts(
    portCheck: PortCheck,
    container: Dockerode.Container,
    boundPorts: BoundPorts
  ): Promise<void> {
    for (const [internalPort] of boundPorts.iterator()) {
      log.debug(`Waiting for internal port ${internalPort} for ${container.id}`);
      await this.waitForPort(container, internalPort, portCheck);
      log.debug(`Internal port ${internalPort} ready for ${container.id}`);
    }
  }

  private async waitForPort(container: Dockerode.Container, port: number, portCheck: PortCheck): Promise<void> {
    await new IntervalRetryStrategy<boolean, Error>(100).retryUntil(
      () => portCheck.isBound(port),
      (isBound) => isBound,
      () => {
        const timeout = this.startupTimeout;
        throw new Error(`Port ${port} not bound after ${timeout}ms for ${container.id}`);
      },
      this.startupTimeout
    );
  }
}
