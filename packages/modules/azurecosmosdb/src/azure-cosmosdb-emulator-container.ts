import {
  AbstractStartedContainer,
  GenericContainer,
  PortGenerator,
  RandomUniquePortGenerator,
  StartedTestContainer,
  Wait,
} from "testcontainers";

type Protocol = "http" | "https";
const DEFAULT_KEY = "C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw=="; // default key for Cosmos DB Emulator
const DEFAULT_PROTOCOL = "http";
const DEFAULT_TELEMETRY_ENABLED = false;
const DEFAULT_EXPLORER_ENABLED = false;

const COSMOS_READY_LOG_MESSAGE = "Now listening on: ";

export class AzureCosmosDbEmulatorContainer extends GenericContainer {
  private key = DEFAULT_KEY;
  private protocol: Protocol = DEFAULT_PROTOCOL;
  private telemetryEnabled = DEFAULT_TELEMETRY_ENABLED;
  private explorerEnabled = DEFAULT_EXPLORER_ENABLED;
  private portGenerator: PortGenerator;

  constructor(image = "mcr.microsoft.com/cosmosdb/linux/azure-cosmos-emulator:vnext-EN20250228") {
    super(image);
    this.portGenerator = new RandomUniquePortGenerator();
    this.withWaitStrategy(Wait.forLogMessage(COSMOS_READY_LOG_MESSAGE));
  }

  public withProtocol(protocol: Protocol): this {
    this.protocol = protocol;
    return this;
  }

  public withTelemetryEnabled(telemetryEnabled: boolean): this {
    this.telemetryEnabled = telemetryEnabled;
    return this;
  }

  public override async start(): Promise<StartedAzureCosmosDbEmulatorContainer> {
    const port = await this.portGenerator.generatePort();
    this.withExposedPorts({
      host: port,
      container: port,
    });
    this.withEnvironment({
      PROTOCOL: this.protocol,
      PORT: port.toString(),
      ENABLE_TELEMETRY: this.telemetryEnabled.toString(),
      ENABLE_EXPLORER: this.explorerEnabled.toString(),
    });

    return new StartedAzureCosmosDbEmulatorContainer(await super.start(), this.key, port, this.protocol);
  }
}

export class StartedAzureCosmosDbEmulatorContainer extends AbstractStartedContainer {
  constructor(
    startedContainer: StartedTestContainer,
    private readonly key: string,
    private readonly port: number,
    private readonly protocol: Protocol
  ) {
    super(startedContainer);
  }

  public getPort(): number {
    return this.port;
  }

  public getKey(): string {
    return this.key;
  }

  public getEndpoint(): string {
    const proto = this.protocol === "http" ? "http" : "https";
    return `${proto}://${this.getHost()}:${this.getPort()}`;
  }

  /**
   * Returns a connection URI in the format:
   * AccountEndpoint=[protocol]://[host]:[port];AccountKey=[key];
   */
  public getConnectionUri(): string {
    return `AccountEndpoint=${this.getEndpoint()};AccountKey=${this.getKey()};`;
  }
}
