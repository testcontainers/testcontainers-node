import Dockerode, { PortMap as DockerodePortBindings } from "dockerode";
import streamToArray from "stream-to-array";
import { BoundPorts } from "./bound-ports";
import { Container, DockerodeContainer } from "./container";
import { DebugLogger, Logger } from "./logger";
import { PortString } from "./port";
import { RepoTag } from "./repo-tag";

export type Command = string;
export type ExitCode = number;

type StreamOutput = string;
type ExecResult = { output: StreamOutput; exitCode: ExitCode };
type DockerodeExposedPorts = { [port in PortString]: {} };

export interface DockerClient {
  pull(repoTag: RepoTag): Promise<void>;
  create(repoTag: RepoTag, boundPorts: BoundPorts): Promise<Container>;
  start(container: Container): Promise<void>;
  exec(container: Container, command: Command[]): Promise<ExecResult>;
  fetchRepoTags(): Promise<RepoTag[]>;
}

export class DockerodeClient implements DockerClient {
  constructor(
    private readonly dockerode: Dockerode = new Dockerode(),
    private readonly log: Logger = new DebugLogger()
  ) {}

  public async pull(repoTag: RepoTag): Promise<void> {
    this.log.info(`Pulling image: ${repoTag}`);
    const stream = await this.dockerode.pull(repoTag.toString(), {});
    await streamToArray(stream);
  }

  public async create(repoTag: RepoTag, boundPorts: BoundPorts): Promise<Container> {
    this.log.info(`Creating container for image: ${repoTag}`);

    const dockerodeContainer = await this.dockerode.createContainer({
      Image: repoTag.toString(),
      ExposedPorts: this.getExposedPorts(boundPorts),
      HostConfig: {
        PortBindings: this.getPortBindings(boundPorts)
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

  public async fetchRepoTags(): Promise<RepoTag[]> {
    const images = await this.dockerode.listImages();

    return images.reduce((repoTags: RepoTag[], image) => {
      const imageRepoTags = image.RepoTags.map(imageRepoTag => {
        const [imageName, tag] = imageRepoTag.split(":");
        return new RepoTag(imageName, tag);
      });
      return [...repoTags, ...imageRepoTags];
    }, []);
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
