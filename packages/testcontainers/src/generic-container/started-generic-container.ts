import archiver from "archiver";
import AsyncLock from "async-lock";
import Dockerode, { ContainerInspectInfo } from "dockerode";
import { Readable } from "stream";
import { containerLog, log } from "../common";
import { ContainerRuntimeClient, getContainerRuntimeClient } from "../container-runtime";
import { getReaper } from "../reaper/reaper";
import { RestartOptions, StartedTestContainer, StopOptions, StoppedTestContainer } from "../test-container";
import { CommitOptions, ContentToCopy, DirectoryToCopy, ExecOptions, ExecResult, FileToCopy, Labels } from "../types";
import { BoundPorts } from "../utils/bound-ports";
import { LABEL_TESTCONTAINERS_SESSION_ID } from "../utils/labels";
import { mapInspectResult } from "../utils/map-inspect-result";
import { waitForContainer } from "../wait-strategies/wait-for-container";
import { WaitStrategy } from "../wait-strategies/wait-strategy";
import { StoppedGenericContainer } from "./stopped-generic-container";

export class StartedGenericContainer implements StartedTestContainer {
  private stoppedContainer?: StoppedTestContainer;
  private stopContainerLock = new AsyncLock();

  constructor(
    private readonly container: Dockerode.Container,
    private readonly host: string,
    private inspectResult: ContainerInspectInfo,
    private boundPorts: BoundPorts,
    private readonly name: string,
    private readonly waitStrategy: WaitStrategy
  ) {}

  protected containerIsStopping?(): Promise<void>;

  public async stop(options: Partial<StopOptions> = {}): Promise<StoppedTestContainer> {
    return this.stopContainerLock.acquire("stop", async () => {
      if (this.stoppedContainer) {
        return this.stoppedContainer;
      }
      this.stoppedContainer = await this.stopContainer(options);
      return this.stoppedContainer;
    });
  }

  /**
   * Construct the command(s) to apply changes to the container before committing it to an image.
   */
  private async getContainerCommitChangeCommands(options: {
    deleteOnExit: boolean;
    changes?: string[];
    client: ContainerRuntimeClient;
  }): Promise<string> {
    const { deleteOnExit, client } = options;
    const changes = options.changes || [];
    if (deleteOnExit) {
      let sessionId = this.getLabels()[LABEL_TESTCONTAINERS_SESSION_ID];
      if (!sessionId) {
        sessionId = await getReaper(client).then((reaper) => reaper.sessionId);
      }
      changes.push(`LABEL ${LABEL_TESTCONTAINERS_SESSION_ID}=${sessionId}`);
    } else if (!deleteOnExit && this.getLabels()[LABEL_TESTCONTAINERS_SESSION_ID]) {
      // By default, commit will save the existing labels (including the session ID) to the new image.  If
      // deleteOnExit is false, we need to remove the session ID label.
      changes.push(`LABEL ${LABEL_TESTCONTAINERS_SESSION_ID}=`);
    }
    return changes.join("\n");
  }

  public async commit(options: CommitOptions): Promise<string> {
    const client = await getContainerRuntimeClient();
    const { deleteOnExit = true, changes, ...commitOpts } = options;
    const changeCommands = await this.getContainerCommitChangeCommands({ deleteOnExit, changes, client });
    const imageId = await client.container.commit(this.container, { ...commitOpts, changes: changeCommands });
    return imageId;
  }

  protected containerIsStopped?(): Promise<void>;

  public async restart(options: Partial<RestartOptions> = {}): Promise<void> {
    log.info(`Restarting container...`, { containerId: this.container.id });
    const client = await getContainerRuntimeClient();
    const resolvedOptions: RestartOptions = { timeout: 0, ...options };
    await client.container.restart(this.container, resolvedOptions);

    this.inspectResult = await client.container.inspect(this.container);
    const mappedInspectResult = mapInspectResult(this.inspectResult);
    const startTime = new Date(this.inspectResult.State.StartedAt);

    if (containerLog.enabled()) {
      (await client.container.logs(this.container, { since: startTime.getTime() / 1000 }))
        .on("data", (data) => containerLog.trace(data.trim(), { containerId: this.container.id }))
        .on("err", (data) => containerLog.error(data.trim(), { containerId: this.container.id }));
    }

    this.boundPorts = BoundPorts.fromInspectResult(client.info.containerRuntime.hostIps, mappedInspectResult).filter(
      Array.from(this.boundPorts.iterator()).map((port) => port[0])
    );

    await waitForContainer(client, this.container, this.waitStrategy, this.boundPorts, startTime);
    log.info(`Restarted container`, { containerId: this.container.id });
  }

  private async stopContainer(options: Partial<StopOptions> = {}): Promise<StoppedGenericContainer> {
    log.info(`Stopping container...`, { containerId: this.container.id });
    const client = await getContainerRuntimeClient();

    if (this.containerIsStopping) {
      await this.containerIsStopping();
    }

    const resolvedOptions: StopOptions = { remove: true, timeout: 0, removeVolumes: true, ...options };
    await client.container.stop(this.container, { timeout: resolvedOptions.timeout });
    if (resolvedOptions.remove) {
      await client.container.remove(this.container, { removeVolumes: resolvedOptions.removeVolumes });
    }
    log.info(`Stopped container`, { containerId: this.container.id });

    if (this.containerIsStopped) {
      await this.containerIsStopped();
    }

    return new StoppedGenericContainer(this.container);
  }

  public getHost(): string {
    return this.host;
  }

  public getHostname(): string {
    return this.inspectResult.Config.Hostname;
  }

  public getFirstMappedPort(): number {
    return this.boundPorts.getFirstBinding();
  }

  public getMappedPort(port: number): number {
    return this.boundPorts.getBinding(port);
  }

  public getId(): string {
    return this.container.id;
  }

  public getName(): string {
    return this.name;
  }

  public getLabels(): Labels {
    return this.inspectResult.Config.Labels;
  }

  public getNetworkNames(): string[] {
    return Object.keys(this.getNetworkSettings());
  }

  public getNetworkId(networkName: string): string {
    return this.getNetworkSettings()[networkName].networkId;
  }

  public getIpAddress(networkName: string): string {
    return this.getNetworkSettings()[networkName].ipAddress;
  }

  private getNetworkSettings() {
    return Object.entries(this.inspectResult.NetworkSettings.Networks)
      .map(([networkName, network]) => ({
        [networkName]: {
          networkId: network.NetworkID,
          ipAddress: network.IPAddress,
        },
      }))
      .reduce((prev, next) => ({ ...prev, ...next }), {});
  }

  public async copyFilesToContainer(filesToCopy: FileToCopy[]): Promise<void> {
    log.debug(`Copying files to container...`, { containerId: this.container.id });
    const client = await getContainerRuntimeClient();
    const tar = archiver("tar");
    filesToCopy.forEach(({ source, target }) => tar.file(source, { name: target }));
    tar.finalize();
    await client.container.putArchive(this.container, tar, "/");
    log.debug(`Copied files to container`, { containerId: this.container.id });
  }

  public async copyDirectoriesToContainer(directoriesToCopy: DirectoryToCopy[]): Promise<void> {
    log.debug(`Copying directories to container...`, { containerId: this.container.id });
    const client = await getContainerRuntimeClient();
    const tar = archiver("tar");
    directoriesToCopy.forEach(({ source, target }) => tar.directory(source, target));
    tar.finalize();
    await client.container.putArchive(this.container, tar, "/");
    log.debug(`Copied directories to container`, { containerId: this.container.id });
  }

  public async copyContentToContainer(contentsToCopy: ContentToCopy[]): Promise<void> {
    log.debug(`Copying content to container...`, { containerId: this.container.id });
    const client = await getContainerRuntimeClient();
    const tar = archiver("tar");
    contentsToCopy.forEach(({ content, target, mode }) => tar.append(content, { name: target, mode: mode }));
    tar.finalize();
    await client.container.putArchive(this.container, tar, "/");
    log.debug(`Copied content to container`, { containerId: this.container.id });
  }

  public async copyArchiveToContainer(tar: Readable, target = "/"): Promise<void> {
    log.debug(`Copying archive to container...`, { containerId: this.container.id });
    const client = await getContainerRuntimeClient();
    await client.container.putArchive(this.container, tar, target);
    log.debug(`Copied archive to container`, { containerId: this.container.id });
  }

  public async copyArchiveFromContainer(path: string): Promise<NodeJS.ReadableStream> {
    log.debug(`Copying archive "${path}" from container...`, { containerId: this.container.id });
    const client = await getContainerRuntimeClient();
    const stream = await client.container.fetchArchive(this.container, path);
    log.debug(`Copied archive "${path}" from container`, { containerId: this.container.id });
    return stream;
  }

  public async exec(command: string | string[], opts?: Partial<ExecOptions>): Promise<ExecResult> {
    const commandArr = Array.isArray(command) ? command : command.split(" ");
    const commandStr = commandArr.join(" ");
    const client = await getContainerRuntimeClient();
    log.debug(`Executing command "${commandStr}"...`, { containerId: this.container.id });
    const output = await client.container.exec(this.container, commandArr, opts);
    log.debug(`Executed command "${commandStr}"...`, { containerId: this.container.id });

    return output;
  }

  public async logs(opts?: { since?: number; tail?: number }): Promise<Readable> {
    const client = await getContainerRuntimeClient();

    return client.container.logs(this.container, opts);
  }
}
