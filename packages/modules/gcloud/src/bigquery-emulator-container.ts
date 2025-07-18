import { AbstractStartedContainer, GenericContainer, StartedTestContainer, Wait } from "testcontainers";

const EMULATOR_PORT = 9050;

export class BigQueryEmulatorContainer extends GenericContainer {
  private _projectId?: string;

  constructor(image: string) {
    super(image);
    this.withExposedPorts(EMULATOR_PORT).withWaitStrategy(Wait.forListeningPorts()).withStartupTimeout(120_000);

    // The BigQuery emulator image is not multi platform
    // so this fix is needed for ARM architectures
    if (process.arch === "arm64") {
      this.withPlatform("linux/amd64");
    }
  }

  public withProjectId(projectId: string): BigQueryEmulatorContainer {
    this._projectId = projectId;
    return this;
  }

  public override async start(): Promise<StartedBigQueryEmulatorContainer> {
    // project flag is required, and corresponds to the projectId variable
    const projectId = this._projectId ?? "test-project";
    this.withCommand(["--project", projectId]);

    return new StartedBigQueryEmulatorContainer(await super.start(), projectId);
  }
}

export class StartedBigQueryEmulatorContainer extends AbstractStartedContainer {
  constructor(
    startedTestContainer: StartedTestContainer,
    private readonly projectId: string
  ) {
    super(startedTestContainer);
  }

  /**
   * @return a <code>http://host:port</code> pair corresponding to the address on which the emulator is
   * reachable from the test host machine.
   */
  public getEmulatorEndpoint(): string {
    return `http://${this.getHost()}:${this.getMappedPort(EMULATOR_PORT)}`;
  }

  /**
   * @returns the project ID associated with the emulator.
   */
  public getProjectId(): string {
    return this.projectId;
  }
}
