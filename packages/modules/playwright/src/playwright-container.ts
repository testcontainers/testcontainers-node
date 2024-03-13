import { copyFile } from "fs/promises";
import path from "path";
import tar from "tar-fs";
import tmp from "tmp";
import { existsSync, mkdirSync } from "fs";

import {
  AbstractStartedContainer,
  AbstractStoppedContainer,
  GenericContainer,
  StartedTestContainer,
  StopOptions,
  StoppedTestContainer,
  log,
} from "testcontainers";

const CONTAINER_WORKING_DIRECTORY = "/playwright";
const DEFAULT_JSON_REPORTER_FILE = "results.json";
const DEFAULT_HTML_REPORTER_OUTPUT_DIRECTORY = "/test-reports";
const DEFAULT_HTML_REPORTER_FILE = "index.html";
const DEFAULT_BLOB_REPORTER_FILE = "report.zip";
const DEFAULT_BLOB_REPORTER_OUTPUT_DIRECTORY = "/blob-report";
const DEFAULT_JUNIT_REPORTER_FILE = "results.xml";

const EXPORTABLE_REPORTER_TYPE = {
  JSON: "json",
  HTML: "html",
  BLOB: "blob",
  JUNIT: "junit",
} as const;

type ExportableReporterType = (typeof EXPORTABLE_REPORTER_TYPE)[keyof typeof EXPORTABLE_REPORTER_TYPE];

type ContainerReporter = {
  type: ExportableReporterType;
  outputFile?: string;
  outputDir?: string;
  fileName?: string;
};

export class PlaywrightContainer extends GenericContainer {
  constructor(
    image = "mcr.microsoft.com/playwright:latest",
    externalPlaywrightTestsDirectoryToCopyIntoContainerWorkingDirectory: string
  ) {
    super(image);

    this.directoriesToCopy = [
      {
        source: externalPlaywrightTestsDirectoryToCopyIntoContainerWorkingDirectory,
        target: CONTAINER_WORKING_DIRECTORY,
        mode: 755,
      },
    ];
  }

  protected override async beforeContainerCreated(): Promise<void> {
    this.withWorkingDir(CONTAINER_WORKING_DIRECTORY)
      .withCopyDirectoriesToContainer(this.directoriesToCopy)
      .withEntrypoint(["/bin/sleep"])
      .withCommand(["infinity"]);
  }

  override async start(): Promise<StartedPlaywrightContainer> {
    const startedTestContainer = await super.start();
    const { output, exitCode } = await startedTestContainer.exec(["npm", "i"]);

    if (exitCode !== 0) {
      throw new Error(`Playwright container install dependencies failed with exit code ${exitCode}: ${output}`);
    }

    return new StartedPlaywrightContainer(startedTestContainer);
  }
}

export class StartedPlaywrightContainer extends AbstractStartedContainer {
  constructor(startedTestContainer: StartedTestContainer) {
    super(startedTestContainer);
  }

  private async extractTarStreamToDestination(tarStream: NodeJS.ReadableStream, dest: string): Promise<void> {
    await new Promise<void>((resolve) => {
      const destination = tar.extract(dest);
      tarStream.pipe(destination);
      destination.on("finish", resolve);
    });
  }

  private createDirectoryIfNotExists(directoryPath: string): void {
    if (existsSync(directoryPath)) {
      return;
    }

    log.debug(`Creating directory path "${directoryPath}" that not exists...`);
    mkdirSync(directoryPath);
    log.debug(`Created directory path "${directoryPath}" that not exists`);
  }

  private getContainerReporterFile({ type, outputFile, fileName }: ContainerReporter): string {
    if (type === EXPORTABLE_REPORTER_TYPE.HTML) {
      return DEFAULT_HTML_REPORTER_FILE;
    }

    if (type === EXPORTABLE_REPORTER_TYPE.JSON) {
      return outputFile || DEFAULT_JSON_REPORTER_FILE;
    }

    if (type === EXPORTABLE_REPORTER_TYPE.BLOB) {
      return fileName || DEFAULT_BLOB_REPORTER_FILE;
    }

    if (type === EXPORTABLE_REPORTER_TYPE.JUNIT) {
      return fileName || DEFAULT_JUNIT_REPORTER_FILE;
    }

    return "";
  }

  private getReporterPath({ type, outputFile, outputDir, fileName }: ContainerReporter): string {
    const containerReporterFile = this.getContainerReporterFile({ type, outputFile, fileName });

    let containerReporterOutputDir = "";
    let reporterPath = "";

    if (type === EXPORTABLE_REPORTER_TYPE.HTML) {
      containerReporterOutputDir = outputDir || DEFAULT_HTML_REPORTER_OUTPUT_DIRECTORY;

      reporterPath = path.format({
        root: "/ignored",
        dir: `${CONTAINER_WORKING_DIRECTORY}/${containerReporterOutputDir}`,
        base: containerReporterFile,
      });
    }

    if (type === EXPORTABLE_REPORTER_TYPE.JSON) {
      reporterPath = path.join(CONTAINER_WORKING_DIRECTORY, containerReporterFile);
    }

    if (type === EXPORTABLE_REPORTER_TYPE.BLOB) {
      containerReporterOutputDir = outputDir || DEFAULT_BLOB_REPORTER_OUTPUT_DIRECTORY;

      reporterPath = path.format({
        root: "/ignored",
        dir: `${CONTAINER_WORKING_DIRECTORY}/${containerReporterOutputDir}`,
        base: containerReporterFile,
      });
    }

    if (type === EXPORTABLE_REPORTER_TYPE.JUNIT) {
      reporterPath = path.format({
        root: "/ignored",
        dir: `${CONTAINER_WORKING_DIRECTORY}`,
        base: containerReporterFile,
      });
    }

    return reporterPath;
  }

  public async saveReporter(
    { type, outputFile, outputDir, fileName }: ContainerReporter,
    destinationReporterPath: string
  ): Promise<void> {
    try {
      const containerId = this.getId();
      const reporterPath = this.getReporterPath({ type, outputFile, outputDir, fileName });

      log.debug("Extracting archive from container...", { containerId });
      const archiveStream = await this.copyArchiveFromContainer(reporterPath);
      log.debug("Extracted archive from container", { containerId });

      log.debug("Unpacking archive...", { containerId });
      const destinationDir = tmp.dirSync({ keep: false });
      await this.extractTarStreamToDestination(archiveStream, destinationDir.name);
      log.debug("Unpacked archive", { containerId });

      const containerReporterFile = this.getContainerReporterFile({ type, outputFile, fileName });
      const sourceReporterPath = path.resolve(destinationDir.name, `${containerReporterFile}`);
      const destinationDirectoryPath = path.dirname(destinationReporterPath);

      log.debug(`Creating destination directory "${destinationDirectoryPath}..."`);
      this.createDirectoryIfNotExists(destinationDirectoryPath);
      log.debug(`Created destination directory "${destinationDirectoryPath}"`);

      log.debug(`Copying report to "${destinationReporterPath}..."`);
      await copyFile(sourceReporterPath, destinationReporterPath, 1);
      log.debug(`Copy report to "${destinationReporterPath}"`);
    } catch (error) {
      log.error(`${error}`);
    }
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
