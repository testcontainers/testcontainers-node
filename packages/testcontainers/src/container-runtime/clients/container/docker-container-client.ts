import Dockerode, {
  Container,
  ContainerCreateOptions,
  ContainerInfo,
  ContainerInspectInfo,
  ContainerLogsOptions,
  ExecCreateOptions,
  Network,
} from "dockerode";
import { IncomingMessage } from "http";
import { PassThrough, Readable } from "stream";
import { execLog, log, streamToString } from "../../../common";
import { ContainerClient } from "./container-client";
import { ContainerCommitOptions, ContainerStatus, ExecOptions, ExecResult } from "./types";

export class DockerContainerClient implements ContainerClient {
  constructor(public readonly dockerode: Dockerode) {}

  getById(id: string): Container {
    try {
      log.debug(`Getting container by ID...`, { containerId: id });
      const container = this.dockerode.getContainer(id);
      log.debug(`Got container by ID`, { containerId: id });
      return container;
    } catch (err) {
      log.error(`Failed to get container by ID: ${err}`, { containerId: id });
      throw err;
    }
  }

  async fetchByLabel(
    labelName: string,
    labelValue: string,
    opts: { status?: ContainerStatus[] } | undefined = undefined
  ): Promise<Container | undefined> {
    try {
      const filters: { [key: string]: string[] } = {
        label: [`${labelName}=${labelValue}`],
      };

      if (opts?.status) {
        filters.status = opts.status;
      }

      log.debug(`Fetching container by label "${labelName}=${labelValue}"...`);
      const containers = await this.dockerode.listContainers({
        limit: 1,
        filters,
      });
      if (containers.length === 0) {
        log.debug(`No container found with label "${labelName}=${labelValue}"`);
        return undefined;
      } else {
        log.debug(`Fetched container by label "${labelName}=${labelValue}"`);
        return this.getById(containers[0].Id);
      }
    } catch (err) {
      log.error(`Failed to fetch container by label "${labelName}=${labelValue}": ${err}`);
      throw err;
    }
  }

  async fetchArchive(container: Container, path: string): Promise<NodeJS.ReadableStream> {
    try {
      log.debug(`Fetching archive from container...`, { containerId: container.id });
      const archive = await container.getArchive({ path });
      log.debug(`Fetched archive from container`, { containerId: container.id });
      return archive;
    } catch (err) {
      log.error(`Failed to fetch archive from container: ${err}`, { containerId: container.id });
      throw err;
    }
  }

  async putArchive(container: Dockerode.Container, stream: Readable, path: string): Promise<void> {
    try {
      log.debug(`Putting archive to container...`, { containerId: container.id });
      await streamToString(Readable.from(await container.putArchive(stream, { path })));
      log.debug(`Put archive to container`, { containerId: container.id });
    } catch (err) {
      log.error(`Failed to put archive to container: ${err}`, { containerId: container.id });
      throw err;
    }
  }

  async list(): Promise<ContainerInfo[]> {
    try {
      log.debug(`Listing containers...`);
      const containers = await this.dockerode.listContainers();
      log.debug(`Listed containers`);
      return containers;
    } catch (err) {
      log.error(`Failed to list containers: ${err}`);
      throw err;
    }
  }

  async create(opts: ContainerCreateOptions): Promise<Container> {
    try {
      log.debug(`Creating container for image "${opts.Image}"...`);
      const container = await this.dockerode.createContainer(opts);
      log.debug(`Created container for image "${opts.Image}"`, { containerId: container.id });
      return container;
    } catch (err) {
      log.error(`Failed to create container for image "${opts.Image}": ${err}`);
      throw err;
    }
  }

  async start(container: Container): Promise<void> {
    try {
      log.debug(`Starting container...`, { containerId: container.id });
      await container.start();
      log.debug(`Started container`, { containerId: container.id });
    } catch (err) {
      log.error(`Failed to start container: ${err}`, { containerId: container.id });
      throw err;
    }
  }

  async inspect(container: Dockerode.Container): Promise<ContainerInspectInfo> {
    try {
      const inspectInfo = await container.inspect();
      return inspectInfo;
    } catch (err) {
      log.error(`Failed to inspect container: ${err}`, { containerId: container.id });
      throw err;
    }
  }

  async stop(container: Container, opts?: { timeout: number }): Promise<void> {
    try {
      log.debug(`Stopping container...`, { containerId: container.id });
      await container.stop({ t: opts?.timeout });
      log.debug(`Stopped container`, { containerId: container.id });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      if (err.statusCode === 304) {
        log.debug(`Container already stopped`, { containerId: container.id });
      } else {
        log.error(`Failed to stop container: ${err}`, { containerId: container.id });
        throw err;
      }
    }
  }

  async attach(container: Container): Promise<Readable> {
    try {
      log.debug(`Attaching to container...`, { containerId: container.id });
      const stream = (await container.attach({
        stream: true,
        stdout: true,
        stderr: true,
      })) as NodeJS.ReadableStream as Readable;
      const demuxedStream = this.demuxStream(container.id, stream);
      log.debug(`Attached to container`, { containerId: container.id });
      return demuxedStream;
    } catch (err) {
      log.error(`Failed to attach to container: ${err}`, { containerId: container.id });
      throw err;
    }
  }

  async logs(container: Container, opts?: ContainerLogsOptions): Promise<Readable> {
    try {
      log.debug(`Fetching container logs...`, { containerId: container.id });
      const stream = (await container.logs({
        follow: true,
        stdout: true,
        stderr: true,
        tail: opts?.tail ?? -1,
        since: opts?.since ?? 0,
      })) as IncomingMessage;
      stream.socket.unref();
      const demuxedStream = this.demuxStream(container.id, stream);
      log.debug(`Fetched container logs`, { containerId: container.id });
      return demuxedStream;
    } catch (err) {
      log.error(`Failed to fetch container logs: ${err}`, { containerId: container.id });
      throw err;
    }
  }

  async exec(container: Container, command: string[], opts?: Partial<ExecOptions>): Promise<ExecResult> {
    const execOptions: ExecCreateOptions = {
      Cmd: command,
      AttachStdout: true,
      AttachStderr: true,
    };

    if (opts?.env !== undefined) {
      execOptions.Env = Object.entries(opts.env).map(([key, value]) => `${key}=${value}`);
    }
    if (opts?.workingDir !== undefined) {
      execOptions.WorkingDir = opts.workingDir;
    }
    if (opts?.user !== undefined) {
      execOptions.User = opts.user;
    }

    const outputChunks: string[] = [];
    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];

    try {
      if (opts?.log) {
        log.debug(`Execing container with command "${command.join(" ")}"...`, { containerId: container.id });
      }

      const exec = await container.exec(execOptions);
      const stream = await exec.start({ stdin: true, Detach: false, Tty: false });

      const stdoutStream = new PassThrough();
      const stderrStream = new PassThrough();

      this.dockerode.modem.demuxStream(stream, stdoutStream, stderrStream);

      const processStream = (stream: Readable, chunks: string[]) => {
        stream.on("data", (chunk) => {
          chunks.push(chunk.toString());
          outputChunks.push(chunk.toString());

          if (opts?.log && execLog.enabled()) {
            execLog.trace(chunk.toString(), { containerId: container.id });
          }
        });
      };

      processStream(stdoutStream, stdoutChunks);
      processStream(stderrStream, stderrChunks);

      await new Promise((res, rej) => {
        stream.on("end", res);
        stream.on("error", rej);
      });
      stream.destroy();

      const inspectResult = await exec.inspect();
      const exitCode = inspectResult.ExitCode ?? -1;
      const output = outputChunks.join("");
      const stdout = stdoutChunks.join("");
      const stderr = stderrChunks.join("");

      if (opts?.log) {
        log.debug(`Execed container with command "${command.join(" ")}"...`, { containerId: container.id });
      }
      return { output, stdout, stderr, exitCode };
    } catch (err) {
      log.error(`Failed to exec container with command "${command.join(" ")}": ${err}: ${outputChunks.join("")}`, {
        containerId: container.id,
      });
      throw err;
    }
  }

  async restart(container: Container, opts?: { timeout: number }): Promise<void> {
    try {
      log.debug(`Restarting container...`, { containerId: container.id });
      await container.restart({ t: opts?.timeout });
      log.debug(`Restarted container`, { containerId: container.id });
    } catch (err) {
      log.error(`Failed to restart container: ${err}`, { containerId: container.id });
      throw err;
    }
  }

  async commit(container: Container, opts: ContainerCommitOptions): Promise<string> {
    try {
      log.debug(`Committing container...`, { containerId: container.id });
      const { Id: imageId } = await container.commit(opts);
      log.debug(`Committed container to image "${imageId}"`, { containerId: container.id });
      return imageId;
    } catch (err) {
      log.error(`Failed to commit container: ${err}`, { containerId: container.id });
      throw err;
    }
  }

  async remove(container: Container, opts?: { removeVolumes: boolean }): Promise<void> {
    try {
      log.debug(`Removing container...`, { containerId: container.id });
      await container.remove({ v: opts?.removeVolumes });
      log.debug(`Removed container`, { containerId: container.id });
    } catch (err) {
      log.error(`Failed to remove container: ${err}`, { containerId: container.id });
      throw err;
    }
  }

  async events(container: Container, eventNames: string[]): Promise<Readable> {
    log.debug(`Fetching event stream...`, { containerId: container.id });
    const stream = (await this.dockerode.getEvents({
      filters: {
        type: ["container"],
        container: [container.id],
        event: eventNames,
      },
    })) as Readable;
    log.debug(`Fetched event stream...`, { containerId: container.id });
    return stream;
  }

  protected async demuxStream(containerId: string, stream: Readable): Promise<Readable> {
    try {
      log.debug(`Demuxing stream...`, { containerId });
      const demuxedStream = new PassThrough({ autoDestroy: true, encoding: "utf-8" });
      this.dockerode.modem.demuxStream(stream, demuxedStream, demuxedStream);
      stream.on("end", () => demuxedStream.end());
      demuxedStream.on("close", () => {
        if (!stream.destroyed) {
          stream.destroy();
        }
      });
      log.debug(`Demuxed stream`, { containerId });
      return demuxedStream;
    } catch (err) {
      log.error(`Failed to demux stream: ${err}`);
      throw err;
    }
  }

  async connectToNetwork(container: Container, network: Network, networkAliases: string[]): Promise<void> {
    try {
      log.debug(`Connecting to network "${network.id}"...`, { containerId: container.id });
      await network.connect({ Container: container.id, EndpointConfig: { Aliases: networkAliases } });
      log.debug(`Connected to network "${network.id}"...`, { containerId: container.id });
    } catch (err) {
      log.error(`Failed to connect to network "${network.id}": ${err}`, { containerId: container.id });
      throw err;
    }
  }
}
