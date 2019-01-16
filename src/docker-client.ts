import devNull from "dev-null";
import Dockerode, { PortMap as DockerodePortBindings } from "dockerode";
import streamToArray from "stream-to-array";
import { Container, DockerodeContainer } from "./container";
import { DebugLogger, Logger } from "./logger";
import { PortString } from "./port";
import { PortBindings } from "./port-bindings";
import { RepoTag } from "./repo-tag";

export type Command = string;
export type ExitCode = number;

type StreamOutput = string;
type ExecResult = { output: StreamOutput; exitCode: ExitCode };
type DockerodeExposedPorts = { [port in PortString]: {} };

export interface DockerClient {
  pull(repoTag: RepoTag): Promise<void>;
  create(repoTag: RepoTag, portBindings: PortBindings): Promise<Container>;
  start(container: Container): Promise<void>;
  exec(container: Container, command: Command[]): Promise<ExecResult>;
  getRepoTags(): Promise<RepoTag[]>;
}

export class DockerodeClient implements DockerClient {
  constructor(
    private readonly dockerode: Dockerode = new Dockerode(),
    private readonly log: Logger = new DebugLogger()
  ) {}

  public async pull(repoTag: RepoTag): Promise<void> {
    this.log.info(`Pulling image: ${repoTag}`);

    return new Promise(async resolve => {
      const stream = await this.dockerode.pull(repoTag.toString(), {});
      stream.pipe(devNull());
      stream.on("end", resolve);
    });
  }

  public async create(repoTag: RepoTag, portBindings: PortBindings): Promise<Container> {
    this.log.info(`Creating container for image: ${repoTag}`);

    const dockerodeContainer = await this.dockerode.createContainer({
      Image: repoTag.toString(),
      ExposedPorts: this.getExposedPorts(portBindings),
      HostConfig: {
        PortBindings: this.getPortBindings(portBindings)
      }
    });

    return new DockerodeContainer(dockerodeContainer);
  }

  public start(container: Container): Promise<void> {
    this.log.info(`Starting container with ID: ${container.getId()}`);
    return container.start();
  }

  public async exec(container: Container, command: Command[]): Promise<ExecResult> {
    this.log.debug(`Executing command "${command.join(" ")}" on container with ID: ${container.getId()}`);

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

  public async getRepoTags(): Promise<RepoTag[]> {
    const images = await this.dockerode.listImages();

    return images.reduce((repoTags: RepoTag[], image) => {
      const imageRepoTags = image.RepoTags.map(imageInfoRepoTag => {
        const [imageName, tag] = imageInfoRepoTag.split(":");
        return new RepoTag(imageName, tag);
      });
      return [...repoTags, ...imageRepoTags];
    }, []);
  }

  private getExposedPorts(portBindings: PortBindings): DockerodeExposedPorts {
    const dockerodeExposedPorts: DockerodeExposedPorts = {};
    for (const [internalPort] of portBindings.iterator()) {
      dockerodeExposedPorts[internalPort.toString()] = {};
    }
    return dockerodeExposedPorts;
  }

  private getPortBindings(portBindings: PortBindings): DockerodePortBindings {
    const dockerodePortBindings: DockerodePortBindings = {};
    for (const [internalPort, hostPort] of portBindings.iterator()) {
      dockerodePortBindings[internalPort.toString()] = [{ HostPort: hostPort.toString() }];
    }
    return dockerodePortBindings;
  }
}
