import Dockerode from "dockerode";
import { log } from "../../logger";
import { lookupHostIps } from "../lookup-host-ips";
import { getSystemInfo } from "../../system-info";
import { RootlessUnixSocketStrategy } from "./strategy/rootless-unix-socket-strategy";
import { streamToString } from "../../stream-utils";
import { Readable } from "stream";
import { resolveHost } from "../resolve-host";
import { DockerClientStrategy } from "./strategy/docker-client-strategy";
import { ConfigurationStrategy } from "./strategy/configuration-strategy";
import { UnixSocketStrategy } from "./strategy/unix-socket-strategy";
import { NpipeSocketStrategy } from "./strategy/npipe-socket-strategy";
import { ContainerRuntime } from "../types";
import { TestcontainersHostStrategy } from "./strategy/testcontainers-host-strategy";
import { RandomUuid } from "../../uuid";
import { DockerClient, PartialDockerClient } from "./docker-client-types";
import { withFileLock } from "../../file-lock";
import { registerSessionIdForCleanup, startReaper } from "../../reaper";

let dockerClient: DockerClient;

const strategies: DockerClientStrategy[] = [
  new TestcontainersHostStrategy(),
  new ConfigurationStrategy(),
  new UnixSocketStrategy(),
  new RootlessUnixSocketStrategy(),
  new NpipeSocketStrategy(),
];

export async function getDockerClient(): Promise<DockerClient> {
  if (dockerClient) {
    return dockerClient;
  }

  for (const strategy of strategies) {
    try {
      const initialisedDockerClient = await initialiseStrategy(strategy);
      if (!initialisedDockerClient) {
        continue;
      }

      dockerClient = initialisedDockerClient;
      logDockerClient(strategy.getName(), dockerClient);
      return dockerClient;
    } catch (err) {
      log.warn(`Docker client strategy "${strategy.getName()}" threw: "${err}"`);
    }
  }

  throw new Error("No Docker client strategy found");
}

async function initialiseStrategy(strategy: DockerClientStrategy): Promise<DockerClient | undefined> {
  const partialDockerClient = await tryToCreateDockerClient(strategy);
  if (!partialDockerClient) {
    return;
  }

  await withFileLock("tc.lock", async () => {
    const dockerode = new Dockerode(partialDockerClient.dockerOptions);
    const containers = await dockerode.listContainers();
    const reaperContainer = containers.find((container) => container.Labels["org.testcontainers.ryuk"] === "true");
    const sessionId = reaperContainer?.Labels["org.testcontainers.session-id"] ?? new RandomUuid().nextUuid();

    const dockerOptions = { ...partialDockerClient.dockerOptions, headers: { "x-tc-sid": sessionId } };
    dockerClient = {
      ...partialDockerClient,
      sessionId,
      dockerOptions,
      dockerode: new Dockerode(dockerOptions),
    };

    await startReaper(dockerClient, sessionId, reaperContainer);
    await registerSessionIdForCleanup(sessionId);
  });

  return dockerClient;
}

async function tryToCreateDockerClient(strategy: DockerClientStrategy): Promise<PartialDockerClient | undefined> {
  if (strategy.init) {
    await strategy.init();
  }

  if (strategy.isApplicable()) {
    const dockerClientStrategyResult = await strategy.getDockerClient();

    log.debug(`Testing Docker client strategy "${strategy.getName()}" with URI "${dockerClientStrategyResult.uri}"...`);
    const dockerode = new Dockerode(dockerClientStrategyResult.dockerOptions);
    if (await isDockerDaemonReachable(dockerode)) {
      const info = await getSystemInfo(dockerode);
      const containerRuntime: ContainerRuntime = dockerClientStrategyResult.uri.includes("podman.sock")
        ? "podman"
        : "docker";
      const host = await resolveHost(
        dockerode,
        containerRuntime,
        info.dockerInfo.indexServerAddress,
        dockerClientStrategyResult.uri,
        dockerClientStrategyResult.allowUserOverrides
      );
      const hostIps = await lookupHostIps(host);
      return {
        ...dockerClientStrategyResult,
        containerRuntime,
        host,
        hostIps,
        info,
        dockerode,
      };
    } else {
      log.warn(`Docker client strategy "${strategy.getName()}" does not work`);
    }
  }
}

async function isDockerDaemonReachable(dockerode: Dockerode): Promise<boolean> {
  try {
    const response = await dockerode.ping();
    return (await streamToString(Readable.from(response))) === "OK";
  } catch (err) {
    log.warn(`Docker daemon is not reachable: "${err}"`);
    return false;
  }
}

function logDockerClient(strategyName: string, { host, hostIps }: DockerClient) {
  if (!log.enabled()) {
    return;
  }
  const formattedHostIps = hostIps.map((hostIp) => hostIp.address).join(", ");
  log.info(`Docker client strategy "${strategyName}" works, ${host} (${formattedHostIps})`);
}
