import byline from "byline";
import dockerode, { ContainerInspectInfo } from "dockerode";
import { Duration, TemporalUnit } from "node-duration";
import { Command, ContainerName, ExitCode } from "./docker-client";
import { Port } from "./port";

export type Id = string;

export type InspectResult = {
  internalPorts: Port[];
  hostPorts: Port[];
  name: ContainerName;
};

type ExecInspectResult = {
  exitCode: ExitCode;
};

interface Exec {
  start(): Promise<NodeJS.ReadableStream>;
  inspect(): Promise<ExecInspectResult>;
}

type ExecOptions = {
  cmd: Command[];
  attachStdout: true;
  attachStderr: true;
};

type StopOptions = {
  timeout: Duration;
};

type RemoveOptions = {
  removeVolumes: boolean;
};

export interface Container {
  getId(): Id;
  start(): Promise<void>;
  stop(options: StopOptions): Promise<void>;
  remove(options: RemoveOptions): Promise<void>;
  exec(options: ExecOptions): Promise<Exec>;
  logs(): Promise<NodeJS.ReadableStream>;
  inspect(): Promise<InspectResult>;
}

export class DockerodeContainer implements Container {
  constructor(private readonly container: dockerode.Container) {}

  public getId(): Id {
    return this.container.id;
  }

  public start(): Promise<void> {
    return this.container.start();
  }

  public stop(options: StopOptions): Promise<void> {
    return this.container.stop({
      t: options.timeout.get(TemporalUnit.SECONDS)
    });
  }

  public remove(options: RemoveOptions): Promise<void> {
    return this.container.remove({
      v: options.removeVolumes
    });
  }

  public async exec(options: ExecOptions): Promise<Exec> {
    return new DockerodeExec(
      await this.container.exec({
        Cmd: options.cmd,
        AttachStdout: options.attachStdout,
        AttachStderr: options.attachStderr
      })
    );
  }

  public logs(): Promise<NodeJS.ReadableStream> {
    return new Promise((resolve, reject) => {
      const options = {
        follow: true,
        stdout: true,
        stderr: true
      };

      this.container.logs(options, (err, stream) => {
        if (err) {
          reject(err);
        } else {
          if (!stream) {
            reject(new Error("Log stream is undefined"));
          } else {
            resolve(byline(stream));
          }
        }
      });
    });
  }

  public async inspect(): Promise<InspectResult> {
    const inspectResult = await this.container.inspect();
    return {
      hostPorts: this.getHostPorts(inspectResult),
      internalPorts: this.getInternalPorts(inspectResult),
      name: this.getName(inspectResult)
    };
  }

  private getName(inspectInfo: ContainerInspectInfo): ContainerName {
    return inspectInfo.Name;
  }

  private getInternalPorts(inspectInfo: ContainerInspectInfo): Port[] {
    return Object.keys(inspectInfo.NetworkSettings.Ports).map(port => Number(port.split("/")[0]));
  }

  private getHostPorts(inspectInfo: ContainerInspectInfo): Port[] {
    return Object.values(inspectInfo.NetworkSettings.Ports)
      .filter(portsArray => portsArray !== null)
      .map(portsArray => Number(portsArray[0].HostPort));
  }
}

class DockerodeExec implements Exec {
  constructor(private readonly exec: any) {}

  public start(): Promise<NodeJS.ReadableStream> {
    return new Promise((resolve, reject) => {
      this.exec.start((err: Error, stream: NodeJS.ReadableStream) => {
        if (err) {
          return reject(err);
        }
        return resolve(stream);
      });
    });
  }

  public async inspect(): Promise<ExecInspectResult> {
    const inspectResult = await this.exec.inspect();
    return { exitCode: inspectResult.ExitCode };
  }
}
