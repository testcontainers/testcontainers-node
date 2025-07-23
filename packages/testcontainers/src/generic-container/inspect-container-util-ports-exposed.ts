import { ContainerInspectInfo } from "dockerode";
import { IntervalRetry, log } from "../common";

export async function inspectContainerUntilPortsExposed(
  inspectFn: () => Promise<ContainerInspectInfo>,
  containerId: string,
  timeout = 10_000
): Promise<ContainerInspectInfo> {
  const result = await new IntervalRetry<ContainerInspectInfo, Error>(250).retryUntil(
    () => inspectFn(),
    (inspectResult) => {
      const portBindings = inspectResult?.HostConfig?.PortBindings;
      console.log(new Date().toISOString(), JSON.stringify(inspectResult, null, 2));
      if (!portBindings) return false;
      const expectedlyBoundPorts = Object.keys(portBindings);
      return expectedlyBoundPorts.every((exposedPort) => inspectResult.NetworkSettings.Ports[exposedPort]?.length > 0);
    },
    () => {
      const message = `Container did not expose all ports after starting`;
      log.error(message, { containerId });
      return new Error(message);
    },
    timeout
  );

  if (result instanceof Error) {
    throw result;
  }

  return result;
}
