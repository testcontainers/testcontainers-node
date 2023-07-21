import { ContainerRuntimeClient } from "../clients/client";
import { ContainerRuntimeClientStrategyResult } from "./types";
import { ComposeClient, getComposeClient } from "../clients/compose/compose-client";
import { DockerContainerClient } from "../clients/container/docker-container-client";
import { DockerImageClient } from "../clients/image/docker-image-client";
import { DockerNetworkClient } from "../clients/network/docker-network-client";
import { PodmanContainerClient } from "../clients/container/podman-container-client";
import Dockerode from "dockerode";
import { ComposeInfo, ContainerRuntimeInfo, Info, NodeInfo } from "../clients/types";
import { isDefined, isEmptyString } from "@testcontainers/common";

export interface ContainerRuntimeClientStrategy {
  getName(): string;

  initialise(): Promise<ContainerRuntimeClient | undefined>;
}

export abstract class AbstractContainerRuntimeClientStrategy implements ContainerRuntimeClientStrategy {
  abstract getName(): string;

  abstract getResult(): Promise<ContainerRuntimeClientStrategyResult | undefined>;

  async initialise(): Promise<ContainerRuntimeClient | undefined> {
    const result = await this.getResult();

    if (!result) {
      return undefined;
    }

    const dockerode = new Dockerode(result.dockerOptions);

    const composeClient = await getComposeClient(result.composeEnvironment);
    const containerClient = result.uri.includes("podman.sock")
      ? new PodmanContainerClient(dockerode)
      : new DockerContainerClient(dockerode);
    const imageClient = new DockerImageClient(dockerode, "");
    const networkClient = new DockerNetworkClient(dockerode);

    const info = await this.getInfo(dockerode, composeClient);

    return new ContainerRuntimeClient(info, composeClient, containerClient, imageClient, networkClient);
  }

  private async getInfo(dockerode: Dockerode, composeClient: ComposeClient): Promise<Info> {
    const nodeInfo: NodeInfo = {
      version: process.version,
      architecture: process.arch,
      platform: process.platform,
    };

    const dockerodeInfo = await dockerode.info();
    const containerRuntimeInfo: ContainerRuntimeInfo = {
      serverVersion: dockerodeInfo.ServerVersion,
      operatingSystem: dockerodeInfo.OperatingSystem,
      operatingSystemType: dockerodeInfo.OSType,
      architecture: dockerodeInfo.Architecture,
      cpus: dockerodeInfo.NCPU,
      memory: dockerodeInfo.MemTotal,
      indexServerAddress:
        !isDefined(dockerodeInfo.IndexServerAddress) || isEmptyString(dockerodeInfo.IndexServerAddress)
          ? "https://index.docker.io/v1/"
          : dockerodeInfo.IndexServerAddress,
    };

    const composeInfo: ComposeInfo = composeClient.info;
    return { node: nodeInfo, containerRuntime: containerRuntimeInfo, compose: composeInfo };
  }
}
