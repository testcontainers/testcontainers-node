import Dockerode, { Network, PortMap as DockerodePortBindings } from "dockerode";
import { Duration, TemporalUnit } from "node-duration";
import streamToArray from "stream-to-array";
import tar from "tar-fs";
import { BoundPorts } from "./bound-ports";
import { Container, DockerodeContainer, Id } from "./container";
import { Host } from "./docker-client-factory";
import { findDockerIgnoreFiles } from "./docker-ignore";
import { log } from "./logger";
import { PortString } from "./port";
import { RepoTag } from "./repo-tag";
import { PullStreamParser } from "./pull-stream-parser";

export type Command = string;
export type ContainerName = string;
export type NetworkMode = string;
export type ExitCode = number;

export type EnvKey = string;
export type EnvValue = string;
export type Env = { [key in EnvKey]: EnvValue };
type DockerodeEnvironment = string[];

export type Dir = string;

export type TmpFs = { [dir in Dir]: Dir };

export type HealthCheck = {
  test: string;
  interval?: Duration;
  timeout?: Duration;
  retries?: number;
  startPeriod?: Duration;
};

type DockerodeHealthCheck = {
  Test: string[];
  Interval: number;
  Timeout: number;
  Retries: number;
  StartPeriod: number;
};

export type BuildContext = string;
export type BuildArgs = { [key in EnvKey]: EnvValue };

export type StreamOutput = string;
export type ExecResult = { output: StreamOutput; exitCode: ExitCode };
type DockerodeExposedPorts = { [port in PortString]: Record<string, unknown> };

export type BindMode = "rw" | "ro";
export type BindMount = {
  source: Dir;
  target: Dir;
  bindMode: BindMode;
};
type DockerodeBindMount = string;

export type AuthConfig = {
  username: string;
  password: string;
  serveraddress: string;
  email?: string;
};

type DockerodeLogConfig = {
  Type: string;
  Config: Record<string, unknown>;
};

type CreateOptions = {
  repoTag: RepoTag;
  env: Env;
  cmd: Command[];
  bindMounts: BindMount[];
  tmpFs: TmpFs;
  boundPorts: BoundPorts;
  name?: ContainerName;
  networkMode?: NetworkMode;
  healthCheck?: HealthCheck;
  useDefaultLogDriver: boolean;
  privilegedMode: boolean;
  autoRemove: boolean;
};

export type CreateNetworkOptions = {
  name: string;
  driver: "bridge" | "overlay" | string; // third option is for user-installed custom network drivers
  checkDuplicate: boolean;
  internal: boolean;
  attachable: boolean;
  ingress: boolean;
  enableIPv6: boolean;
  labels?: { [key: string]: string };
  options?: { [key: string]: string };
};

export interface DockerClient {
  pull(repoTag: RepoTag, authConfig?: AuthConfig): Promise<void>;
  create(options: CreateOptions): Promise<Container>;
  createNetwork(options: CreateNetworkOptions): Promise<string>;
  removeNetwork(id: string): Promise<void>;
  start(container: Container): Promise<void>;
  exec(container: Container, command: Command[]): Promise<ExecResult>;
  buildImage(repoTag: RepoTag, context: BuildContext, dockerfileName: string, buildArgs: BuildArgs): Promise<void>;
  fetchRepoTags(): Promise<RepoTag[]>;
  listContainers(): Promise<Dockerode.ContainerInfo[]>;
  getContainer(id: Id): Promise<Container>;
  getHost(): Host;
  getSessionId(): Id;
  getSocketPath(): string;
}

export class DockerodeClient implements DockerClient {
  constructor(private readonly host: Host, private readonly dockerode: Dockerode, private readonly sessionId: Id) {}

  public async pull(repoTag: RepoTag, authConfig?: AuthConfig): Promise<void> {
    log.info(`Pulling image: ${repoTag}`);
    const stream = await this.dockerode.pull(repoTag.toString(), { authconfig: authConfig });
    await new PullStreamParser(repoTag, log).consume(stream);
  }

  public async create(options: CreateOptions): Promise<Container> {
    log.info(`Creating container for image: ${options.repoTag}`);

    const dockerodeContainer = await this.dockerode.createContainer({
      name: options.name,
      Image: options.repoTag.toString(),
      Env: this.getEnv(options.env),
      ExposedPorts: this.getExposedPorts(options.boundPorts),
      Cmd: options.cmd,
      Labels: this.createLabels(options.repoTag),
      // @ts-ignore
      Healthcheck: this.getHealthCheck(options.healthCheck),
      HostConfig: {
        AutoRemove: options.autoRemove,
        NetworkMode: options.networkMode,
        PortBindings: this.getPortBindings(options.boundPorts),
        Binds: this.getBindMounts(options.bindMounts),
        Tmpfs: options.tmpFs,
        LogConfig: this.getLogConfig(options.useDefaultLogDriver),
        Privileged: options.privilegedMode,
      },
    });

    return new DockerodeContainer(dockerodeContainer);
  }

  public async createNetwork(options: CreateNetworkOptions): Promise<string> {
    log.info(`Creating network ${options.name}`);
    const network: Network = await this.dockerode.createNetwork({
      Name: options.name,
      CheckDuplicate: options.checkDuplicate,
      Driver: options.driver,
      Internal: options.internal,
      Attachable: options.attachable,
      Ingress: options.ingress,
      EnableIPv6: options.enableIPv6,
      Options: options.options,
      Labels: { ...options.labels, ...this.createLabels() },
    });
    return network.id;
  }

  public async removeNetwork(id: string): Promise<void> {
    log.info(`Removing network ${id}`);
    const network = this.dockerode.getNetwork(id);
    const { message } = await network.remove();
    if (message) {
      log.warn(message);
    }
  }

  public start(container: Container): Promise<void> {
    log.info(`Starting container with ID: ${container.getId()}`);
    return container.start();
  }

  public async exec(container: Container, command: Command[]): Promise<ExecResult> {
    const exec = await container.exec({
      cmd: command,
      attachStdout: true,
      attachStderr: true,
    });

    const stream = await exec.start();
    const output = Buffer.concat(await streamToArray(stream)).toString();
    const { exitCode } = await exec.inspect();

    return { output, exitCode };
  }

  public async buildImage(
    repoTag: RepoTag,
    context: BuildContext,
    dockerfileName: string,
    buildArgs: BuildArgs
  ): Promise<void> {
    log.info(`Building image '${repoTag.toString()}' with context '${context}'`);
    const dockerIgnoreFiles = await findDockerIgnoreFiles(context);
    const tarStream = tar.pack(context, { ignore: (name) => dockerIgnoreFiles.has(name) });
    const stream = await this.dockerode.buildImage(tarStream, {
      dockerfile: dockerfileName,
      buildargs: buildArgs,
      t: repoTag.toString(),
      labels: this.createLabels(repoTag),
    });
    await streamToArray(stream);
  }

  public async fetchRepoTags(): Promise<RepoTag[]> {
    const images = await this.dockerode.listImages();

    return images.reduce((repoTags: RepoTag[], image) => {
      if (this.isDanglingImage(image)) {
        return repoTags;
      }
      const imageRepoTags = image.RepoTags.map((imageRepoTag) => {
        const [imageName, tag] = imageRepoTag.split(":");
        return new RepoTag(imageName, tag);
      });
      return [...repoTags, ...imageRepoTags];
    }, []);
  }

  public async listContainers(): Promise<Dockerode.ContainerInfo[]> {
    return await this.dockerode.listContainers();
  }

  public async getContainer(id: Id): Promise<Container> {
    return new DockerodeContainer(await this.dockerode.getContainer(id));
  }

  public getHost(): Host {
    return this.host;
  }

  public getSessionId(): Id {
    return this.sessionId;
  }

  public getSocketPath(): string {
    return this.dockerode.modem.socketPath;
  }

  private isDanglingImage(image: Dockerode.ImageInfo) {
    return image.RepoTags === null;
  }

  private createLabels(repoTag?: RepoTag): { [label: string]: string } {
    if (repoTag && repoTag.isReaper()) {
      return {};
    }
    return { "org.testcontainers.session-id": this.sessionId };
  }

  private getEnv(env: Env): DockerodeEnvironment {
    return Object.entries(env).reduce((dockerodeEnvironment, [key, value]) => {
      return [...dockerodeEnvironment, `${key}=${value}`];
    }, [] as DockerodeEnvironment);
  }

  private getHealthCheck(healthCheck?: HealthCheck): DockerodeHealthCheck | undefined {
    if (healthCheck === undefined) {
      return undefined;
    }
    return {
      Test: ["CMD-SHELL", healthCheck.test],
      Interval: healthCheck.interval ? this.toNanos(healthCheck.interval) : 0,
      Timeout: healthCheck.timeout ? this.toNanos(healthCheck.timeout) : 0,
      Retries: healthCheck.retries || 0,
      StartPeriod: healthCheck.startPeriod ? this.toNanos(healthCheck.startPeriod) : 0,
    };
  }

  private toNanos(duration: Duration): number {
    return duration.get(TemporalUnit.MILLISECONDS) * 1e6;
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

  private getBindMounts(bindMounts: BindMount[]): DockerodeBindMount[] {
    return bindMounts.map(({ source, target, bindMode }) => `${source}:${target}:${bindMode}`);
  }

  private getLogConfig(useDefaultLogDriver: boolean): DockerodeLogConfig | undefined {
    if (!useDefaultLogDriver) {
      return undefined;
    }

    return {
      Type: "json-file",
      Config: {},
    };
  }
}
