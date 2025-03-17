import { AbstractStartedContainer, GenericContainer, StartedTestContainer, Wait } from "testcontainers";
import { EmulatorFlagsManager } from "./emulator-flags-manager";

const EMULATOR_PORT = 8080;
const CMD = `gcloud beta emulators firestore start`;
const DEFAULT_IMAGE = "gcr.io/google.com/cloudsdktool/cloud-sdk";

export class FirestoreEmulatorContainer extends GenericContainer {
  private readonly _flagsManager: EmulatorFlagsManager;
  constructor(image = DEFAULT_IMAGE) {
    super(image);
    this._flagsManager = new EmulatorFlagsManager();
    this.withExposedPorts(EMULATOR_PORT)
      .withFlag("host-port", `0.0.0.0:${EMULATOR_PORT}`)
      .withWaitStrategy(Wait.forLogMessage(/.*running.*/, 1))
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
    return this;
  }

  public override async start(): Promise<StartedFirestoreEmulatorContainer> {
    // expand all flags and get final command
    this.withCommand(["/bin/sh", "-c", this.getCmd()]);
    return new StartedFirestoreEmulatorContainer(await super.start());
  }
}

export class StartedFirestoreEmulatorContainer extends AbstractStartedContainer {
  constructor(startedTestContainer: StartedTestContainer) {
    super(startedTestContainer);
  }

  /**
   * @return a <code>host:port</code> pair corresponding to the address on which the emulator is
   * reachable from the test host machine.
   */
  public getEmulatorEndpoint(): string {
    return `${this.getHost()}:${this.getMappedPort(EMULATOR_PORT)}`;
  }
}
