import { GenericContainer } from "../../generic-container/generic-container";
import { AbstractStartedContainer } from "../abstract-started-container";
import { Wait } from "../../wait-strategy/wait";
import { StartedTestContainer, StopOptions, StoppedTestContainer } from "../../test-container";
import { Network, StartedNetwork } from "../../network";
import { createReadStream, createWriteStream } from "fs";
import tar from "tar-fs";

const SELENIUM_PORT = 4444;
const VNC_PORT = 5900;
const SELENIUM_NETWORK_ALIAS = "selenium";

export class SeleniumContainer extends GenericContainer {
  private recording = false;
  private target?: string;

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

  public withRecording(target: string): this {
    this.recording = true;
    this.target = target;
    return this;
  }

  public override async start(): Promise<StartedSeleniumContainer> {
    const network = await new Network().start();
    this.withNetwork(network);
    this.withNetworkAliases(SELENIUM_NETWORK_ALIAS);
    const startedSeleniumContainer = await super.start();

    const ffmpegContainer = await new GenericContainer("selenium/video:ffmpeg-4.3.1-20230508")
      .withNetwork(network)
      .withEnvironment({ DISPLAY_CONTAINER_NAME: SELENIUM_NETWORK_ALIAS })
      .withWaitStrategy(Wait.forLogMessage(/.*video-recording entered RUNNING state.*/))
      .start();

    return new StartedSeleniumContainer(startedSeleniumContainer, ffmpegContainer, network);
  }
}

export class StartedSeleniumContainer extends AbstractStartedContainer {
  private readonly serverUrl: string;

  constructor(
    startedTestContainer: StartedTestContainer,
    private readonly startedFfmpegContainer: StartedTestContainer,
    private readonly network: StartedNetwork
  ) {
    super(startedTestContainer);
    this.serverUrl = `http://${this.getHost()}:${this.getMappedPort(4444)}/wd/hub`;
  }

  getServerUrl(): string {
    return this.serverUrl;
  }

  override async stop(options?: Partial<StopOptions>): Promise<StoppedTestContainer> {
    const stoppedSeleniumContainer = super.stop(options);
    const stoppedFfmpegContainer = await this.startedFfmpegContainer.stop({ removeContainer: false, timeout: 60_000 }); // give time to save video

    const videoArchiveStream = await stoppedFfmpegContainer.getArchive("/videos/video.mp4");
    await new Promise<void>((resolve) => {
      const writeStream = createWriteStream("/tmp/videos/test.tar");
      videoArchiveStream.pipe(writeStream);
      writeStream.on("close", () => {
        const source = createReadStream("/tmp/videos/test.tar");
        const dest = tar.extract("/tmp/videos");
        source.pipe(dest);
        source.on("close", () => resolve());
      });
    });

    // await this.network.stop();

    return stoppedSeleniumContainer;
  }
}
