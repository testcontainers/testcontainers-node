import { DockerClientInit } from "../docker-client";

export interface DockerClientStrategy {
  init?(): Promise<void>;

  isApplicable(): boolean;

  getDockerClient(): Promise<DockerClientInit>;

  getName(): string;
}
