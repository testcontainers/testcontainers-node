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
  protected sourceDirectoryToCopy: string;

  constructor(image: string, sourceDirectoryToCopy: string) {
    super(image);

    this.sourceDirectoryToCopy = sourceDirectoryToCopy;

    this.directoriesToCopy = [
      {
        source: sourceDirectoryToCopy,
        target: CONTAINER_WORKING_DIRECTORY,
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

  public override async start(): Promise<StartedPlaywrightReportingContainer> {
    const startedTestContainer = await super
      .withWorkingDir(CONTAINER_WORKING_DIRECTORY)
      .withCopyDirectoriesToContainer(this.directoriesToCopy)
      // .withCommand(["sleep", "infinity"])
      //.withCommand(["npm", "install"])
      //.withCommand(["npm", "playwright", "test", "--reporter=html"])
      .start();

    // await startedTestContainer.exec(["npm", "install"]);
    // await startedTestContainer.exec(["npm", "playwright", "test", "--reporter=html"]);
    // await startedTestContainer.exec(["sleep", "infinity"]);

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

  public async saveHtmlReport(target: string): Promise<void> {
    try {
      const containerId = this.getId();
      log.debug("Extracting archive from container...", { containerId });
      const archiveStream = await this.copyArchiveFromContainer(CONTAINER_HTML_REPORT_PATH);
      log.debug("Extracted archive from container", { containerId });

      log.debug("Unpacking archive...", { containerId });
      const destinationDir = tmp.dirSync({ keep: false });
      await this.extractTarStreamToDest(archiveStream, destinationDir.name);
      log.debug("Unpacked archive", { containerId });

      const reportFile = path.resolve(destinationDir.name, CONTAINER_HTML_REPORT_FILE);
      await copyFile(reportFile, target);
      log.debug(`Extracted report from "${target}"`, { containerId });
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
