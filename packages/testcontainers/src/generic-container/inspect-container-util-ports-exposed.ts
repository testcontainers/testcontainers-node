import type { ContainerInspectInfo } from "dockerode";
import { log, poll } from "../common";

export async function inspectContainerUntilPortsExposed(
  inspectFn: (signal: AbortSignal) => Promise<ContainerInspectInfo>,
  containerId: string,
  timeout = 30_000
): Promise<ContainerInspectInfo> {
  try {
    return await poll(({ signal }) => inspectFn(signal), {
      until: (inspectResult) => {
        const portBindings = inspectResult?.HostConfig?.PortBindings;
        if (!portBindings) return true;
        const expectedlyBoundPorts = Object.keys(portBindings);
        return expectedlyBoundPorts.every(
          (exposedPort) => inspectResult.NetworkSettings.Ports[exposedPort]?.length > 0
        );
      },
      intervalMs: 250,
      timeoutMs: timeout,
      timeoutMessage: `Timed out after ${timeout}ms while waiting for container ports to be bound to the host`,
      retryOnError: false,
    });
  } catch (err) {
    log.error(`${err}`, { containerId });
    throw err;
  }
}
