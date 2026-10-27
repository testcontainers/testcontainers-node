import { URL } from "node:url";
import type { DockerOptions } from "dockerode";
import type { ContainerRuntimeClientStrategy } from "./strategy";
import type { ContainerRuntimeClientStrategyNotApplicable, ContainerRuntimeClientStrategyResult } from "./types";
import { getContainerRuntimeConfig } from "./utils/config";

export class TestcontainersHostStrategy implements ContainerRuntimeClientStrategy {
  getName(): string {
    return "TestcontainersHostStrategy";
  }

  async getResult(): Promise<ContainerRuntimeClientStrategyResult | ContainerRuntimeClientStrategyNotApplicable> {
    const { tcHost } = await getContainerRuntimeConfig();

    if (!tcHost) {
      return { notApplicable: "tc.host is not set in ~/.testcontainers.properties" };
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
