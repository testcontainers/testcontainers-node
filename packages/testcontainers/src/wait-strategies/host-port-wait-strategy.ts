import type Dockerode from "dockerode";
import { IntervalRetry, log } from "../common";
import { getContainerRuntimeClient } from "../container-runtime";
import type { BoundPorts } from "../utils/bound-ports";
import { getContainerPort, getProtocol, type PortWithOptionalBinding } from "../utils/port";
import { HostPortCheck, InternalPortCheck, type PortCheck } from "./utils/port-check";
import { AbstractWaitStrategy } from "./wait-strategy";

export class HostPortWaitStrategy extends AbstractWaitStrategy {
  constructor(private readonly ports: PortWithOptionalBinding[] = []) {
    super();
  }

  public async waitUntilReady(container: Dockerode.Container, boundPorts: BoundPorts): Promise<void> {
    const portsToCheck = this.selectPorts(boundPorts);
    const client = await getContainerRuntimeClient();
    const hostPortCheck = new HostPortCheck(client);
    const internalPortCheck = new InternalPortCheck(client, container);

    await Promise.all([
      this.waitForHostPorts(hostPortCheck, container, portsToCheck),
      this.waitForInternalPorts(internalPortCheck, container, portsToCheck),
    ]);
  }

  private selectPorts(boundPorts: BoundPorts): BoundPorts {
    if (this.ports.length === 0) {
      return boundPorts;
    }
    // getBinding throws for a port that was never exposed, which filter would silently drop
    for (const port of this.ports) {
      boundPorts.getBinding(getContainerPort(port), getProtocol(port));
    }
    return boundPorts.filter(this.ports);
  }

  private async waitForHostPorts(
    portCheck: PortCheck,
    container: Dockerode.Container,
    boundPorts: BoundPorts
  ): Promise<void> {
    for (const [portKey, hostPort] of boundPorts.iterator()) {
      if (portKey.toLowerCase().endsWith("/udp")) {
        log.debug(`Skipping wait for host port ${hostPort} (mapped from UDP port ${portKey})`, {
          containerId: container.id,
        });
        continue;
      }
      log.debug(`Waiting for host port ${hostPort}...`, { containerId: container.id });
      await this.waitForPort(container, hostPort, portCheck);
      log.debug(`Host port ${hostPort} ready`, { containerId: container.id });
    }
    log.debug(`Host port wait strategy complete`, { containerId: container.id });
  }

  private async waitForInternalPorts(
    portCheck: PortCheck,
    container: Dockerode.Container,
    boundPorts: BoundPorts
  ): Promise<void> {
    for (const [internalPort] of boundPorts.iterator()) {
      if (internalPort.toLowerCase().endsWith("/udp")) {
        log.debug(`Skipping wait for internal UDP port ${internalPort}`, {
          containerId: container.id,
        });
        continue;
      }
      log.debug(`Waiting for internal port ${internalPort}...`, { containerId: container.id });
      await this.waitForPort(container, internalPort, portCheck);
      log.debug(`Internal port ${internalPort} ready`, { containerId: container.id });
    }
    log.debug(`Internal port wait strategy complete`, { containerId: container.id });
  }

  private async waitForPort(
    container: Dockerode.Container,
    port: number | string,
    portCheck: PortCheck
  ): Promise<void> {
    await new IntervalRetry<boolean, Error>(100).retryUntil(
      () => portCheck.isBound(port),
      (isBound) => isBound,
      () => {
        const message = `Port ${port} not bound after ${this.startupTimeoutMs}ms`;
        log.error(message, { containerId: container.id });
        throw new Error(message);
      },
      this.startupTimeoutMs
    );
  }
}
