import devNull from "dev-null";
import Dockerode, { Container, PortMap as DockerodePortBindings } from "dockerode";
import { Stream } from "stream";
import log from "./logger";
import { PortString } from "./port";
import { PortBindings } from "./port-bindings";
import { RepoTag } from "./repo-tag";

type Command = string;
type ExecResult = { output: string; exitCode: number };
type DockerodeExposedPorts = { [port in PortString]: {} };

export interface DockerClient {
  pull(repoTag: RepoTag): Promise<void>;
  create(repoTag: RepoTag, portBindings: PortBindings): Promise<Container>;
  start(container: Container): Promise<void>;
  exec(container: Container, command: Command[]): Promise<ExecResult>;
}

export class DockerodeClient implements DockerClient {
  constructor(private readonly dockerode: Dockerode = new Dockerode()) {}

  public async pull(repoTag: RepoTag): Promise<void> {
    log.info(`Pulling image: ${repoTag}`);

    return new Promise(async resolve => {
      const stream = await this.dockerode.pull(repoTag.toString(), {});
      stream.pipe(devNull());
      stream.on("end", resolve);
    });
  }

  public create(repoTag: RepoTag, portBindings: PortBindings): Promise<Container> {
    log.info(`Creating container for image: ${repoTag}`);

    return this.dockerode.createContainer({
      Image: repoTag.toString(),
      ExposedPorts: this.getExposedPorts(portBindings),
      HostConfig: {
        PortBindings: this.getPortBindings(portBindings)
      }
    });
  }

  public start(container: Container): Promise<void> {
    log.info(`Starting container with ID: ${container.id}`);
    return container.start();
  }

  public async exec(container: Container, command: Command[]): Promise<ExecResult> {
    log.debug(`Executing command "${command.join(" ")}" on container with ID: ${container.id}`);

    const options = {
      Cmd: command,
      AttachStdout: true,
      AttachStderr: true
    };

    const exec = await container.exec(options);

    return new Promise((resolve, reject) => {
      exec.start((startErr: Error, stream: Stream) => {
        const chunks: Buffer[] = [];

        stream.on("data", chunk => chunks.push(chunk));
        stream.on("end", () => {
          const output = Buffer.concat(chunks).toString();

          exec.inspect((inspectErr: Error, data: { Running: boolean; ExitCode: number }) => {
            if (inspectErr) {
              return reject(inspectErr);
            }
            return resolve({ output, exitCode: data.ExitCode });
          });
        });
      });
    });
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

export class FakeDockerClient implements DockerClient {
  constructor(private readonly container: Container, private readonly execResult: ExecResult) {}

  public pull(repoTag: RepoTag): Promise<void> {
    return Promise.resolve();
  }

  public create(repoTag: RepoTag, portBindings: PortBindings): Promise<Container> {
    return Promise.resolve(this.container);
  }

  public start(container: Container): Promise<void> {
    return Promise.resolve();
  }

  public exec(container: Container, command: Command[]): Promise<ExecResult> {
    return Promise.resolve(this.execResult);
  }
}
