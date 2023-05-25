import { GenericContainer } from "../../generic-container/generic-container";
import { AbstractStartedContainer } from "../abstract-started-container";
import { Wait } from "../../wait-strategy/wait";
import { StartedTestContainer, StopOptions, StoppedTestContainer } from "../../test-container";
import { AbstractStoppedContainer } from "../abstract-stopped-container";
import { Network, StartedNetwork } from "../../network";
import { log } from "../../logger";
import { rename } from "fs/promises";
import tmp from "tmp";
import tar from "tar-fs";
import path from "path";

const SELENIUM_PORT = 4444;
const VNC_PORT = 5900;
const SELENIUM_NETWORK_ALIAS = "selenium";

export class SeleniumContainer extends GenericContainer {
  constructor(image = "selenium/standalone-chrome:112.0") {
    super(image);
  }

  protected override async beforeContainerStarted(): Promise<void> {
    this.withExposedPorts(SELENIUM_PORT, VNC_PORT)
      .withSharedMemorySize(512 * 1024 * 1024)
      .withWaitStrategy(
        Wait.forHttp("/wd/hub/status", SELENIUM_PORT).forResponsePredicate((response) => {
          try {
            return JSON.parse(response).value.ready;
          } catch {
            return false;
          }
        })
      );
  }

  public withRecording(): SeleniumRecordingContainer {
    return new SeleniumRecordingContainer(this.image);
  }

  override async start(): Promise<StartedSeleniumContainer> {
    return new StartedSeleniumContainer(await super.start());
  }
}

export class StartedSeleniumContainer extends AbstractStartedContainer {
  private readonly serverUrl: string;

  constructor(startedTestContainer: StartedTestContainer) {
    super(startedTestContainer);
    this.serverUrl = `http://${this.getHost()}:${this.getMappedPort(4444)}/wd/hub`;
  }

  getServerUrl(): string {
    return this.serverUrl;
  }

  override async stop(options?: Partial<StopOptions>): Promise<StoppedSeleniumContainer> {
    return new StoppedSeleniumContainer(await super.stop(options));
  }
}

export class StoppedSeleniumContainer extends AbstractStoppedContainer {
  constructor(private readonly stoppedSeleniumContainer: StoppedTestContainer) {
    super(stoppedSeleniumContainer);
  }
}

export class SeleniumRecordingContainer extends SeleniumContainer {
  constructor(image: string) {
    super(image);
  }

  public override async start(): Promise<StartedSeleniumRecordingContainer> {
    const network = await new Network().start();
    this.withNetwork(network);
    this.withNetworkAliases(SELENIUM_NETWORK_ALIAS);

    const startedSeleniumContainer = await super.start();

    const ffmpegContainer = await new GenericContainer("selenium/video:ffmpeg-4.3.1-20230508")
      .withNetwork(network)
      .withEnvironment({ DISPLAY_CONTAINER_NAME: SELENIUM_NETWORK_ALIAS })
      .withWaitStrategy(Wait.forLogMessage(/.*video-recording entered RUNNING state.*/))
      .start();

    return new StartedSeleniumRecordingContainer(startedSeleniumContainer, ffmpegContainer, network);
  }
}

export class StartedSeleniumRecordingContainer extends StartedSeleniumContainer {
  constructor(
    startedSeleniumContainer: StartedTestContainer,
    private readonly startedFfmpegContainer: StartedTestContainer,
    private readonly network: StartedNetwork
  ) {
    super(startedSeleniumContainer);
  }

  override async stop(options?: Partial<StopOptions>): Promise<StoppedSeleniumRecordingContainer> {
    const stoppedSeleniumContainer = await super.stop(options);
    const stoppedFfmpegContainer = await this.startedFfmpegContainer.stop({ remove: false, timeout: 60_000 });
    await this.network.stop();
    return new StoppedSeleniumRecordingContainer(stoppedSeleniumContainer, stoppedFfmpegContainer);
  }
}

export class StoppedSeleniumRecordingContainer extends StoppedSeleniumContainer {
  constructor(
    stoppedSeleniumContainer: StoppedTestContainer,
    private readonly stoppedFfmpegContainer: StoppedTestContainer
  ) {
    super(stoppedSeleniumContainer);
  }

  async saveRecording(target: string): Promise<void> {
    const ffmpegContainerId = this.stoppedFfmpegContainer.getId();

    log.debug("Extracting archive from container...", { containerId: ffmpegContainerId });
    const archiveStream = await this.stoppedFfmpegContainer.getArchive("/videos/video.mp4");
    log.debug("Extracted archive from container", { containerId: ffmpegContainerId });

    log.debug("Unpacking archive...", { containerId: ffmpegContainerId });
    const destinationDir = tmp.dirSync();
    await this.extractTarStreamToDest(archiveStream, destinationDir.name);
    log.debug("Unpacked archive", { containerId: ffmpegContainerId });

    const videoFile = path.resolve(destinationDir.name, "video.mp4");
    await rename(videoFile, target);
    destinationDir.removeCallback();
    log.debug(`Extracted video to "${target}"`, { containerId: ffmpegContainerId });
  }

  private async extractTarStreamToDest(tarStream: NodeJS.ReadableStream, dest: string): Promise<void> {
    await new Promise<void>((resolve) => {
      const destination = tar.extract(dest);
      tarStream.pipe(destination);
      destination.on("finish", resolve);
    });
  }
}
