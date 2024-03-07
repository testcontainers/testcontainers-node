import { copyFile, chmod } from "fs/promises";
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

const REPORTER_OPEN = {
  NEVER: "never",
  ALWAYS: "always",
  ON_FAILURE: "on-failure",
} as const;

const BUILD_IN_REPORTER_TYPE = {
  LINE: "line",
  DOT: "dot",
  LIST: "list",
} as const;

const EXPORTABLE_REPORTER_TYPE = {
  HTML: "html",
  JSON: "json",
  JUNIT: "junit",
} as const;

const PLAYWRIGHT_DEFAULT_HTML_REPORTER_FILE_NAME = "index";
const PLAYWRIGHT_DEFAULT_HTML_REPORTER_OUTPUT_FOLDER = "playwright-report";
const PLAYWRIGHT_DEFAULT_HTML_REPORTER_OPEN = REPORTER_OPEN.ON_FAILURE;
const PLAYWRIGHT_DEFAULT_JSON_REPORTER_FILE_NAME = "results";
const PLAYWRIGHT_DEFAULT_JSON_REPORTER_OUTPUT_FOLDER = "test-results";

// const CONTAINER_PORT = 9323;
const CONTAINER_WORKING_DIRECTORY = "/playwright";
// const CONTAINER_REPORTER_DIRECTORY = "test-results";
// const CONTAINER_REPORTER_DIRECTORY_PATH = path.resolve(CONTAINER_REPORTER_DIRECTORY);

type ValueOf<T> = T[keyof T];

type ExportableHtmlReporterType = typeof EXPORTABLE_REPORTER_TYPE.HTML;

type ExportableJsonReporterType = typeof EXPORTABLE_REPORTER_TYPE.JSON;

type BuildInReporterType = ValueOf<typeof BUILD_IN_REPORTER_TYPE>;

type ExportableReporterType = ValueOf<typeof EXPORTABLE_REPORTER_TYPE>;

type ReporterOpen = ValueOf<typeof REPORTER_OPEN>;

type ExportableHtmlReporterConfig = {
  outputFolder: string;
  open?: ReporterOpen;
};

type ExportableJsonReporterConfig = {
  outputFile: string;
};

type ExportableReporterConfig = ExportableHtmlReporterConfig | ExportableJsonReporterConfig;

type ExportableHtmlReporterTypeWithConfig = [ExportableHtmlReporterType, ExportableHtmlReporterConfig];

type ExportableJsonReporterTypeWithConfig = [ExportableJsonReporterType, ExportableJsonReporterConfig];

type ExportableReporterTypeWithConfig = [ExportableReporterType, ExportableReporterConfig];

type Reporter = BuildInReporterType | ExportableReporterType | ExportableReporterTypeWithConfig;

type BuildInReporter = {
  type: BuildInReporterType;
};

type ExportableReporter = {
  type: ExportableHtmlReporterType | ExportableJsonReporterType;
  outputFolder: string;
  outputFile: string;
  open?: ReporterOpen;
};

const defaultExportableHtmlReporterConfig: ExportableHtmlReporterConfig = {
  outputFolder: PLAYWRIGHT_DEFAULT_HTML_REPORTER_OUTPUT_FOLDER,
  open: PLAYWRIGHT_DEFAULT_HTML_REPORTER_OPEN,
};

const defaultExportableJsonReporterConfig: ExportableJsonReporterConfig = {
  outputFile: PLAYWRIGHT_DEFAULT_JSON_REPORTER_FILE_NAME,
};

const defaultBuildInReporterType = BUILD_IN_REPORTER_TYPE.LIST;
const defaultExportableHtmlReporterType = EXPORTABLE_REPORTER_TYPE.HTML;
const defaultExportableJsonReporterType = EXPORTABLE_REPORTER_TYPE.JSON;

const defaultExportableHtmlReporterTypeWithConfig: ExportableReporterTypeWithConfig = [
  defaultExportableHtmlReporterType,
  defaultExportableHtmlReporterConfig,
];

const defaultExportableJsonReporterTypeWithConfig: ExportableReporterTypeWithConfig = [
  defaultExportableJsonReporterType,
  defaultExportableJsonReporterConfig,
];

const defaultExportableReporterTypeWithConfig = defaultExportableHtmlReporterTypeWithConfig;

const defaultBuildInReporter: BuildInReporter = {
  type: defaultBuildInReporterType,
};

/* const defaultExportableReporter: ExportableReporter = {
  type: defaultExportableHtmlReporterType,
  outputFolder: PLAYWRIGHT_DEFAULT_HTML_REPORTER_OUTPUT_FOLDER,
  outputFile: PLAYWRIGHT_DEFAULT_HTML_REPORTER_FILE_NAME,
  open: PLAYWRIGHT_DEFAULT_HTML_REPORTER_OPEN,
}; */

// PLAYWRIGHT CONTAINER
export class PlaywrightContainer extends GenericContainer {
  private readonly directoryToCopyIntoWorkingDirectory: string;

  public buildInReporter: BuildInReporter = defaultBuildInReporter;

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

  /*
  private isBuildInReporterType(reporter: Reporter): reporter is BuildInReporterType {
    return typeof reporter === "string" && reporter in BUILD_IN_REPORTER_TYPE;
  }
 */
  private isExportableReporterType(reporter: Reporter): reporter is ExportableReporterType {
    return typeof reporter === "string" && reporter in EXPORTABLE_REPORTER_TYPE;
  }

  private isExportableHtmlReporterTypeWithConfig(reporter: Reporter): reporter is ExportableHtmlReporterTypeWithConfig {
    return (
      typeof reporter === "object" &&
      reporter.length === 2 &&
      typeof reporter[0] === "string" &&
      reporter[0] === EXPORTABLE_REPORTER_TYPE.HTML &&
      Object.keys(reporter[1]).includes("outputFolder")
    );
  }

  private isExportableJsonReporterTypeWithConfig(reporter: Reporter): reporter is ExportableJsonReporterTypeWithConfig {
    return (
      typeof reporter === "object" &&
      reporter.length === 2 &&
      typeof reporter[0] === "string" &&
      reporter[0] === EXPORTABLE_REPORTER_TYPE.JSON &&
      Object.keys(reporter[1]).includes("outputFile")
    );
  }

  /*  private isExportableReporterTypeWithConfig(reporter: Reporter): reporter is ExportableReporterTypeWithConfig {
    return (
      this.isExportableHtmlReporterTypeWithConfig(reporter) || this.isExportableJsonReporterTypeWithConfig(reporter)
    );
  }
 */
  private getDefaultReporterWithConfigByType(reporterType: ExportableReporterType): ExportableReporterTypeWithConfig {
    if (reporterType === EXPORTABLE_REPORTER_TYPE.HTML) {
      return defaultExportableHtmlReporterTypeWithConfig;
    }

    if (reporterType === EXPORTABLE_REPORTER_TYPE.JSON) {
      return defaultExportableJsonReporterTypeWithConfig;
    }

    return defaultExportableReporterTypeWithConfig;
  }

  private getExportableReporter(reporter: ExportableReporterTypeWithConfig): ExportableReporter {
    const isExportableHtmlReporterTypeWithConfig = this.isExportableHtmlReporterTypeWithConfig(reporter);

    if (isExportableHtmlReporterTypeWithConfig) {
      return {
        type: EXPORTABLE_REPORTER_TYPE.HTML,
        outputFolder: reporter[1].outputFolder,
        outputFile: `${PLAYWRIGHT_DEFAULT_HTML_REPORTER_FILE_NAME}.${EXPORTABLE_REPORTER_TYPE.HTML}`,
        open: reporter[1].open,
      };
    }

    // if is exportable Json reporter type with config
    return {
      type: EXPORTABLE_REPORTER_TYPE.JSON,
      outputFolder: PLAYWRIGHT_DEFAULT_JSON_REPORTER_OUTPUT_FOLDER,
      outputFile: `${PLAYWRIGHT_DEFAULT_JSON_REPORTER_FILE_NAME}.${EXPORTABLE_REPORTER_TYPE.JSON}`,
    };
  }

  public withBuildInReporter(reporter?: BuildInReporterType): PlaywrightBuildInReporterContainer {
    if (reporter === undefined) {
      return new PlaywrightBuildInReporterContainer(
        this.imageName.string,
        this.directoryToCopyIntoWorkingDirectory,
        defaultBuildInReporterType
      );
    }

    return new PlaywrightBuildInReporterContainer(
      this.imageName.string,
      this.directoryToCopyIntoWorkingDirectory,
      reporter
    );
  }

  public withExportableReporter(
    reporter?: ExportableReporterType | ExportableReporterTypeWithConfig
  ): PlaywrightExportableReporterContainer {
    if (reporter === undefined) {
      const exportableReporter = this.getExportableReporter(defaultExportableReporterTypeWithConfig);

      return new PlaywrightExportableReporterContainer(
        this.imageName.string,
        this.directoryToCopyIntoWorkingDirectory,
        exportableReporter
      );
    }

    const isExportableReporterType = this.isExportableReporterType(reporter);

    // If is exportable reporter with only type
    if (isExportableReporterType) {
      const exportableReporterWithConfig = this.getDefaultReporterWithConfigByType(reporter);
      const exportableReporter = this.getExportableReporter(exportableReporterWithConfig);

      return new PlaywrightExportableReporterContainer(
        this.imageName.string,
        this.directoryToCopyIntoWorkingDirectory,
        exportableReporter
      );
    }

    // If is exportable reporter not only with type is with config too
    const exportableReporter = this.getExportableReporter(reporter);

    return new PlaywrightExportableReporterContainer(
      this.imageName.string,
      this.directoryToCopyIntoWorkingDirectory,
      exportableReporter
    );
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

// PLAYWRIGHT BUILD IN REPORTER CONTAINER
export class PlaywrightBuildInReporterContainer extends PlaywrightContainer {
  buildInReporterType: BuildInReporterType;

  constructor(image: string, directoryToCopyIntoWorkingDirectory: string, buildInReporterType: BuildInReporterType) {
    super(image, directoryToCopyIntoWorkingDirectory);
    this.buildInReporterType = buildInReporterType;
  }

  protected override async beforeContainerCreated(): Promise<void> {
    this.withWorkingDir(CONTAINER_WORKING_DIRECTORY)
      .withCopyDirectoriesToContainer(this.directoriesToCopy)
      .withEntrypoint(["/bin/sleep"])
      .withCommand(["infinity"]);
  }

  public override async start(): Promise<StartedPlaywrightBuildInReporterContainer> {
    const startedTestContainer = await super.start();

    await startedTestContainer.exec(["npm", "i"]);
    await startedTestContainer.exec(["npx", "playwright", "test", `--reporter=${this.buildInReporterType}`]);

    return new StartedPlaywrightBuildInReporterContainer(startedTestContainer);
  }
}

export class StartedPlaywrightBuildInReporterContainer extends StartedPlaywrightContainer {
  constructor(startedTestContainer: StartedTestContainer) {
    super(startedTestContainer);
  }

  override async stop(options?: Partial<StopOptions>): Promise<StoppedPlaywrightBuildInReporterContainer> {
    const stoppedPlaywrightReportingContainer = await super.stop(options);
    return new StoppedPlaywrightBuildInReporterContainer(stoppedPlaywrightReportingContainer);
  }
}

export class StoppedPlaywrightBuildInReporterContainer extends StoppedPlaywrightContainer {
  constructor(stoppedPlaywrightReportingContainer: StoppedTestContainer) {
    super(stoppedPlaywrightReportingContainer);
  }
}

// PLAYWRIGHT EXPORTABLE REPORTER CONTAINER
export class PlaywrightExportableReporterContainer extends PlaywrightContainer {
  private readonly exportableReporter: ExportableReporter;

  constructor(image: string, directoryToCopyIntoWorkingDirectory: string, reporter: ExportableReporter) {
    super(image, directoryToCopyIntoWorkingDirectory);
    this.exportableReporter = reporter;
  }

  private getEnvironment(): Record<string, string> {
    const environment: Record<string, string> = {};

    if (this.exportableReporter.type === EXPORTABLE_REPORTER_TYPE.HTML) {
      environment["PLAYWRIGHT_HTML_REPORT"] = `/this.exportableReporter.outputFolder`;

      if (this.exportableReporter?.open) {
        environment["PW_TEST_HTML_REPORT_OPEN"] = this.exportableReporter.open;
      }
    }

    if (this.exportableReporter.type === EXPORTABLE_REPORTER_TYPE.JSON) {
      environment[
        "PLAYWRIGHT_JSON_OUTPUT_NAME"
      ] = `/${this.exportableReporter.outputFolder}/${this.exportableReporter.outputFile}`;
    }

    return environment;
  }

  protected override async beforeContainerCreated(): Promise<void> {
    const environment = this.getEnvironment();

    this.withWorkingDir(CONTAINER_WORKING_DIRECTORY)
      .withEnvironment(environment)
      .withCopyDirectoriesToContainer(this.directoriesToCopy)
      .withEntrypoint(["/bin/sleep"])
      .withCommand(["infinity"]);
  }

  override async start(): Promise<StartedPlaywrightExportableReporterContainer> {
    const startedTestContainer = await super.start();

    await startedTestContainer.exec(["npm", "i"]);
    await startedTestContainer.exec(["npx", "playwright", "test", `--reporter=${this.exportableReporter.type}`]);

    return new StartedPlaywrightExportableReporterContainer(startedTestContainer, this.exportableReporter);
  }
}

export class StartedPlaywrightExportableReporterContainer extends StartedPlaywrightContainer {
  private readonly exportableReporter: ExportableReporter;

  constructor(startedTestContainer: StartedTestContainer, exportableReporter: ExportableReporter) {
    super(startedTestContainer);
    this.exportableReporter = exportableReporter;
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

  private getPath(filePath: string): string {
    const slashIndex = Math.max(filePath.lastIndexOf("/"), filePath.lastIndexOf("\\"));
    const fileNameWithExtension = filePath.substring(slashIndex + 1);

    return filePath.replace(`/${fileNameWithExtension}`, "");
  }

  public async saveReporter(destinationReporterPath: string): Promise<void> {
    try {
      const containerId = this.getId();
      log.debug("Extracting archive from container...", { containerId });
      const reporterPath = `/${this.exportableReporter.outputFolder}/${this.exportableReporter.outputFile}`;
      const archiveStream = await this.copyArchiveFromContainer(reporterPath);
      log.debug("Extracted archive from container", { containerId });

      log.debug("Unpacking archive...", { containerId });
      const destinationDir = tmp.dirSync({ keep: false });
      await this.extractTarStreamToDestination(archiveStream, destinationDir.name);
      log.debug("Unpacked archive", { containerId });

      const sourceReporterPath = path.resolve(destinationDir.name, `${this.exportableReporter.outputFile}`);
      const destinationDirectoryPath = this.getPath(destinationReporterPath);

      log.debug(`Creating destination directory "${destinationDirectoryPath}..."`);
      this.createDirectoryIfNotExists(destinationDirectoryPath);
      log.debug(`Created destination directory "${destinationDirectoryPath}"`);

      log.debug(`Setting write permissions in destination directory "${destinationDirectoryPath}..."`);
      await chmod(sourceReporterPath, 0o777);
      log.debug(`Set write permissions in destination directory "${destinationDirectoryPath}"`);

      log.debug(`Copying report to "${destinationReporterPath}..."`);

      await copyFile(sourceReporterPath, destinationReporterPath, 1);
      log.debug(`Copy report to "${destinationReporterPath}"`);
    } catch (error) {
      log.error(`${error}`);
    }
  }

  override async stop(options?: Partial<StopOptions>): Promise<StoppedPlaywrightBuildInReporterContainer> {
    const stoppedPlaywrightReportingContainer = await super.stop(options);
    return new StoppedPlaywrightExportableReporterContainer(stoppedPlaywrightReportingContainer);
  }
}

export class StoppedPlaywrightExportableReporterContainer extends StoppedPlaywrightContainer {
  constructor(stoppedPlaywrightReportingContainer: StoppedTestContainer) {
    super(stoppedPlaywrightReportingContainer);
  }
}
