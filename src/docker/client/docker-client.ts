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
import { ReaperInstance } from "../../reaper";
import { RandomUuid } from "../../uuid";
import { DockerClient, UnitialisedDockerClient } from "./docker-client-types";
import { withFileLock } from "../../file-lock";

let dockerClient: DockerClient;

export async function getDockerClient(): Promise<DockerClient> {
  if (dockerClient) {
    return dockerClient;
  }

  const strategies: DockerClientStrategy[] = [
    new TestcontainersHostStrategy(),
    new ConfigurationStrategy(),
    new UnixSocketStrategy(),
    new RootlessUnixSocketStrategy(),
    new NpipeSocketStrategy(),
  ];

  for (const strategy of strategies) {
    try {
      const uninitDockerClient = await tryToCreateDockerClient(strategy);
      if (uninitDockerClient) {
        logDockerClient(strategy.getName(), uninitDockerClient);

        await withFileLock("tc.lock", async () => {
          const dockerode = new Dockerode(uninitDockerClient.dockerOptions);
          const containers = await dockerode.listContainers();
          const reaperContainer = containers.find(
            (container) => container.Labels["org.testcontainers.ryuk"] === "true"
          );
          const sessionId = reaperContainer?.Labels["org.testcontainers.session-id"] ?? new RandomUuid().nextUuid();

          uninitDockerClient.dockerOptions = {
            ...uninitDockerClient.dockerOptions,
            headers: { "x-tc-sid": sessionId },
          };
          uninitDockerClient.dockerode = new Dockerode(uninitDockerClient.dockerOptions);
          dockerClient = { ...uninitDockerClient, sessionId: sessionId };
          await ReaperInstance.createInstance(dockerClient, sessionId, reaperContainer);
        });

        return dockerClient;
      }
    } catch (err) {
      log.warn(`Docker client strategy "${strategy.getName()}" threw: "${err}"`);
    }
  }

  throw new Error("No Docker client strategy found");
}

async function tryToCreateDockerClient(strategy: DockerClientStrategy): Promise<UnitialisedDockerClient | undefined> {
  if (strategy.init) {
    await strategy.init();
  }

  if (strategy.isApplicable()) {
    const { uri, dockerOptions, composeEnvironment, allowUserOverrides } = await strategy.getDockerClient();

    log.debug(`Testing Docker client strategy "${strategy.getName()}" with URI "${uri}"...`);
    const dockerode = new Dockerode(dockerOptions);
    if (await isDockerDaemonReachable(dockerode)) {
      const info = await getSystemInfo(dockerode);
      const containerRuntime: ContainerRuntime = uri.includes("podman.sock") ? "podman" : "docker";
      const host = await resolveHost(
        dockerode,
        containerRuntime,
        info.dockerInfo.indexServerAddress,
        uri,
        allowUserOverrides
      );
      const hostIps = await lookupHostIps(host);
      return {
        uri,
        containerRuntime,
        host,
        hostIps,
        dockerOptions,
        info,
        composeEnvironment,
        allowUserOverrides,
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

function logDockerClient(strategyName: string, { host, hostIps }: UnitialisedDockerClient) {
  if (!log.enabled()) {
    return;
  }
  const formattedHostIps = hostIps.map((hostIp) => hostIp.address).join(", ");
  log.info(`Docker client strategy "${strategyName}" works, ${host} (${formattedHostIps})`);
}
