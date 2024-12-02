import {
  AbstractStartedContainer,
  GenericContainer,
  hasHostBinding,
  PortWithOptionalBinding,
  StartedTestContainer,
  Wait,
} from "testcontainers";

const AZURITE_IMAGE = "mcr.microsoft.com/azure-storage/azurite:3.33.0";
const BLOB_PORT = 10000;
const QUEUE_PORT = 10001;
const TABLE_PORT = 10002;
const DEFAULT_ACCOUNT_NAME = "devstoreaccount1";
const DEFAULT_ACCOUNT_KEY = "Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==";

export class AzuriteContainer extends GenericContainer {
  constructor(image = AZURITE_IMAGE) {
    super(image);
    this.withEntrypoint(["azurite"])
      .withWaitStrategy(
        Wait.forAll([
          Wait.forLogMessage(/.*Blob service is successfully listening.*/),
          Wait.forLogMessage(/.*Queue service is successfully listening.*/),
          Wait.forLogMessage(/.*Table service is successfully listening.*/),
        ])
      )
      .withStartupTimeout(120_000);
  }

  private blobPort: PortWithOptionalBinding = BLOB_PORT;
  private queuePort: PortWithOptionalBinding = QUEUE_PORT;
  private tablePort: PortWithOptionalBinding = TABLE_PORT;

  private accountName: string = DEFAULT_ACCOUNT_NAME;
  private accountKey: string = DEFAULT_ACCOUNT_KEY;

  private skipApiVersionCheck = false;
  private inMemoryPersistence = false;
  private extentMemoryLimitInMegaBytes?: number = undefined;

  /**
   * Sets a custom storage account name (default account will be disabled).
   * @param accountName Storage account names must be between 3 and 24 characters in length and may contain numbers and lowercase letters only.
   */
  public withAccountName(accountName: string): this {
    this.accountName = accountName;
    return this;
  }

  /**
   * Sets a custom storage account key (default account will be disabled). Note: MUST be a base64-encoded string.
   * @param accountKey The account keys must be base64 encoded string.
   */
  public withAccountKey(accountKey: string): this {
    this.accountKey = accountKey;
    return this;
  }

  /**
   * Sets the port to expose the Blob service on.
   * @param port The port to expose the Blob service on. Default is 10000.
   */
  public withBlobPort(blobPort: PortWithOptionalBinding): this {
    this.blobPort = blobPort;
    return this;
  }

  /**
   * Sets the port to expose the Queue service on.
   * @param port The port to expose the Queue service on. Default is 10001.
   */
  public withQueuePort(queuePort: PortWithOptionalBinding): this {
    this.queuePort = queuePort;
    return this;
  }

  /**
   * Sets the port to expose the Table service on.
   * @param port The port to expose the Table service on. Default is 10002.
   */
  public withTablePort(tablePort: PortWithOptionalBinding): this {
    this.tablePort = tablePort;
    return this;
  }

  /**
   * Disable persisting any data to disk and only store data in-memory. If the Azurite process is terminated, all data is lost.
   */
  public withInMemoryPersistence(): this {
    this.inMemoryPersistence = true;
    return this;
  }

  /**
   * By default, the in-memory extent store (for blob and queue content) is limited to 50% of the total memory on the host machine. This is evaluated to using os.totalmem(). This limit can be overridden using the extentMemoryLimit <megabytes> option. This can only be used if in-memory persistence is enabled first.
   * @param megabyte The extent memory limit in megabytes.
   */
  public withExtentMemoryLimitInMegaBytes(megabyte: number): this {
    if (!this.inMemoryPersistence) {
      throw new Error("Extent memory limit can only be set when using in-memory persistence");
    }
    this.extentMemoryLimitInMegaBytes = megabyte;
    return this;
  }

  /**
   * By default Azurite will check the request API version is valid API version. This can be disabled by with this option.
   */
  public withSkipApiVersionCheck(): this {
    this.skipApiVersionCheck = true;
    return this;
  }

  public override async start(): Promise<StartedAzuriteContainer> {
    const command = ["--blobHost", "0.0.0.0", "--queueHost", "0.0.0.0", "--tableHost", "0.0.0.0"];

    if (this.inMemoryPersistence) {
      command.push("--inMemoryPersistence");

      if (this.extentMemoryLimitInMegaBytes) {
        command.push("--extentMemoryLimit", this.extentMemoryLimitInMegaBytes.toString());
      }
    }

    if (this.skipApiVersionCheck) {
      command.push("--skipApiVersionCheck");
    }

    this.withCommand(command).withExposedPorts(this.blobPort, this.queuePort, this.tablePort);

    if (this.accountName !== DEFAULT_ACCOUNT_NAME || this.accountKey !== DEFAULT_ACCOUNT_KEY) {
      this.withEnvironment({
        AZURITE_ACCOUNTS: `${this.accountName}:${this.accountKey}`,
      });
    }

    const startedContainer = await super.start();

    return new StartedAzuriteContainer(
      startedContainer,
      this.accountName,
      this.accountKey,
      this.blobPort,
      this.queuePort,
      this.tablePort
    );
  }
}

export class StartedAzuriteContainer extends AbstractStartedContainer {
  constructor(
    startedTestContainer: StartedTestContainer,
    private readonly accountName: string,
    private readonly accountKey: string,
    private readonly blobPort: PortWithOptionalBinding,
    private readonly queuePort: PortWithOptionalBinding,
    private readonly tablePort: PortWithOptionalBinding
  ) {
    super(startedTestContainer);
  }

  public getAccountName(): string {
    return this.accountName;
  }

  public getAccountKey(): string {
    return this.accountKey;
  }

  public getBlobPort(): number {
    if (hasHostBinding(this.blobPort)) {
      return this.blobPort.host;
    } else {
      return this.getMappedPort(this.blobPort);
    }
  }

  public getQueuePort(): number {
    if (hasHostBinding(this.queuePort)) {
      return this.queuePort.host;
    } else {
      return this.getMappedPort(this.queuePort);
    }
  }

  public getTablePort(): number {
    if (hasHostBinding(this.tablePort)) {
      return this.tablePort.host;
    } else {
      return this.getMappedPort(this.tablePort);
    }
  }

  public getBlobEndpoint(): string {
    return this.getEndpoint(this.getBlobPort(), this.accountName);
  }

  public getQueueEndpoint(): string {
    return this.getEndpoint(this.getQueuePort(), this.accountName);
  }

  public getTableEndpoint(): string {
    return this.getEndpoint(this.getTablePort(), this.accountName);
  }

  /**
   * @returns A connection string in the form of `DefaultEndpointsProtocol=[protocol];AccountName=[accountName];AccountKey=[accountKey];BlobEndpoint=[blobEndpoint];QueueEndpoint=[queueEndpoint];TableEndpoint=[tableEndpoint];`
   */
  public getConnectionString(): string {
    return `DefaultEndpointsProtocol=http;AccountName=${this.accountName};AccountKey=${
      this.accountKey
    };BlobEndpoint=${this.getBlobEndpoint()};QueueEndpoint=${this.getQueueEndpoint()};TableEndpoint=${this.getTableEndpoint()};`;
  }

  private getEndpoint(port: number, containerName: string): string {
    const url = new URL(`http://${this.getHost()}`);
    url.port = port.toString();
    url.pathname = containerName;
    return url.toString();
  }
}
