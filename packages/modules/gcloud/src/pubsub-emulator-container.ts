import { AbstractStartedContainer, GenericContainer, StartedTestContainer, Wait } from "testcontainers";
import { EmulatorFlagsManager } from "./emulator-flags-manager";

const EMULATOR_PORT = 8085;
const CMD = "gcloud beta emulators pubsub start";
const DEFAULT_IMAGE = "gcr.io/google.com/cloudsdktool/google-cloud-cli";

export class PubSubEmulatorContainer extends GenericContainer {
  private readonly _flagsManager: EmulatorFlagsManager;
  private _projectId?: string;

  constructor(image = DEFAULT_IMAGE) {
    super(image);
    this._flagsManager = new EmulatorFlagsManager();
    this.withExposedPorts(EMULATOR_PORT)
      .withFlag("host-port", `0.0.0.0:${EMULATOR_PORT}`)
      .withWaitStrategy(Wait.forLogMessage(/Server started/g, 1))
      .withStartupTimeout(120_000);
  }

  private getCmd(): string {
    return `${CMD} ${this.flagsManager.expandFlags()}`;
  }

  private get flagsManager() {
    return this._flagsManager;
  }

  /**
   * Adds flag as argument to emulator start command.
   * Adding same flag name twice replaces existing flag value.
   * @param name flag name. Must be set to non-empty string. May optionally contain -- prefix.
   * @param value flag value. May be empty string.
   * @returns this instance for chaining.
   */
  public withFlag(name: string, value: string) {
    this.flagsManager.withFlag(name, value);
    // we need to 'refresh' command as we add new flag
    this.withCommand(["/bin/sh", "-c", this.getCmd()]);
    return this;
  }

  public withProjectId(projectId: string): this {
    this._projectId = projectId;
    return this;
  }

  public override async start(): Promise<StartedPubSubEmulatorContainer> {
    // Determine the valid command-line prompt when starting the Pub/Sub emulator
    const selectedProjectId = this._projectId ?? "test-project";
    this.withFlag("project", selectedProjectId)
      // explicitly call withCommand() fn here
      // it will be called implicitly inside prev withFlag() call
      .withCommand(["/bin/sh", "-c", this.getCmd()]);

    return new StartedPubSubEmulatorContainer(await super.start(), selectedProjectId);
  }
}

export class StartedPubSubEmulatorContainer extends AbstractStartedContainer {
  constructor(startedTestContainer: StartedTestContainer, private readonly projectId: string) {
    super(startedTestContainer);
  }

  /**
   * @return a <code>host:port</code> pair corresponding to the address on which the emulator is
   * reachable from the test host machine.
   */
  public getEmulatorEndpoint(): string {
    return `${this.getHost()}:${this.getMappedPort(EMULATOR_PORT)}`;
  }

  /**
   * @returns the project ID associated with the Pub/Sub emulator.
   */
  public getProjectId(): string {
    return this.projectId;
  }
}
