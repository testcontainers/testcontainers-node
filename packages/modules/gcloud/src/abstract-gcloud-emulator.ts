import { GenericContainer, Wait } from "testcontainers";
import { EmulatorFlagsManager } from "./emulator-flags-manager";

export class AbstractGcloudEmulator extends GenericContainer {
  private readonly flagsManager: EmulatorFlagsManager;

  constructor(
    image: string,
    port: number,
    private readonly cmd: string
  ) {
    super(image);
    this.flagsManager = new EmulatorFlagsManager();
    this.withExposedPorts(port)
      .withFlag("host-port", `0.0.0.0:${port}`)
      .withWaitStrategy(Wait.forLogMessage(/.*running.*/))
      .withStartupTimeout(120_000);
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

  public override async beforeContainerCreated(): Promise<void> {
    this.withCommand(["/bin/sh", "-c", `${this.cmd} ${this.flagsManager.expandFlags()}`]);
  }
}
