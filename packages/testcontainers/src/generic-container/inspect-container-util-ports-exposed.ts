import { ContainerInspectInfo } from "dockerode";
import { IntervalRetry, log } from "../common";
import { InspectResult } from "../types";
import { mapInspectResult } from "../utils/map-inspect-result";
import { getContainerPort, PortWithOptionalBinding } from "../utils/port";

type Result = {
  inspectResult: ContainerInspectInfo;
  mappedInspectResult: InspectResult;
};

export async function inspectContainerUntilPortsExposed(
  inspectFn: () => Promise<ContainerInspectInfo>,
  ports: PortWithOptionalBinding[],
  containerId: string,
  timeout = 5000
): Promise<Result> {
  const result = await new IntervalRetry<Result, Error>(100).retryUntil(
    async () => {
      const inspectResult = await inspectFn();
      const mappedInspectResult = mapInspectResult(inspectResult);
      return { inspectResult, mappedInspectResult };
    },
    ({ mappedInspectResult }) =>
      ports
        .map((exposedPort) => getContainerPort(exposedPort))
        .every(
          (exposedPort) =>
            mappedInspectResult.ports[exposedPort].length > 0 &&
            mappedInspectResult.ports[exposedPort].every(({ hostPort }) => hostPort !== undefined)
        ),
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
