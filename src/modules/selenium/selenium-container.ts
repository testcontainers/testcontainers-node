import { GenericContainer } from "../../generic-container/generic-container";
import { AbstractStartedContainer } from "../abstract-started-container";
import { Wait } from "../../wait-strategy/wait";
import { StartedTestContainer, StopOptions, StoppedTestContainer } from "../../test-container";
import { Network, StartedNetwork } from "../../network";

const SELENIUM_PORT = 4444;
const VNC_PORT = 5900;
const SELENIUM_NETWORK_ALIAS = "selenium";

export class SeleniumContainer extends GenericContainer {
  private recording = false;

  constructor(image = "selenium/standalone-chrome:112.0") {
    super(image);
  }

  protected override async beforeContainerStarted(): Promise<void> {
    this.withExposedPorts(SELENIUM_PORT, VNC_PORT)
      // .withBindMounts([{ source: "/dev/shm", target: "/dev/shm", mode: "rw" }])
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

  public withRecording(): this {
    this.recording = true;
    return this;
  }

  public override async start(): Promise<StartedSeleniumContainer> {
    const network = await new Network().start();
    this.withNetwork(network);
    this.withNetworkAliases(SELENIUM_NETWORK_ALIAS);
    const startedSeleniumContainer = await super.start();

    const ffmpegContainer = await new GenericContainer("selenium/video:ffmpeg-4.3.1-20230508")
      .withNetwork(network)
      .withBindMounts([
        // { source: "/dev/shm", target: "/dev/shm", mode: "rw" },
        { source: "/tmp/videos", target: "/videos", mode: "rw" },
      ])
      .withEnvironment({
        DISPLAY_CONTAINER_NAME: SELENIUM_NETWORK_ALIAS,
        FILE_NAME: startedSeleniumContainer.getId() + ".mp4",
      })
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
    const stoppedTestContainer = super.stop(options);
    await this.startedFfmpegContainer.stop({ timeout: 60_000 }); // give time to save video
    // await this.network.stop();

    return stoppedTestContainer;
  }
}
