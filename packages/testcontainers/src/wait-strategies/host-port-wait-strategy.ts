import Dockerode from "dockerode";
import { IntervalRetry, log } from "../common";
import { getContainerRuntimeClient } from "../container-runtime";
import { BoundPorts } from "../utils/bound-ports";
import { HostPortCheck, InternalPortCheck, PortCheck } from "./utils/port-check";
import { AbstractWaitStrategy } from "./wait-strategy";

export class HostPortWaitStrategy extends AbstractWaitStrategy {
  public async waitUntilReady(container: Dockerode.Container, boundPorts: BoundPorts): Promise<void> {
    const client = await getContainerRuntimeClient();
    const hostPortCheck = new HostPortCheck(client);
    const internalPortCheck = new InternalPortCheck(client, container);

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
    for (const [portKey, hostPort] of boundPorts.iterator()) {
      if (portKey.toLowerCase().includes("/udp")) {
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
      if (typeof internalPort === "string" && internalPort.toLowerCase().includes("/udp")) {
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
    // Skip waiting for UDP ports
    if (typeof port === "string" && port.toLowerCase().includes("/udp")) {
      log.debug(`Skipping wait for UDP port ${port} (UDP port checks not supported)`, { containerId: container.id });
      return;
    }

    log.debug(`Checking availability for port: ${port}`);

    try {
      await new IntervalRetry<boolean, Error>(100).retryUntil(
        () => {
          console.log(`Checking if port ${port} is bound...`);
          return portCheck.isBound(port);
        },
        (isBound) => {
          if (isBound) {
            console.log(`Port ${port} is now bound!`);
          }
          return isBound;
        },
        () => {
          const message = `Port ${port} not bound after ${this.startupTimeoutMs}ms`;
          console.log(`TIMEOUT: ${message}`);
          log.error(message, { containerId: container.id });
          throw new Error(message);
        },
        this.startupTimeoutMs
      );
    } catch (err) {
      log.error(`Error checking port ${port} with error ${err}`);
      throw err;
    }
  }
}
