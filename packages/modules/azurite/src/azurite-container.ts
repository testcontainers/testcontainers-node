import {
  AbstractStartedContainer,
  GenericContainer,
  getContainerPort,
  hasHostBinding,
  PortWithOptionalBinding,
  StartedTestContainer,
  Wait,
} from "testcontainers";

const BLOB_PORT = 10000;
const QUEUE_PORT = 10001;
const TABLE_PORT = 10002;
const DEFAULT_ACCOUNT_NAME = "devstoreaccount1";
const DEFAULT_ACCOUNT_KEY = "Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==";
const PEM_CERT_PATH = "/azurite-cert.pem";
const PEM_KEY_PATH = "/azurite-key.pem";
const PFX_CERT_PATH = "/azurite-cert.pfx";

type Protocol = "http" | "https";

export class AzuriteContainer extends GenericContainer {
  constructor(image: string) {
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
  private cert?: string = undefined;
  private certPath?: string = undefined;
  private key?: string = undefined;
  private password?: string = undefined;
  private oauthEnabled = false;

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

  /**
   * Configure SSL with a custom certificate and private key.
   *
   * @param cert The PEM certificate file content.
   * @param key The PEM key file content.
   */
  public withSsl(cert: string, key: string): this {
    this.cert = cert;
    this.key = key;
    this.password = undefined;
    this.certPath = PEM_CERT_PATH;
    return this;
  }

  /**
   * Configure SSL with a custom certificate and password.
   *
   * @param cert The PFX certificate file content.
   * @param password The password securing the certificate.
   */
  public withSslPfx(cert: string, password: string): this {
    this.cert = cert;
    this.key = undefined;
    this.password = password;
    this.certPath = PFX_CERT_PATH;
    return this;
  }

  /**
   * Enable OAuth authentication with basic mode.
   */
  public withOAuth(): this {
    this.oauthEnabled = true;
    return this;
  }

  public override async start(): Promise<StartedAzuriteContainer> {
    const command = ["--blobHost", "0.0.0.0", "--queueHost", "0.0.0.0", "--tableHost", "0.0.0.0"];

    if (this.oauthEnabled && this.cert === undefined) {
      throw new Error("OAuth requires HTTPS endpoint. Configure SSL first with withSsl() or withSslPfx().");
    }

    if (this.inMemoryPersistence) {
      command.push("--inMemoryPersistence");

      if (this.extentMemoryLimitInMegaBytes) {
        command.push("--extentMemoryLimit", this.extentMemoryLimitInMegaBytes.toString());
      }
    }

    if (this.skipApiVersionCheck) {
      command.push("--skipApiVersionCheck");
    }

    if (this.cert !== undefined && this.certPath !== undefined) {
      const contentsToCopy = [
        {
          content: this.cert,
          target: this.certPath,
          mode: 0o644,
        },
      ];

      if (this.key) {
        contentsToCopy.push({
          content: this.key,
          target: PEM_KEY_PATH,
          mode: 0o600,
        });
      }

      this.withCopyContentToContainer(contentsToCopy);
      command.push("--cert", this.certPath);

      if (this.key) {
        command.push("--key", PEM_KEY_PATH);
      } else if (this.password !== undefined) {
        command.push("--pwd", this.password);
      }
    }

    if (this.oauthEnabled) {
      command.push("--oauth", "basic");
    }

    this.withCommand(command).withExposedPorts(this.blobPort, this.queuePort, this.tablePort);

    if (this.accountName !== DEFAULT_ACCOUNT_NAME || this.accountKey !== DEFAULT_ACCOUNT_KEY) {
      this.withEnvironment({
        AZURITE_ACCOUNTS: `${this.accountName}:${this.accountKey}`,
      });
    }

    const protocol: Protocol = this.cert === undefined ? "http" : "https";
    const startedContainer = await super.start();

    return new StartedAzuriteContainer(
      startedContainer,
      this.accountName,
      this.accountKey,
      this.blobPort,
      this.queuePort,
      this.tablePort,
      protocol
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
    private readonly tablePort: PortWithOptionalBinding,
    private readonly protocol: Protocol
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
      const containerPort = getContainerPort(this.blobPort);
      return this.getMappedPort(containerPort);
    }
  }

  public getQueuePort(): number {
    if (hasHostBinding(this.queuePort)) {
      return this.queuePort.host;
    } else {
      const containerPort = getContainerPort(this.queuePort);
      return this.getMappedPort(containerPort);
    }
  }

  public getTablePort(): number {
    if (hasHostBinding(this.tablePort)) {
      return this.tablePort.host;
    } else {
      const containerPort = getContainerPort(this.tablePort);
      return this.getMappedPort(containerPort);
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
    return `DefaultEndpointsProtocol=${this.protocol};AccountName=${this.accountName};AccountKey=${
      this.accountKey
    };BlobEndpoint=${this.getBlobEndpoint()};QueueEndpoint=${this.getQueueEndpoint()};TableEndpoint=${this.getTableEndpoint()};`;
  }

  private getEndpoint(port: number, containerName: string): string {
    const url = new URL(`${this.protocol}://${this.getHost()}`);
    url.port = port.toString();
    url.pathname = containerName;
    return url.toString();
  }
}
