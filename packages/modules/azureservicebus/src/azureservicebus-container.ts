import {
  AbstractStartedContainer,
  Content,
  GenericContainer,
  Network,
  StartedNetwork,
  StartedTestContainer,
  Wait,
} from "testcontainers";

const DEFAULT_PORT = 5672;
const DEFAULT_HTTP_PORT = 5300;
const DEFAULT_SHARED_ACCESS_KEY_NAME = "RootManageSharedAccessKey";
const DEFAULT_SHARED_ACCESS_KEY = "SAS_KEY_VALUE";
const DEFAULT_MSSQL_ALIAS = "mssql";
const DEFAULT_MSSQL_IMAGE = "mcr.microsoft.com/mssql/server:2022-CU14-ubuntu-22.04";
const DEFAULT_MSSQL_PASSWORD = "P@ssword1!d3adb33f#";
const CONTAINER_CONFIG_FILE = "/ServiceBus_Emulator/ConfigFiles/Config.json";

export class AzureServiceBusContainer extends GenericContainer {
  private acceptEula: string = "N";
  private mssqlContainer: GenericContainer | undefined;
  private mssqlImage: string = DEFAULT_MSSQL_IMAGE;
  private mssqlPassword: string = DEFAULT_MSSQL_PASSWORD;
  private config: Content | undefined;

  constructor(image: string) {
    super(image);

    this.withExposedPorts(DEFAULT_PORT, DEFAULT_HTTP_PORT)
      // The emulator image is minimal and does not include a shell, so the internal port checks will fail.
      // The HTTP health check should be sufficient to determine when the emulator is ready.
      .withWaitStrategy(Wait.forHttp("/health", DEFAULT_HTTP_PORT).forStatusCode(200))
      .withEnvironment({
        SQL_WAIT_INTERVAL: "0", // We start the MSSQL container before the emulator
      });
  }

  public acceptLicense(): this {
    this.acceptEula = "Y";
    return this;
  }

  public withMssqlContainer(container: GenericContainer): this {
    if (this.mssqlImage !== DEFAULT_MSSQL_IMAGE) {
      throw new Error("Cannot use both withMssqlImage() and withMssqlContainer()");
    }

    this.mssqlContainer = container;
    return this;
  }

  public withMssqlImage(image: string): this {
    if (this.mssqlContainer) {
      throw new Error("Cannot use both withMssqlImage() and withMssqlContainer()");
    }

    this.mssqlImage = image;
    return this;
  }

  public withMssqlPassword(password: string): this {
    if (this.mssqlPassword !== DEFAULT_MSSQL_PASSWORD) {
      throw new Error("Cannot use both withMssqlPassword() and withMssqlContainer()");
    }

    this.mssqlPassword = password;
    return this;
  }

  public withConfig(config: Content): this {
    this.config = config;
    return this;
  }

  public override async start(): Promise<StartedAzureServiceBusContainer> {
    const network = await new Network().start();
    this.withNetwork(network);

    if (!this.mssqlContainer) {
      // This should match the behaviour of @testcontainers/mssqlserver, we
      // create the container manually here to avoid module dependencies.
      this.mssqlContainer = new GenericContainer(this.mssqlImage)
        .withEnvironment({
          ACCEPT_EULA: "Y",
          MSSQL_SA_PASSWORD: this.mssqlPassword,
        })
        .withExposedPorts(1433)
        .withWaitStrategy(Wait.forLogMessage(/.*Recovery is complete.*/, 1).withStartupTimeout(120_000));
    }

    const mssql = await this.mssqlContainer.withNetworkAliases(DEFAULT_MSSQL_ALIAS).withNetwork(network).start();

    if (this.config) {
      this.withCopyContentToContainer([
        {
          content: this.config,
          target: CONTAINER_CONFIG_FILE,
          mode: 0o644,
        },
      ]);
    }

    this.withEnvironment({
      ACCEPT_EULA: this.acceptEula,
      SQL_SERVER: mssql.getHostname(),
      MSSQL_SA_PASSWORD: this.mssqlPassword,
    });

    try {
      const serviceBus = await super.start();

      return new StartedAzureServiceBusContainer(serviceBus, mssql, network);
    } catch (err) {
      await mssql.stop();
      await network.stop();

      throw err;
    }
  }
}

export class StartedAzureServiceBusContainer extends AbstractStartedContainer {
  constructor(
    startedTestContainer: StartedTestContainer,
    private readonly mssql: StartedTestContainer,
    private readonly network: StartedNetwork
  ) {
    super(startedTestContainer);
  }

  public getMssqlContainer(): StartedTestContainer {
    return this.mssql;
  }

  public getPort(): number {
    return this.getMappedPort(DEFAULT_PORT);
  }

  public getConnectionString(): string {
    return `Endpoint=sb://${this.getHost()}:${this.getPort()};SharedAccessKeyName=${DEFAULT_SHARED_ACCESS_KEY_NAME};SharedAccessKey=${DEFAULT_SHARED_ACCESS_KEY};UseDevelopmentEmulator=true;`;
  }

  protected override async containerStopped(): Promise<void> {
    try {
      await this.mssql.stop();
    } finally {
      await this.network.stop();
    }
  }
}
