import type Dockerode from "dockerode";
import { log, poll } from "../common";
import { getContainerRuntimeClient } from "../container-runtime";
import type { BoundPorts } from "../utils/bound-ports";
import { HostPortCheck, InternalPortCheck, type PortCheck } from "./utils/port-check";
import { AbstractWaitStrategy } from "./wait-strategy";

export class HostPortWaitStrategy extends AbstractWaitStrategy {
  public async waitUntilReady(
    container: Dockerode.Container,
    boundPorts: BoundPorts,
    _startTime?: Date,
    startupSignal?: AbortSignal
  ): Promise<void> {
    const client = await getContainerRuntimeClient();
    const hostPortCheck = new HostPortCheck(client);
    const internalPortCheck = new InternalPortCheck(client, container);

    await Promise.all([
      this.waitForHostPorts(hostPortCheck, container, boundPorts, startupSignal),
      this.waitForInternalPorts(internalPortCheck, container, boundPorts, startupSignal),
    ]);
  }

  private async waitForHostPorts(
    portCheck: PortCheck,
    container: Dockerode.Container,
    boundPorts: BoundPorts,
    startupSignal?: AbortSignal
  ): Promise<void> {
    for (const [portKey, hostPort] of boundPorts.iterator()) {
      if (portKey.toLowerCase().endsWith("/udp")) {
        log.debug(`Skipping wait for host port ${hostPort} (mapped from UDP port ${portKey})`, {
          containerId: container.id,
        });
        continue;
      }
      log.debug(`Waiting for host port ${hostPort}...`, { containerId: container.id });
      await this.waitForPort(hostPort, portCheck, startupSignal);
      log.debug(`Host port ${hostPort} ready`, { containerId: container.id });
    }
    log.debug(`Host port wait strategy complete`, { containerId: container.id });
  }

  private async waitForInternalPorts(
    portCheck: PortCheck,
    container: Dockerode.Container,
    boundPorts: BoundPorts,
    startupSignal?: AbortSignal
  ): Promise<void> {
    for (const [internalPort] of boundPorts.iterator()) {
      if (internalPort.toLowerCase().endsWith("/udp")) {
        log.debug(`Skipping wait for internal UDP port ${internalPort}`, {
          containerId: container.id,
        });
        continue;
      }
      log.debug(`Waiting for internal port ${internalPort}...`, { containerId: container.id });
      await this.waitForPort(internalPort, portCheck, startupSignal);
      log.debug(`Internal port ${internalPort} ready`, { containerId: container.id });
    }
    log.debug(`Internal port wait strategy complete`, { containerId: container.id });
  }

  private async waitForPort(port: number | string, portCheck: PortCheck, startupSignal?: AbortSignal): Promise<void> {
    await poll(({ signal }) => portCheck.isBound(port, signal), {
      until: (isBound) => isBound,
      intervalMs: 100,
      timeoutMs: this.startupTimeoutMs,
      timeoutMessage: `Port ${port} not bound after ${this.startupTimeoutMs}ms`,
      retryOnError: false,
      signal: startupSignal,
    });
  }
}
