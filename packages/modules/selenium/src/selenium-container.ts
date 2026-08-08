import { mkdtemp, rename, rm } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import {
  AbstractStartedContainer,
  AbstractStoppedContainer,
  GenericContainer,
  log,
  Network,
  StartedNetwork,
  StartedTestContainer,
  StopOptions,
  StoppedTestContainer,
  Wait,
} from "testcontainers";

const SELENIUM_PORT = 4444;
const VNC_PORT = 5900;
const SELENIUM_NETWORK_ALIAS = "selenium";

export const SELENIUM_VIDEO_IMAGE = "selenium/video:ffmpeg-4.3.1-20230508";

export class SeleniumContainer extends GenericContainer {
  constructor(image: string) {
    super(image);
    this.withExposedPorts(SELENIUM_PORT, VNC_PORT)
      .withSharedMemorySize(2 * 1024 * 1024 * 1024)
      .withWaitStrategy(
        Wait.forAll([
          Wait.forListeningPorts(),
          Wait.forHttp("/wd/hub/status", SELENIUM_PORT).forResponsePredicate((response) => {
            try {
              return JSON.parse(response).value.ready;
            } catch {
              return false;
            }
          }),
        ])
      );
  }

  public withRecording(): SeleniumRecordingContainer {
    return new SeleniumRecordingContainer(this.imageName.string);
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

  private async createNetworkIfNeeded(): Promise<StartedNetwork | undefined> {
    if (this.networkMode) {
      return undefined;
    }
    const network = await new Network().start();
    this.withNetwork(network);
    return network;
  }

  public override async start(): Promise<StartedSeleniumRecordingContainer> {
    const internalNetwork = await this.createNetworkIfNeeded();
    this.withNetworkAliases(SELENIUM_NETWORK_ALIAS);

    const startedSeleniumContainer = await super.start();

    const startedFfmpegContainer = await new GenericContainer(SELENIUM_VIDEO_IMAGE)
      .withNetworkMode(this.networkMode!)
      .withEnvironment({ DISPLAY_CONTAINER_NAME: SELENIUM_NETWORK_ALIAS })
      .withWaitStrategy(Wait.forLogMessage(/.*video-recording entered RUNNING state.*/))
      .start();

    return new StartedSeleniumRecordingContainer(startedSeleniumContainer, startedFfmpegContainer, internalNetwork);
  }
}

export class StartedSeleniumRecordingContainer extends StartedSeleniumContainer {
  constructor(
    startedSeleniumContainer: StartedTestContainer,
    private readonly startedFfmpegContainer: StartedTestContainer,
    private readonly internalNetwork?: StartedNetwork
  ) {
    super(startedSeleniumContainer);
  }

  override async stop(options?: Partial<StopOptions>): Promise<StoppedSeleniumRecordingContainer> {
    const stoppedSeleniumContainer = await super.stop(options);
    const stoppedFfmpegContainer = await this.startedFfmpegContainer.stop({ remove: false, timeout: 60_000 });
    if (this.internalNetwork) {
      await this.internalNetwork.stop();
    }
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
    const temporaryDirectory = await mkdtemp(path.join(path.dirname(target), ".testcontainers-"));

    try {
      log.debug("Extracting archive from container...", { containerId: ffmpegContainerId });
      const [{ unpackTar }, archive] = await Promise.all([
        import("modern-tar/fs"),
        this.stoppedFfmpegContainer.copyArchiveFromContainer("/videos/video.mp4"),
      ]);
      await pipeline(
        archive,
        unpackTar(temporaryDirectory, {
          strict: true,
          filter: (header) => header.type === "file" && header.name === "video.mp4",
        })
      );
      log.debug("Extracted archive from container", { containerId: ffmpegContainerId });

      // Publish only a complete archive entry, without copying the video a second time.
      await rename(path.join(temporaryDirectory, "video.mp4"), target);
      log.debug(`Extracted video to "${target}"`, { containerId: ffmpegContainerId });
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  }
}
