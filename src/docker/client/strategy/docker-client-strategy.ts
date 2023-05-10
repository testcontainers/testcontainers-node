import { DockerClientStrategyResult } from "../docker-client";

export interface DockerClientStrategy {
  init?(): Promise<void>;

  isApplicable(): boolean;

  getDockerClient(): Promise<DockerClientStrategyResult>;

  getName(): string;
}
