import { DockerClientStrategyResult } from "../docker-client-types";

export interface DockerClientStrategy {
  init?(): Promise<void>;

  isApplicable(): boolean;

  getDockerClient(): Promise<DockerClientStrategyResult>;

  getName(): string;
}
