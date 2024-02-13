import { copyFile } from "fs/promises";
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

// const CONTAINER_PORT = 9323;
const CONTAINER_WORKING_DIRECTORY = "/playwright";
const CONTAINER_HTML_REPORT_FILE = "index.html";
const CONTAINER_REPORTS_DIRECTORY = "playwright-report";
const CONTAINER_REPORTS_DIRECTORY_PATH = path.resolve(CONTAINER_WORKING_DIRECTORY, CONTAINER_REPORTS_DIRECTORY);
const CONTAINER_HTML_REPORT_PATH = path.resolve(CONTAINER_REPORTS_DIRECTORY_PATH, CONTAINER_HTML_REPORT_FILE);

export class PlaywrightContainer extends GenericContainer {
  directoryToCopyIntoWorkingDirectory: string;

  constructor(image: string, directoryToCopyIntoWorkingDirectory: string) {
    super(image);

    this.directoryToCopyIntoWorkingDirectory = directoryToCopyIntoWorkingDirectory;

    this.directoriesToCopy = [
      {
        source: directoryToCopyIntoWorkingDirectory,
        target: CONTAINER_WORKING_DIRECTORY,
        mode: 755,
      },
    ];
  }

  public withReporting(): PlaywrightReportingContainer {
    return new PlaywrightReportingContainer(this.imageName.string, this.directoryToCopyIntoWorkingDirectory);
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
  constructor(image: string, directoryToCopyIntoWorkingDirectory: string) {
    super(image, directoryToCopyIntoWorkingDirectory);
  }

  protected override async beforeContainerCreated(): Promise<void> {
    this.withWorkingDir(CONTAINER_WORKING_DIRECTORY)
      .withCopyDirectoriesToContainer(this.directoriesToCopy)
      .withEntrypoint(["/bin/sleep"])
      .withCommand(["infinity"]);
  }

  public override async start(): Promise<StartedPlaywrightReportingContainer> {
    const startedTestContainer = await super.start();
    await startedTestContainer.exec(["npm", "i"]);
    await startedTestContainer.exec(["npx", "playwright", "test", "--reporter=html"]);

    return new StartedPlaywrightReportingContainer(startedTestContainer);
  }
}

export class StartedPlaywrightReportingContainer extends StartedPlaywrightContainer {
  constructor(startedTestContainer: StartedTestContainer) {
    super(startedTestContainer);
  }

  private async extractTarStreamToDest(tarStream: NodeJS.ReadableStream, dest: string): Promise<void> {
    await new Promise<void>((resolve) => {
      const destination = tar.extract(dest);
      tarStream.pipe(destination);
      destination.on("finish", resolve);
    });
  }

  public async saveHtmlReport(reportTargetPath: string): Promise<void> {
    try {
      const containerId = this.getId();
      log.debug("Extracting archive from container...", { containerId });
      const archiveStream = await this.copyArchiveFromContainer("/playwright-report/index.html");
      log.debug("Extracted archive from container", { containerId });

      log.debug("Unpacking archive...", { containerId });
      const destinationDir = tmp.dirSync({ keep: false });
      await this.extractTarStreamToDest(archiveStream, destinationDir.name);
      log.debug("Unpacked archive", { containerId });

      const reportFile = path.resolve(destinationDir.name, CONTAINER_HTML_REPORT_FILE);
      await copyFile(reportFile, reportTargetPath);
      log.debug(`Extracted report to "${reportTargetPath}"`, { containerId });
    } catch (error) {
      log.error(`${error}`);
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
