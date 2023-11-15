import { copyFile } from "node:fs/promises";
import path from "node:path";
import tar from "tar-fs";
import tmp from "tmp";

import {
  AbstractStartedContainer,
  AbstractStoppedContainer,
  GenericContainer,
  StartedTestContainer,
  StopOptions,
  StoppedTestContainer,
  log,
} from "testcontainers";

const PLAYWRIGHT_CONTAINER_PORT = 9323;
const PLAYWRIGHT_CONTAINER_WORKING_DIRECTORY = "/playwright";
const PLAYWRIGHT_CONTAINER_HTML_REPORT_FILE = "index.html";
const PLAYWRIGHT_CONTAINER_REPORTS_DIRECTORY = "playwright-report";

const playwrightContainerReportsPath = path.resolve(
  PLAYWRIGHT_CONTAINER_WORKING_DIRECTORY,
  PLAYWRIGHT_CONTAINER_REPORTS_DIRECTORY
);

const playwrightContainerHtmlReportPath = path.resolve(
  playwrightContainerReportsPath,
  PLAYWRIGHT_CONTAINER_HTML_REPORT_FILE
);

export class PlaywrightContainer extends GenericContainer {
  protected sourceDirectoryToCopy: string;

  constructor(image: string, sourceDirectoryToCopy: string) {
    super(image);

    this.sourceDirectoryToCopy = sourceDirectoryToCopy;

    this.directoriesToCopy = [
      {
        source: sourceDirectoryToCopy,
        target: PLAYWRIGHT_CONTAINER_WORKING_DIRECTORY,
        mode: 755,
      },
    ];
  }

  public withReporting(): PlaywrightReportingContainer {
    return new PlaywrightReportingContainer(this.imageName.string, this.sourceDirectoryToCopy);
  }

  override async start(): Promise<StartedPlaywrightContainer> {
    return new StartedPlaywrightContainer(await super.start());
  }
}

export class StartedPlaywrightContainer extends AbstractStartedContainer {
  constructor(startedTestContainer: StartedTestContainer) {
    super(startedTestContainer);
  }

  override async stop(options?: Partial<StopOptions>): Promise<StoppedPlaywrightContainer> {
    return new StoppedPlaywrightContainer(await super.stop(options));
  }
}

export class StoppedPlaywrightContainer extends AbstractStoppedContainer {
  constructor(stoppedPlaywrightContainer: StoppedTestContainer) {
    super(stoppedPlaywrightContainer);
  }
}

export class PlaywrightReportingContainer extends PlaywrightContainer {
  constructor(image: string, source: string) {
    super(image, source);
  }

  protected override async beforeContainerCreated(): Promise<void> {
    this.withExposedPorts(PLAYWRIGHT_CONTAINER_PORT)
      .withWorkingDir(PLAYWRIGHT_CONTAINER_WORKING_DIRECTORY)
      .withCopyDirectoriesToContainer(this.directoriesToCopy)
      .withCommand(["sleep", "infinity"]);
  }

  public override async start(): Promise<StartedPlaywrightReportingContainer> {
    const startedPlaywrightReportingContainer = new StartedPlaywrightReportingContainer(await super.start());
    await startedPlaywrightReportingContainer.exec(["npx", "playwright", "test", "--reporter=html"]);
    return startedPlaywrightReportingContainer;
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

  private async extractTarStreamToDest(tarStream: NodeJS.ReadableStream, dest: string): Promise<void> {
    await new Promise<void>((resolve) => {
      const destination = tar.extract(dest);
      tarStream.pipe(destination);
      destination.on("finish", resolve);
    });
  }

  public async saveHtmlReport(target: string): Promise<void> {
    try {
      const containerId = this.getId();
      log.debug("Extracting archive from container...", { containerId });
      const archiveStream = await this.copyArchiveFromContainer(playwrightContainerHtmlReportPath);
      log.debug("Extracted archive from container", { containerId });

      log.debug("Unpacking archive...", { containerId });
      const destinationDir = tmp.dirSync({ keep: false });
      await this.extractTarStreamToDest(archiveStream, destinationDir.name);
      log.debug("Unpacked archive", { containerId });

      const reportFile = path.resolve(destinationDir.name, PLAYWRIGHT_CONTAINER_HTML_REPORT_FILE);
      await copyFile(reportFile, target);
      log.debug(`Extracted report from "${target}"`, { containerId });
    } catch (error) {
      log.error(`${error}`);
    }
  }
}
