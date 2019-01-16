import dockerode from "dockerode";
import { Command, ExitCode } from "./docker-client";
import { Port } from "./port";

type Id = string;

export type InspectResult = {
  internalPorts: Port[];
  hostPorts: Port[];
};

type ExecOptions = {
  cmd: Command[];
  attachStdout: true;
  attachStderr: true;
};

type ExecInspectResult = {
  exitCode: ExitCode;
};

interface Exec {
  start(): Promise<NodeJS.ReadableStream>;
  inspect(): Promise<ExecInspectResult>;
}

export interface Container {
  getId(): Id;
  start(): Promise<void>;
  stop(): Promise<void>;
  remove(): Promise<void>;
  exec(options: ExecOptions): Promise<Exec>;
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

  public stop(): Promise<void> {
    return this.container.stop();
  }

  public remove(): Promise<void> {
    return this.container.remove();
  }

  public async exec(options: ExecOptions): Promise<Exec> {
    return new DockerodeExec(await this.container.exec(options));
  }

  public async inspect(): Promise<InspectResult> {
    const inspectResult = await this.container.inspect();

    const ports = inspectResult.NetworkSettings.Ports;
    const internalPorts = Object.keys(ports).map(port => Number(port.split("/")[0]));
    const hostPorts = Object.values(ports)
      .filter(portsArray => portsArray !== null)
      .map(portsArray => Number(portsArray[0].HostPort));

    return { internalPorts, hostPorts };
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
