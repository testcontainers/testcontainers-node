import { PortCheck } from "../port-check";
import Dockerode from "dockerode";
import { BoundPorts } from "../bound-ports";
import { log } from "../logger";
import { IntervalRetryStrategy } from "../retry-strategy";
import { AbstractWaitStrategy } from "./wait-strategy";

export class HostPortWaitStrategy extends AbstractWaitStrategy {
  constructor(private readonly hostPortCheck: PortCheck, private readonly internalPortCheck: PortCheck) {
    super();
  }

  public async waitUntilReady(container: Dockerode.Container, host: string, boundPorts: BoundPorts): Promise<void> {
    await Promise.all([this.waitForHostPorts(container, boundPorts), this.waitForInternalPorts(container, boundPorts)]);
  }

  private async waitForHostPorts(container: Dockerode.Container, boundPorts: BoundPorts): Promise<void> {
    for (const [, hostPort] of boundPorts.iterator()) {
      log.debug(`Waiting for host port ${hostPort} for ${container.id}`);
      await this.waitForPort(container, hostPort, this.hostPortCheck);
      log.debug(`Host port ${hostPort} ready for ${container.id}`);
    }
  }

  private async waitForInternalPorts(container: Dockerode.Container, boundPorts: BoundPorts): Promise<void> {
    for (const [internalPort] of boundPorts.iterator()) {
      log.debug(`Waiting for internal port ${internalPort} for ${container.id}`);
      await this.waitForPort(container, internalPort, this.internalPortCheck);
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
