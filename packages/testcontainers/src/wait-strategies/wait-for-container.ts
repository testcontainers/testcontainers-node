import type { Container } from "dockerode";
import { log, streamToString } from "../common";
import type { ContainerRuntimeClient } from "../container-runtime";
import type { BoundPorts } from "../utils/bound-ports";
import type { WaitStrategy } from "./wait-strategy";

const LOG_TAIL = 50;

export const waitForContainer = async (
  client: ContainerRuntimeClient,
  container: Container,
  waitStrategy: WaitStrategy,
  boundPorts: BoundPorts,
  startTime?: Date
): Promise<void> => {
  log.debug(`Waiting for container to be ready...`, { containerId: container.id });

  try {
    await waitStrategy.waitUntilReady(container, boundPorts, startTime);
    log.info(`Container is ready`, { containerId: container.id });
  } catch (err) {
    log.error(`Container failed to be ready: ${err}`, { containerId: container.id });
    try {
      await client.container.stop(container, { timeout: 0 });
      await appendContainerLogs(client, container, err, startTime);
      await client.container.remove(container, { removeVolumes: true });
    } catch (stopErr) {
      log.error(`Failed to stop container after it failed to be ready: ${stopErr}`, { containerId: container.id });
    }
    throw err;
  }
};

const appendContainerLogs = async (
  client: ContainerRuntimeClient,
  container: Container,
  err: unknown,
  startTime?: Date
): Promise<void> => {
  if (!(err instanceof Error)) {
    return;
  }

  try {
    const stream = await client.container.logs(container, {
      tail: LOG_TAIL,
      since: startTime ? startTime.getTime() / 1000 : 0,
    });
    const logs = (await streamToString(stream)).trimEnd();

    if (logs.length === 0 || withoutWhitespace(err.message).includes(withoutWhitespace(logs))) {
      return;
    }

    const header = String(err);
    const { stack } = err;
    err.message = `${err.message}\nContainer logs (last ${LOG_TAIL} lines):\n${logs}`;
    if (stack?.startsWith(header)) {
      err.stack = `${err}${stack.slice(header.length)}`;
    }
  } catch (logsErr) {
    log.warn(`Failed to add container logs to the error: ${logsErr}`, { containerId: container.id });
  }
};

const withoutWhitespace = (value: string): string => value.replace(/\s+/g, "");
