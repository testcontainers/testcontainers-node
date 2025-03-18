import { ContainerInfo } from "dockerode";
import { Socket } from "net";
import { IntervalRetry, log, RandomUuid, withFileLock } from "../common";
import { ContainerRuntimeClient, ImageName } from "../container-runtime";
import { GenericContainer } from "../generic-container/generic-container";
import { LABEL_TESTCONTAINERS_SESSION_ID } from "../utils/labels";
import { Wait } from "../wait-strategies/wait";

export const REAPER_IMAGE = process.env["RYUK_CONTAINER_IMAGE"]
  ? ImageName.fromString(process.env["RYUK_CONTAINER_IMAGE"]).string
  : ImageName.fromString("testcontainers/ryuk:0.11.0").string;

export interface Reaper {
  sessionId: string;

  addSession(sessionId: string): void;

  addComposeProject(projectName: string): void;
}

let reaper: Reaper;
let sessionId: string;

export async function getReaper(client: ContainerRuntimeClient): Promise<Reaper> {
  if (reaper) {
    return reaper;
  }

  reaper = await withFileLock("testcontainers-node.lock", async () => {
    const reaperContainer = await findReaperContainer(client);
    sessionId = reaperContainer?.Labels["org.testcontainers.session-id"] ?? new RandomUuid().nextUuid();

    if (process.env.TESTCONTAINERS_RYUK_DISABLED === "true") {
      return new DisabledReaper(sessionId);
    } else if (reaperContainer) {
      return await useExistingReaper(reaperContainer, sessionId, client.info.containerRuntime.host);
    } else {
      return await createNewReaper(sessionId, client.info.containerRuntime.remoteSocketPath);
    }
  });

  reaper.addSession(sessionId);
  return reaper;
}

async function findReaperContainer(client: ContainerRuntimeClient): Promise<ContainerInfo | undefined> {
  const containers = await client.container.list();
  return containers.find(
    (container) => container.State === "running" && container.Labels["org.testcontainers.ryuk"] === "true"
  );
}

async function useExistingReaper(reaperContainer: ContainerInfo, sessionId: string, host: string): Promise<Reaper> {
  log.debug(`Reusing existing Reaper for session "${sessionId}"...`);

  const reaperPort = reaperContainer.Ports.find((port) => port.PrivatePort == 8080)?.PublicPort;
  if (!reaperPort) {
    throw new Error("Expected Reaper to map exposed port 8080");
  }

  const socket = await connectToReaperSocket(host, reaperPort, reaperContainer.Id);

  return new RyukReaper(sessionId, socket);
}

async function createNewReaper(sessionId: string, remoteSocketPath: string): Promise<Reaper> {
  log.debug(`Creating new Reaper for session "${sessionId}" with socket path "${remoteSocketPath}"...`);

  const container = new GenericContainer(REAPER_IMAGE)
    .withName(`testcontainers-ryuk-${sessionId}`)
    .withExposedPorts(
      process.env["TESTCONTAINERS_RYUK_PORT"]
        ? { container: 8080, host: parseInt(process.env["TESTCONTAINERS_RYUK_PORT"]) }
        : 8080
    )
    .withBindMounts([{ source: remoteSocketPath, target: "/var/run/docker.sock" }])
    .withLabels({ [LABEL_TESTCONTAINERS_SESSION_ID]: sessionId })
    .withWaitStrategy(Wait.forLogMessage(/.*Started.*/));

  if (process.env.TESTCONTAINERS_RYUK_PRIVILEGED === "true") {
    container.withPrivilegedMode();
  }

  const startedContainer = await container.start();

  const socket = await connectToReaperSocket(
    startedContainer.getHost(),
    startedContainer.getMappedPort(8080),
    startedContainer.getId()
  );

  return new RyukReaper(sessionId, socket);
}

async function connectToReaperSocket(host: string, port: number, containerId: string): Promise<Socket> {
  const retryResult = await new IntervalRetry<Socket | undefined, Error>(1000).retryUntil(
    (attempt) => {
      return new Promise((resolve) => {
        log.debug(`Connecting to Reaper (attempt ${attempt + 1}) on "${host}:${port}"...`, { containerId });
        const socket = new Socket();
        socket
          .unref()
          .on("timeout", () => log.error(`Reaper ${containerId} socket timed out`))
          .on("error", (err) => log.error(`Reaper ${containerId} socket error: ${err}`))
          .on("close", (hadError) => {
            if (hadError) {
              log.error(`Connection to Reaper closed with error`, { containerId });
            } else {
              log.warn(`Connection to Reaper closed`, { containerId });
            }
            resolve(undefined);
          })
          .connect(port, host, () => {
            log.debug(`Connected to Reaper`, { containerId });
            resolve(socket);
          });
      });
    },
    (result) => result !== undefined,
    () => {
      const message = `Failed to connect to Reaper`;
      log.error(message, { containerId });
      return new Error(message);
    },
    4000
  );

  if (retryResult instanceof Socket) {
    return retryResult;
  } else {
    throw retryResult;
  }
}

class RyukReaper implements Reaper {
  constructor(
    public readonly sessionId: string,
    private readonly socket: Socket
  ) {}

  addComposeProject(projectName: string): void {
    this.socket.write(`label=com.docker.compose.project=${projectName}\r\n`);
  }

  addSession(sessionId: string): void {
    this.socket.write(`label=${LABEL_TESTCONTAINERS_SESSION_ID}=${sessionId}\r\n`);
  }
}

class DisabledReaper implements Reaper {
  constructor(public readonly sessionId: string) {}

  addComposeProject(): void {}

  addSession(): void {}
}
