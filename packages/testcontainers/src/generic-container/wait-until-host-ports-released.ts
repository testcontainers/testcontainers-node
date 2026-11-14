import { IntervalRetry, log } from "../common";
import type { BoundPorts } from "../utils/bound-ports";
import type { PortCheck } from "../wait-strategies/utils/port-check";

export async function waitUntilHostPortsReleased(
  hostPortCheck: PortCheck,
  boundPorts: BoundPorts,
  containerId: string,
  timeout = 30_000
): Promise<void> {
  const tcpHostPorts = Array.from(boundPorts.iterator())
    .filter(([containerPort]) => !containerPort.endsWith("/udp"))
    .map(([, hostPort]) => hostPort);

  await Promise.all(
    tcpHostPorts.map(async (hostPort) => {
      const result = await new IntervalRetry<boolean, Error>(100).retryUntil(
        () => hostPortCheck.isBound(hostPort),
        (isBound) => !isBound,
        () => {
          const message = `Timed out after ${timeout}ms while waiting for host port ${hostPort} to be released`;
          log.error(message, { containerId });
          return new Error(message);
        },
        timeout
      );

      if (result instanceof Error) {
        throw result;
      }
    })
  );
}
