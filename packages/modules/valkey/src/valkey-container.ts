import path from "path";
import { AbstractStartedContainer, GenericContainer, StartedTestContainer, Wait } from "testcontainers";

const VALKEY_PORT = 6379;

export class ValkeyContainer extends GenericContainer {
  private readonly importFilePath = "/tmp/import.valkey";
  private password? = "";
  private username? = "";
  private persistenceVolume? = "";
  private initialImportScriptFile? = "";

  constructor(image: string) {
    super(image);
    this.withExposedPorts(VALKEY_PORT)
      .withStartupTimeout(120_000)
      .withWaitStrategy(Wait.forLogMessage("Ready to accept connections"));
  }

  public withPassword(password: string): this {
    this.password = password;
    return this;
  }

  public withUsername(username: string): this {
    this.username = username;
    return this;
  }

  public withPersistence(sourcePath: string): this {
    this.persistenceVolume = sourcePath;
    return this;
  }

  public withInitialData(importScriptFile: string): this {
    this.initialImportScriptFile = importScriptFile;
    return this;
  }

  protected override async containerStarted(container: StartedTestContainer): Promise<void> {
    if (this.initialImportScriptFile) {
      await this.importInitialData(container);
    }
  }

  public override async start(): Promise<StartedValkeyContainer> {
    const authCommand = this.password ? [
      `--requirepass "${this.password}"`,
      ...(this.username ? [`--user "${this.username}" on >${this.password} ~* +@all`] : [])
    ] : [];
    this.withCommand([
      "valkey-server",
      ...authCommand,
      ...(this.persistenceVolume ? ["--save 1 1 ", "--appendonly yes"] : []),
    ]);
    if (this.persistenceVolume) {
      this.withBindMounts([{ mode: "rw", source: this.persistenceVolume, target: "/data" }]);
    }
    if (this.initialImportScriptFile) {
      this.withCopyFilesToContainer([
        {
          mode: 666,
          source: this.initialImportScriptFile,
          target: this.importFilePath,
        },
        {
          mode: 777,
          source: path.join(__dirname, "import.sh"),
          target: "/tmp/import.sh",
        },
      ]);
    }

    return new StartedValkeyContainer(await super.start(), this.password, this.username);
  }

  private async importInitialData(container: StartedTestContainer) {
    const re = await container.exec(`/tmp/import.sh ${this.password || ""}`);
    if (re.exitCode !== 0 || re.output.includes("ERR")) {
      throw Error(`Could not import initial data from ${this.initialImportScriptFile}: ${re.output}`);
    }
  }
}

export class StartedValkeyContainer extends AbstractStartedContainer {
  constructor(
    startedTestContainer: StartedTestContainer,
    private readonly password?: string,
    private readonly username?: string,
  ) {
    super(startedTestContainer);
  }

  public getPort(): number {
    return this.getMappedPort(VALKEY_PORT);
  }

  public getPassword(): string {
    return this.password ? this.password.toString() : "";
  }

  public getUsername(): string {
    return this.username ? this.username.toString() : "";
  }

  public getConnectionUrl(): string {
    const url = new URL("", "redis://");
    url.hostname = this.getHost();
    url.port = this.getPort().toString();
    url.password = this.getPassword();
    url.username = this.getUsername();
    return url.toString();
  }

  public async executeCliCmd(cmd: string, additionalFlags: string[] = []): Promise<string> {
    const authCommand = this.password ? [
      `--pass ${this.password}`,
      ...(this.username ? [`--user ${this.username}`] : [])
    ] : [];
    const result = await this.startedTestContainer.exec([
      "redis-cli",
      ...authCommand,
      `${cmd}`,
      ...additionalFlags,
    ]);
    if (result.exitCode !== 0) {
      throw new Error(`executeQuery failed with exit code ${result.exitCode} for query: ${cmd}. ${result.output}`);
    }
    return result.output;
  }
}
