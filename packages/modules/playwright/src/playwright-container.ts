import { copyFile } from "node:fs/promises";
import path from "path";
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
const PLAYWRIGHT_HTML_REPORT_FILE = "playwright.html";
const PLAYWRIGHT_CONTAINER_TEMPORARY_HTML_REPORT_PATH = `/tmp/${PLAYWRIGHT_HTML_REPORT_FILE}`;

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

  protected override async beforeContainerCreated(): Promise<void> {
    this.withExposedPorts(PLAYWRIGHT_CONTAINER_PORT)
      .withWorkingDir(PLAYWRIGHT_CONTAINER_WORKING_DIRECTORY)
      .withCopyDirectoriesToContainer(this.directoriesToCopy)
      .withEntrypoint(["bash", "-c", "npm install && npx playwright test --reporter=html"]);
  }

  public withReporting(target: string): PlaywrightReportingContainer {
    return new PlaywrightReportingContainer(this.imageName.string, this.sourceDirectoryToCopy, target);
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
  private readonly target: string;

  constructor(image: string, source: string, target: string) {
    super(image, source);
    this.target = target;
  }

  protected override async beforeContainerCreated(): Promise<void> {
    this.withCommand(["bash", "-c", "tail -f /dev/null"]);
  }

  public override async start(): Promise<StartedPlaywrightReportingContainer> {
    return new StartedPlaywrightReportingContainer(await super.start(), this.target);
  }
}

export class StartedPlaywrightReportingContainer extends StartedPlaywrightContainer {
  private readonly target: string;

  constructor(startedPlaywrightContainer: StartedTestContainer, target: string) {
    super(startedPlaywrightContainer);
    this.target = target;
    this.saveHtmlReport(target);
  }

  private async extractTarStreamToDest(tarStream: NodeJS.ReadableStream, dest: string): Promise<void> {
    await new Promise<void>((resolve) => {
      const destination = tar.extract(dest);
      tarStream.pipe(destination);
      destination.on("finish", resolve);
    });
  }

  protected async saveHtmlReport(target: string): Promise<void> {
    try {
      const containerId = this.getId();
      log.debug("Extracting archive from container...", { containerId });
      const archiveStream = await this.copyArchiveFromContainer(PLAYWRIGHT_CONTAINER_TEMPORARY_HTML_REPORT_PATH);
      log.debug("Extracted archive from container", { containerId });

      log.debug("Unpacking archive...", { containerId });
      const destinationDir = tmp.dirSync({ keep: false });
      await this.extractTarStreamToDest(archiveStream, destinationDir.name);
      log.debug("Unpacked archive", { containerId });

      const reportFile = path.resolve(destinationDir.name, PLAYWRIGHT_HTML_REPORT_FILE);
      await copyFile(reportFile, target);
      log.debug(`Extracted report from "${target}"`, { containerId });
    } catch (error) {
      const containerId = this.getId();
      log.error(`You have and error ${error} extracting archive from container ${containerId} to ${target}.`);
    }
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
}
