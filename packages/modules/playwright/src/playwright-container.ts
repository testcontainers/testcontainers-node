import { copyFile } from "node:fs/promises";
import path from "path";
import tar from "tar-fs";
import tmp from "tmp";

import {
  AbstractStartedContainer,
  AbstractStoppedContainer,
  GenericContainer,
  log,
  StartedTestContainer,
  StopOptions,
  StoppedTestContainer,
} from "testcontainers";

const PLAYWRIGHT_PORT = 9323;

const PLAYWRIGHT_HTML_REPORT_FILE = "playwright.html";

const PLAYWRIGHT_HTML_REPORT_PATH = `/tmp/${PLAYWRIGHT_HTML_REPORT_FILE}`;

const PLAYWRIGHT_WORKING_DIRECTORY = "/playwright";

export class PlaywrightContainer extends GenericContainer {
  constructor(image: string) {
    super(image);
  }

  protected override async beforeContainerCreated(): Promise<void> {
    this.withExposedPorts(PLAYWRIGHT_PORT)
      .withWorkingDir(PLAYWRIGHT_WORKING_DIRECTORY)
      .withCopyDirectoriesToContainer(this.directoriesToCopy)
      .withEnvironment({ PLAYWRIGHT_HTML_REPORT: PLAYWRIGHT_HTML_REPORT_PATH })
      .withEntrypoint(["bash", "-c", "npm install && npx playwright test --reporter=html"]);
  }

  public withReporting(directoryToCopy: string): PlaywrightReportingContainer {
    return new PlaywrightReportingContainer(this.imageName.string, directoryToCopy);
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

  override async stop(options?: Partial<StopOptions>): Promise<StoppedPlaywrightContainer> {
    const stoppedPlaywrightContainer = await super.stop(options);
    return new StoppedPlaywrightContainer(stoppedPlaywrightContainer);
  }
}

export class StoppedPlaywrightContainer extends AbstractStoppedContainer {
  constructor(stoppedPlaywrightContainer: StoppedTestContainer) {
    super(stoppedPlaywrightContainer);
  }
}

export class PlaywrightReportingContainer extends PlaywrightContainer {
  protected directoryToCopy: string;

  constructor(image: string, directoryToCopy: string) {
    super(image);

    this.directoryToCopy = directoryToCopy;

    this.directoriesToCopy = [
      {
        source: directoryToCopy,
        target: PLAYWRIGHT_WORKING_DIRECTORY,
        mode: 755,
      },
    ];
  }

  public override async start(): Promise<StartedPlaywrightReportingContainer> {
    const startedPlaywrightReportingContainer = await super.start();
    return new StartedPlaywrightReportingContainer(startedPlaywrightReportingContainer);
  }
}

export class StartedPlaywrightReportingContainer extends StartedPlaywrightContainer {
  constructor(startedPlaywrightContainer: StartedTestContainer) {
    super(startedPlaywrightContainer);
  }

  override async stop(options?: Partial<StopOptions>): Promise<StoppedPlaywrightReportingContainer> {
    const stoppedPlaywrightReportingContainer = await super.stop(options);
    return new StoppedPlaywrightReportingContainer(stoppedPlaywrightReportingContainer);
  }
}

export class StoppedPlaywrightReportingContainer extends StoppedPlaywrightContainer {
  constructor(stoppedPlaywrightReportingContainer: StoppedTestContainer) {
    super(stoppedPlaywrightReportingContainer);
  }

  async streamHtmlReport(): Promise<NodeJS.ReadableStream> {
    return this.copyArchiveFromContainer(PLAYWRIGHT_HTML_REPORT_PATH);
  }

  private async extractTarStreamToDest(tarStream: NodeJS.ReadableStream, dest: string): Promise<void> {
    await new Promise<void>((resolve) => {
      const destination = tar.extract(dest);
      tarStream.pipe(destination);
      destination.on("finish", resolve);
    });
  }

  async getHtmlReport(reportPath: string): Promise<void> {
    try {
      const containerId = this.getId();
      log.debug("Extracting archive from container...", { containerId });
      const archiveStream = await this.copyArchiveFromContainer(PLAYWRIGHT_HTML_REPORT_PATH);
      log.debug("Extracted archive from container", { containerId });

      log.debug("Unpacking archive...", { containerId });
      const destinationDir = tmp.dirSync({ keep: false });
      await this.extractTarStreamToDest(archiveStream, destinationDir.name);
      log.debug("Unpacked archive", { containerId });

      const reportFile = path.resolve(destinationDir.name, PLAYWRIGHT_HTML_REPORT_FILE);
      await copyFile(reportFile, reportPath);
      log.debug(`Extracted report to "${reportPath}"`, { containerId });
    } catch (error) {
      const containerId = this.getId();
      log.error(`You have and error ${error} extracting archive from container ${containerId} to ${reportPath}.`);
    }
  }
}
