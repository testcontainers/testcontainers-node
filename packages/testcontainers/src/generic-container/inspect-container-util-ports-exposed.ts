import type { ContainerInspectInfo } from "dockerode";
import { IntervalRetry, log } from "../common";

export async function inspectContainerUntilPortsExposed(
  inspectFn: () => Promise<ContainerInspectInfo>,
  containerId: string,
  timeout = 30_000
): Promise<ContainerInspectInfo> {
  const result = await new IntervalRetry<ContainerInspectInfo, Error>(250).retryUntil(
    () => inspectFn(),
    (inspectResult) => arePortsBound(inspectResult) || hasExited(inspectResult),
    () => {
      const message = `Timed out after ${timeout}ms while waiting for container ports to be bound to the host`;
      log.error(message, { containerId });
      return new Error(message);
    },
    timeout
  );

  if (result instanceof Error) {
    throw result;
  }

  if (!arePortsBound(result)) {
    const message = `Container exited with code ${result.State.ExitCode} before its ports were bound to the host`;
    log.error(message, { containerId });
    throw new Error(message);
  }

  return result;
}

function arePortsBound(inspectResult: ContainerInspectInfo): boolean {
  const portBindings = inspectResult?.HostConfig?.PortBindings;
  if (!portBindings) return true;
  const expectedlyBoundPorts = Object.keys(portBindings);
  return expectedlyBoundPorts.every((exposedPort) => inspectResult.NetworkSettings.Ports[exposedPort]?.length > 0);
}

function hasExited(inspectResult: ContainerInspectInfo): boolean {
  return inspectResult?.State?.Status === "exited";
}
