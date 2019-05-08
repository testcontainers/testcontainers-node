import Dockerode, { PortMap as DockerodePortBindings } from "dockerode";
import streamToArray from "stream-to-array";
import url from "url";
import { BoundPorts } from "./bound-ports";
import { Container, DockerodeContainer } from "./container";
import log from "./logger";
import { PortString } from "./port";
import { RepoTag } from "./repo-tag";

export type Command = string;
export type ExitCode = number;

export type EnvKey = string;
export type EnvValue = string;
export type Env = { [key in EnvKey]: EnvValue };
type DockerodeEnvironment = string[];

type StreamOutput = string;
type ExecResult = { output: StreamOutput; exitCode: ExitCode };
type DockerodeExposedPorts = { [port in PortString]: {} };

export interface DockerClient {
  pull(repoTag: RepoTag): Promise<void>;
  create(repoTag: RepoTag, env: Env, boundPorts: BoundPorts): Promise<Container>;
  start(container: Container): Promise<void>;
  exec(container: Container, command: Command[]): Promise<ExecResult>;
  fetchRepoTags(): Promise<RepoTag[]>;
}

export class DockerodeClient implements DockerClient {
  private readonly dockerode: Dockerode = this.initialiseDockerode();

  constructor() {
    this.dockerode = this.initialiseDockerode();
  }

  public async pull(repoTag: RepoTag): Promise<void> {
    log.info(`Pulling image: ${repoTag}`);
    const stream = await this.dockerode.pull(repoTag.toString(), {});
    await streamToArray(stream);
  }

  public async create(repoTag: RepoTag, env: Env, boundPorts: BoundPorts): Promise<Container> {
    log.info(`Creating container for image: ${repoTag}`);

    const dockerodeContainer = await this.dockerode.createContainer({
      Image: repoTag.toString(),
      Env: this.getEnv(env),
      ExposedPorts: this.getExposedPorts(boundPorts),
      HostConfig: {
        PortBindings: this.getPortBindings(boundPorts)
      }
    });

    return new DockerodeContainer(dockerodeContainer);
  }

  public start(container: Container): Promise<void> {
    log.info(`Starting container with ID: ${container.getId()}`);
    return container.start();
  }

  public async exec(container: Container, command: Command[]): Promise<ExecResult> {
    log.debug(`Executing command "${command.join(" ")}" on container with ID: ${container.getId()}`);

    const exec = await container.exec({
      cmd: command,
      attachStdout: true,
      attachStderr: true
    });

    const stream = await exec.start();
    const output = Buffer.concat(await streamToArray(stream)).toString();
    const { exitCode } = await exec.inspect();

    return { output, exitCode };
  }

  public async fetchRepoTags(): Promise<RepoTag[]> {
    const images = await this.dockerode.listImages();

    return images.reduce((repoTags: RepoTag[], image) => {
      if (this.isDanglingImage(image)) {
        return repoTags;
      }
      const imageRepoTags = image.RepoTags.map(imageRepoTag => {
        const [imageName, tag] = imageRepoTag.split(":");
        return new RepoTag(imageName, tag);
      });
      return [...repoTags, ...imageRepoTags];
    }, []);
  }

  private initialiseDockerode(): Dockerode {
    if (process.env.DOCKER_HOST) {
      const { hostname, port } = url.parse(process.env.DOCKER_HOST);
      return new Dockerode({ host: hostname, port });
    }

    return new Dockerode();
  }

  private isDanglingImage(image: Dockerode.ImageInfo) {
    return image.RepoTags === null;
  }

  private getEnv(env: Env): DockerodeEnvironment {
    return Object.entries(env).reduce(
      (dockerodeEnvironment, [key, value]) => {
        return [...dockerodeEnvironment, `${key}=${value}`];
      },
      [] as DockerodeEnvironment
    );
  }

  private getExposedPorts(boundPorts: BoundPorts): DockerodeExposedPorts {
    const dockerodeExposedPorts: DockerodeExposedPorts = {};
    for (const [internalPort] of boundPorts.iterator()) {
      dockerodeExposedPorts[internalPort.toString()] = {};
    }
    return dockerodeExposedPorts;
  }

  private getPortBindings(boundPorts: BoundPorts): DockerodePortBindings {
    const dockerodePortBindings: DockerodePortBindings = {};
    for (const [internalPort, hostPort] of boundPorts.iterator()) {
      dockerodePortBindings[internalPort.toString()] = [{ HostPort: hostPort.toString() }];
    }
    return dockerodePortBindings;
  }
}
