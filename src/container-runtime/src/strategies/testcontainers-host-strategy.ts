import { getContainerRuntimeConfig } from "./utils/config";
import { DockerOptions } from "dockerode";
import { URL } from "url";
import { AbstractContainerRuntimeClientStrategy } from "./strategy";
import { ContainerRuntimeClientStrategyResult } from "./types";

export class TestcontainersHostStrategy extends AbstractContainerRuntimeClientStrategy {
  getName(): string {
    return "TestcontainersHostStrategy";
  }

  async getResult(): Promise<ContainerRuntimeClientStrategyResult | undefined> {
    const { tcHost } = await getContainerRuntimeConfig();

    if (!tcHost) {
      return;
    }

    const dockerOptions: DockerOptions = {};

    const { hostname, port } = new URL(tcHost);
    dockerOptions.host = hostname;
    dockerOptions.port = port;

    return {
      uri: tcHost,
      dockerOptions,
      composeEnvironment: {
        DOCKER_HOST: tcHost,
      },
      allowUserOverrides: false,
    };
  }
}
