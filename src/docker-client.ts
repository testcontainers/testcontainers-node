import Dockerode, { Network, PortMap as DockerodePortBindings } from "dockerode";
import tar from "tar-fs";
import byline from "byline";
import slash from "slash";
import { BoundPorts } from "./bound-ports";
import { Container, DockerodeContainer, Id } from "./container";
import { Host } from "./docker-client-instance";
import { findDockerIgnoreFiles } from "./docker-ignore";
import { log } from "./logger";
import { PortString } from "./port";
import { DockerImageName } from "./docker-image-name";
import { PullStreamParser } from "./pull-stream-parser";
import { Readable } from "stream";
import { EOL } from "os";

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
  interval?: number;
  timeout?: number;
  retries?: number;
  startPeriod?: number;
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

export type ExtraHost = {
  host: Host;
  ipAddress: string;
};
type DockerodeExtraHosts = string[];

export type AuthConfig = {
  username: string;
  password: string;
  registryAddress: string;
  email?: string;
};

type DockerodeLogConfig = {
  Type: string;
  Config: Record<string, unknown>;
};

type CreateOptions = {
  dockerImageName: DockerImageName;
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
  extraHosts: ExtraHost[];
  ipcMode?: string;
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

export interface RegistryConfig {
  [registryAddress: string]: {
    username: string;
    password: string;
  };
}

export interface DockerClient {
  pull(dockerImageName: DockerImageName, authConfig?: AuthConfig): Promise<void>;
  create(options: CreateOptions): Promise<Container>;
  createNetwork(options: CreateNetworkOptions): Promise<string>;
  removeNetwork(id: string): Promise<void>;
  connectToNetwork(containerId: string, networkId: string): Promise<void>;
  start(container: Container): Promise<void>;
  exec(container: Container, command: Command[]): Promise<ExecResult>;
  buildImage(
    dockerImageName: DockerImageName,
    context: BuildContext,
    dockerfileName: string,
    buildArgs: BuildArgs,
    registryConfig: RegistryConfig
  ): Promise<void>;
  fetchDockerImageNames(): Promise<DockerImageName[]>;
  listContainers(): Promise<Dockerode.ContainerInfo[]>;
  getContainer(id: Id): Promise<Container>;
  getHost(): Host;
  getSessionId(): Id;
  getSocketPath(): string;
}

export class DockerodeClient implements DockerClient {
  constructor(private readonly host: Host, private readonly dockerode: Dockerode, private readonly sessionId: Id) {}

  public async pull(dockerImageName: DockerImageName, authConfig?: AuthConfig): Promise<void> {
    log.info(`Pulling image: ${dockerImageName}`);
    const stream = await this.dockerode.pull(dockerImageName.toString(), { authconfig: authConfig });
    await new PullStreamParser(dockerImageName, log).consume(stream);
  }

  public async create(options: CreateOptions): Promise<Container> {
    log.info(`Creating container for image: ${options.dockerImageName}`);

    const dockerodeContainer = await this.dockerode.createContainer({
      name: options.name,
      Image: options.dockerImageName.toString(),
      Env: this.getEnv(options.env),
      ExposedPorts: this.getExposedPorts(options.boundPorts),
      Cmd: options.cmd,
      Labels: this.createLabels(options.dockerImageName),
      // @ts-ignore
      Healthcheck: this.getHealthCheck(options.healthCheck),
      HostConfig: {
        IpcMode: options.ipcMode,
        ExtraHosts: this.getExtraHosts(options.extraHosts),
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

  public async connectToNetwork(containerId: string, networkId: string): Promise<void> {
    log.debug(`Connecting container ${containerId} to network ${networkId}`);
    const network = this.dockerode.getNetwork(networkId);
    await network.connect({ Container: containerId });
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
    return container.start();
  }

  public async exec(container: Container, command: Command[]): Promise<ExecResult> {
    const exec = await container.exec({
      cmd: command,
      attachStdout: true,
      attachStderr: true,
    });

    const stream = (await exec.start()).setEncoding("utf-8") as Readable;

    return await new Promise((resolve) => {
      let output = "";
      stream.on("data", (chunk) => (output += chunk));

      const interval = setInterval(async () => {
        const { running, exitCode } = await exec.inspect();

        if (!running) {
          clearInterval(interval);
          stream.destroy();
          resolve({ output, exitCode });
        }
      }, 100);
    });
  }

  public async buildImage(
    dockerImageName: DockerImageName,
    context: BuildContext,
    dockerfileName: string,
    buildArgs: BuildArgs,
    registryConfig: RegistryConfig
  ): Promise<void> {
    log.info(`Building image '${dockerImageName.toString()}' with context '${context}'`);
    const dockerIgnoreFiles = await findDockerIgnoreFiles(context);
    const tarStream = tar.pack(context, { ignore: (name) => dockerIgnoreFiles.has(slash(name)) });

    return new Promise((resolve) => {
      this.dockerode
        .buildImage(tarStream, {
          dockerfile: dockerfileName,
          buildargs: buildArgs,
          t: dockerImageName.toString(),
          labels: this.createLabels(dockerImageName),
          registryconfig: registryConfig,
        })
        .then((stream) => byline(stream))
        .then((stream) => {
          stream.setEncoding("utf-8");
          stream.on("data", (data) => log.trace(`${dockerImageName.toString()}: ${data.replace(EOL, "")}`));
          stream.on("end", () => resolve());
        });
    });
  }

  public async fetchDockerImageNames(): Promise<DockerImageName[]> {
    const images = await this.dockerode.listImages();

    return images.reduce((dockerImageNames: DockerImageName[], image) => {
      if (this.isDanglingImage(image)) {
        return dockerImageNames;
      }
      const dockerImageNamesForImage = image.RepoTags.map((imageRepoTag) => DockerImageName.fromString(imageRepoTag));
      return [...dockerImageNames, ...dockerImageNamesForImage];
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

  private createLabels(dockerImageName?: DockerImageName): { [label: string]: string } {
    if (dockerImageName && dockerImageName.isReaper()) {
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

  private toNanos(duration: number): number {
    return duration * 1e6;
  }

  private getExposedPorts(boundPorts: BoundPorts): DockerodeExposedPorts {
    const dockerodeExposedPorts: DockerodeExposedPorts = {};
    for (const [internalPort] of boundPorts.iterator()) {
      dockerodeExposedPorts[internalPort.toString()] = {};
    }
    return dockerodeExposedPorts;
  }

  private getExtraHosts(extraHosts: ExtraHost[]): DockerodeExtraHosts {
    return extraHosts.map((extraHost) => `${extraHost.host}:${extraHost.ipAddress}`);
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
