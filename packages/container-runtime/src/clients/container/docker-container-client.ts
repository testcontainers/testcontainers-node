import Dockerode, {
  Container,
  ContainerCreateOptions,
  ContainerInfo,
  ContainerInspectInfo,
  ContainerLogsOptions,
  Network,
} from "dockerode";
import { log } from "@testcontainers/logger";
import { PassThrough, Readable } from "stream";
import { streamToString } from "@testcontainers/common";
import { IncomingMessage } from "http";
import { ExecResult } from "./types";
import { execLog } from "../../logger";
import byline from "byline";
import { ContainerClient } from "./container-client";

export class DockerContainerClient implements ContainerClient {
  constructor(public readonly dockerode: Dockerode) {}

  async fetchById(id: string): Promise<Container> {
    try {
      log.debug(`Fetching container by ID...`, { containerId: id });
      const container = this.dockerode.getContainer(id);
      log.debug(`Fetched container by ID`, { containerId: id });
      return container;
    } catch (err) {
      log.error(`Failed to fetch container by ID: ${err}`, { containerId: id });
      throw err;
    }
  }

  async fetchByLabel(labelName: string, labelValue: string): Promise<Container | undefined> {
    try {
      log.debug(`Fetching container by label "${labelName}=${labelValue}"...`);
      const containers = await this.dockerode.listContainers({
        limit: 1,
        filters: {
          status: ["running"],
          label: [`${labelName}=${labelValue}`],
        },
      });
      if (containers.length === 0) {
        log.debug(`No container found with label "${labelName}=${labelValue}"`);
        return undefined;
      } else {
        log.debug(`Fetched container by label "${labelName}=${labelValue}"`);
        return await this.fetchById(containers[0].Id);
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

  async putArchive(container: Container, path: string, stream: Readable): Promise<void> {
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
      log.debug(`Inspecting container...`, { containerId: container.id });
      const inspectInfo = await container.inspect();
      log.debug(`Inspected container`, { containerId: container.id });
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
      const demuxedStream = this.demuxStream(stream);
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
        since: opts?.since,
      })) as IncomingMessage;
      stream.socket.unref();
      const demuxedStream = this.demuxStream(stream);
      log.debug(`Fetched container logs`, { containerId: container.id });
      return demuxedStream;
    } catch (err) {
      log.error(`Failed to fetch container logs: ${err}`, { containerId: container.id });
      throw err;
    }
  }

  async exec(container: Container, command: string[], opts?: { log: boolean }): Promise<ExecResult> {
    const chunks: string[] = [];

    try {
      log.debug(`Execing container with command "${command.join(" ")}"...`, { containerId: container.id });
      const exec = await container.exec({
        Cmd: command,
        AttachStdout: true,
        AttachStderr: true,
      });

      const stream = await exec.start({ stdin: true, Detach: false, Tty: true });

      if (opts?.log && execLog.enabled()) {
        byline(stream).on("data", (line) => execLog.trace(line, { containerId: container.id }));
      }

      await new Promise((res, rej) => {
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("end", res);
        stream.on("error", rej);
      });
      stream.destroy();

      const inspectResult = await exec.inspect();
      const exitCode = inspectResult.ExitCode === null ? -1 : inspectResult.ExitCode;
      const output = chunks.join("");
      log.debug(`Execed container with command "${command.join(" ")}"...`, { containerId: container.id });
      return { output, exitCode };
    } catch (err) {
      log.error(`Failed to exec container with command "${command.join(" ")}": ${err}: ${chunks.join("")}`, {
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

  protected async demuxStream(stream: Readable): Promise<Readable> {
    try {
      log.debug(`Demuxing stream...`);
      const demuxedStream = new PassThrough({ autoDestroy: true, encoding: "utf-8" });
      this.dockerode.modem.demuxStream(stream, demuxedStream, demuxedStream);
      stream.on("end", () => demuxedStream.end());
      demuxedStream.on("close", () => {
        if (!stream.destroyed) {
          stream.destroy();
        }
      });
      log.debug(`Demuxed stream`);
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
