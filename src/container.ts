import dockerode from "dockerode";
import { Command, ExitCode } from "./docker-client";

type Id = string;

type ExecOptions = {
  cmd: Command[];
  attachStdout: true;
  attachStderr: true;
};

type InspectResult = {
  exitCode: ExitCode;
};

interface Exec {
  start(): Promise<NodeJS.ReadableStream>;
  inspect(): Promise<InspectResult>;
}

export interface Container {
  getId(): Id;
  start(): Promise<void>;
  stop(): Promise<void>;
  remove(): Promise<void>;
  exec(options: ExecOptions): Promise<Exec>;
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

  public async inspect(): Promise<InspectResult> {
    const inspectResult = await this.exec.inspect();
    return { exitCode: inspectResult.ExitCode };
  }
}
