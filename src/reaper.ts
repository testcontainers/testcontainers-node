import { Socket } from "net";
import { log } from "./logger";
import { GenericContainer } from "./generic-container/generic-container";
import { REAPER_IMAGE } from "./images";
import { LABEL_TESTCONTAINERS_SESSION_ID } from "./labels";
import { Wait } from "./wait-strategy/wait";
import { IntervalRetryStrategy } from "./retry-strategy";
import { getRemoteDockerUnixSocketPath } from "./docker/remote-docker-unix-socket-path";
import { PartialDockerClient } from "./docker/client/docker-client-types";
import Dockerode from "dockerode";
import { StartedTestContainer } from "./test-container";

const isReaperEnabled = process.env.TESTCONTAINERS_RYUK_DISABLED !== "true";

let reaper: Reaper;

export async function registerSessionIdForCleanup(sessionId: string): Promise<void> {
  if (!reaper) {
    throw new Error("Reaper not started");
  }
  (await reaper).addSession(sessionId);
}

export async function registerComposeProjectForCleanup(project: string): Promise<void> {
  if (!reaper) {
    throw new Error("Reaper not started");
  }
  (await reaper).addProject(project);
}

export async function startReaper(
  dockerClient: PartialDockerClient,
  sessionId: string,
  existingReaperContainer?: Dockerode.ContainerInfo
): Promise<void> {
  reaper = !isReaperEnabled
    ? await createDisabledReaper()
    : existingReaperContainer
    ? await useExistingReaper(dockerClient, sessionId, existingReaperContainer)
    : await createNewReaper(dockerClient, sessionId);
}

async function createDisabledReaper(): Promise<Reaper> {
  return new DisabledReaper();
}

async function useExistingReaper(
  dockerClient: PartialDockerClient,
  sessionId: string,
  reaperContainer: Dockerode.ContainerInfo
): Promise<Reaper> {
  log.debug(`Reusing existing Reaper for session "${sessionId}"...`);
  const reaperPort = getReaperPublicPort(reaperContainer);
  const socket = await connectToReaperSocket(dockerClient.host, reaperPort, sessionId, reaperContainer.Id);
  return new RealReaper(sessionId, socket);
}

function getReaperPublicPort(reaperContainer: Dockerode.ContainerInfo): number {
  const port = reaperContainer.Ports.find((port) => port.PrivatePort == 8080)?.PublicPort;
  if (!port) {
    throw new Error("Expected Reaper to map exposed port 8080");
  }
  return port;
}

async function createNewReaper(dockerClient: PartialDockerClient, sessionId: string): Promise<Reaper> {
  const remoteDockerUnixSocketPath = getRemoteDockerUnixSocketPath(dockerClient);
  log.debug(`Creating new Reaper for session "${sessionId}" with socket path "${remoteDockerUnixSocketPath}"...`);
  const startedContainer = await createAndStartReaperContainer(sessionId, remoteDockerUnixSocketPath);
  const containerId = startedContainer.getId();
  const host = startedContainer.getHost();
  const port = startedContainer.getMappedPort(8080);
  const socket = await connectToReaperSocket(host, port, sessionId, containerId);
  return new RealReaper(sessionId, socket);
}

async function createAndStartReaperContainer(sessionId: string, socketPath: string): Promise<StartedTestContainer> {
  const exposedPort = process.env["TESTCONTAINERS_RYUK_PORT"]
    ? { container: 8080, host: Number(process.env["TESTCONTAINERS_RYUK_PORT"]) }
    : 8080;

  const container = new GenericContainer(REAPER_IMAGE)
    .withName(`testcontainers-ryuk-${sessionId}`)
    .withExposedPorts(exposedPort)
    .withBindMounts([{ source: socketPath, target: "/var/run/docker.sock" }])
    .withWaitStrategy(Wait.forLogMessage(/.+ Started!/));

  if (process.env.TESTCONTAINERS_RYUK_PRIVILEGED === "true") {
    container.withPrivilegedMode();
  }

  return await container.start();
}

async function connectToReaperSocket(
  host: string,
  port: number,
  sessionId: string,
  containerId: string
): Promise<Socket> {
  const retryResult = await new IntervalRetryStrategy<Socket | undefined, Error>(1000).retryUntil(
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

interface Reaper {
  addSession(sessionId: string): void;

  addProject(projectName: string): void;
}

class RealReaper implements Reaper {
  constructor(private readonly sessionId: string, private readonly socket: Socket) {}

  public addSession(sessionId: string): void {
    this.socket.write(`label=${LABEL_TESTCONTAINERS_SESSION_ID}=${sessionId}\r\n`);
  }

  public addProject(projectName: string): void {
    this.socket.write(`label=com.docker.compose.project=${projectName}\r\n`);
  }
}

class DisabledReaper implements Reaper {
  public addSession(): void {
    // noop
  }

  public addProject(): void {
    // noop
  }
}
