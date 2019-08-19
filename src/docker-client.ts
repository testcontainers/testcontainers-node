import Dockerode, { PortMap as DockerodePortBindings } from "dockerode";
import streamToArray from "stream-to-array";
import tar from "tar-fs";
import { BoundPorts } from "./bound-ports";
import { Container, DockerodeContainer } from "./container";
import { Host } from "./docker-client-factory";
import log from "./logger";
import { Options } from "./options";
import { PortString } from "./port";
import { RepoTag } from "./repo-tag";

export type Command = string;
export type ExitCode = number;

export type EnvKey = string;
export type EnvValue = string;
export type Env = { [key in EnvKey]: EnvValue };
type DockerodeEnvironment = string[];

export type BuildContext = string;

export type StreamOutput = string;
export type ExecResult = { output: StreamOutput; exitCode: ExitCode };
type DockerodeExposedPorts = { [port in PortString]: {} };

export interface DockerClient {
  pull(repoTag: RepoTag): Promise<void>;
  create(repoTag: RepoTag, env: Env, boundPorts: BoundPorts, cmd: Command[]): Promise<Container>;
  start(container: Container): Promise<void>;
  exec(container: Container, command: Command[]): Promise<ExecResult>;
  buildImage(repoTag: RepoTag, options: Options): Promise<void>;
  fetchRepoTags(): Promise<RepoTag[]>;
  getHost(): Host;
}

export class DockerodeClient implements DockerClient {
  constructor(private readonly host: Host, private readonly dockerode: Dockerode) {}

  public async pull(repoTag: RepoTag): Promise<void> {
    log.info(`Pulling image: ${repoTag}`);
    const stream = await this.dockerode.pull(repoTag.toString(), {});
    await streamToArray(stream);
  }

  public async create(repoTag: RepoTag, env: Env, boundPorts: BoundPorts, cmd: Command[]): Promise<Container> {
    log.info(`Creating container for image: ${repoTag}`);

    const dockerodeContainer = await this.dockerode.createContainer({
      Image: repoTag.toString(),
      Env: this.getEnv(env),
      ExposedPorts: this.getExposedPorts(boundPorts),
      Cmd: cmd,
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

  public async buildImage(repoTag: RepoTag, options: Options): Promise<void> {
    log.info(`Building image '${repoTag.toString()}' with context '${options.context}'`);

    if (options.abortOnExistingImage) {
      const image: Dockerode.Image = this.dockerode.getImage(repoTag.toString());
      if (!!image.id) {
        return Promise.resolve();
      }
    }

    const tarStream = tar.pack(options.context);
    const stream = await this.dockerode.buildImage(tarStream, {
      buildargs: options.buildArgs,
      t: repoTag.toString()
    });
    await streamToArray(stream);
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

  public getHost(): Host {
    return this.host;
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
