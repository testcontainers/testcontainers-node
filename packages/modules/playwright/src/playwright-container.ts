import fs from "node:fs";
import tar from "tar-fs";

import {
  AbstractStartedContainer,
  AbstractStoppedContainer,
  GenericContainer,
  StartedNetwork,
  StartedTestContainer,
  StopOptions,
  StoppedTestContainer,
} from "testcontainers";

const PLAYWRIGHT_PORT = 9323;

const PLAYWRIGHT_HTML_REPORT_PATH = "/tmp/playwright.html";

export class PlaywrightContainer extends GenericContainer {
  protected directoryToCopy: string;

  constructor(image: string, directoryToCopy: string) {
    super(image);

    this.directoryToCopy = directoryToCopy;
    this.directoriesToCopy = [
      {
        source: directoryToCopy,
        target: "/playwright",
        mode: 755,
      },
    ];
  }

  protected override async beforeContainerCreated(): Promise<void> {
    this.withExposedPorts(9323)
      .withWorkingDir("/playwright")
      .withEnvironment({ PLAYWRIGHT_HTML_REPORT: PLAYWRIGHT_HTML_REPORT_PATH })
      .withEntrypoint(["bash", "-c", "npm install && npx playwright test --reporter=html"]);
  }

  override async start(): Promise<StartedPlaywrightContainer> {
    return new StartedPlaywrightContainer(await super.start());
  }
}

export class StartedPlaywrightContainer extends AbstractStartedContainer {
  private readonly serverUrl: string;

  constructor(startedTestContainer: StartedTestContainer) {
    super(startedTestContainer);
    this.serverUrl = `http://${this.getHost()}:${this.getMappedPort(PLAYWRIGHT_PORT)}`;
  }

  getServerUrl(): string {
    return this.serverUrl;
  }

  async streamHtmlReport(): Promise<NodeJS.ReadableStream> {
    return this.copyArchiveFromContainer(PLAYWRIGHT_HTML_REPORT_PATH);
  }

  override async stop(options?: Partial<StopOptions>): Promise<StoppedPlaywrightContainer> {
    return new StoppedPlaywrightContainer(await super.stop(options));
  }
}

export class StoppedPlaywrightContainer extends AbstractStoppedContainer {
  constructor(private readonly stoppedPlaywrightContainer: StoppedTestContainer) {
    super(stoppedPlaywrightContainer);
  }
}

export class StartedPlaywrightReporterContainer extends StartedPlaywrightContainer {
  constructor(
    startedPlaywrightContainer: StartedTestContainer,
    private readonly startedReportContainer: StartedTestContainer,
    private readonly network: StartedNetwork
  ) {
    super(startedPlaywrightContainer);
  }

  override async stop(options?: Partial<StopOptions>): Promise<StoppedPlaywrightReporterContainer> {
    const stoppedSeleniumContainer = await super.stop(options);
    const stoppedFfmpegContainer = await this.startedFfmpegContainer.stop({ remove: false, timeout: 60_000 });
    await this.network.stop();
    return new StoppedPlaywrightReporterContainer(stoppedSeleniumContainer, stoppedFfmpegContainer);
  }
}

export class StoppedPlaywrightReporterContainer extends StoppedPlaywrightContainer {
  /*constructor(
    stoppedSeleniumContainer: StoppedTestContainer,
    private readonly stoppedFfmpegContainer: StoppedTestContainer
) {
    super(stoppedSeleniumContainer);
  }

  private async extractTarStreamToDest(tarStream: NodeJS.ReadableStream, dest: string): Promise<void> {
    await new Promise<void>((resolve) => {
      const destination = tar.extract(dest);
      tarStream.pipe(destination);
      destination.on("finish", resolve);
    });
  }

  async getHtmlReport(reportPath: string): Promise<void> {
    log.debug("Extracting archive from container...", { containerId: this.id });
    const inputStream = await this.copyArchiveFromContainerMultiplexed(PLAYWRIGHT_HTML_REPORT_PATH);
    const outputStream = fs.createWriteStream(reportPath);

    await this.extractTarStreamToDest(archiveStream, destinationDir.name);

    try {
      inputStream.pipe(outputStream);

      return new Promise<void>((resolve) => {
        outputStream.on("finish", () => {
          console.info(`You have successfully created a ${reportPath}.`);
          resolve();
        });
      });
    } catch (error) {
      console.error(`You have and error ${error} creating a ${reportPath}.`);
    }
  }*/
}
