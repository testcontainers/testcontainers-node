import { AbstractStartedContainer, GenericContainer, StartedTestContainer, Wait } from "testcontainers";

const QDRANT_REST_PORT = 6333;
const QDRANT_GRPC_PORT = 6334;
const QDRANT_CONFIG_FILE_PATH = "/qdrant/config/config.yaml";

export class QdrantContainer extends GenericContainer {
  private apiKey: string | undefined;
  private configFilePath: string | undefined;

  constructor(image = "qdrant/qdrant:v1.13.4") {
    super(image);
    this.withExposedPorts(QDRANT_REST_PORT, QDRANT_GRPC_PORT);
    this.withWaitStrategy(
      Wait.forAll([
        Wait.forLogMessage(/Actix runtime found; starting in Actix runtime/),
        Wait.forHttp("/readyz", QDRANT_REST_PORT),
      ])
    );
  }

  public withApiKey(apiKey: string): this {
    this.apiKey = apiKey;
    return this;
  }

  public withConfigFile(configFile: string): this {
    this.configFilePath = configFile;
    return this;
  }

  public override async start(): Promise<StartedQdrantContainer> {
    if (this.apiKey) {
      this.withEnvironment({
        QDRANT__SERVICE__API_KEY: this.apiKey,
      });
    }

    if (this.configFilePath) {
      this.withBindMounts([
        {
          target: QDRANT_CONFIG_FILE_PATH,
          source: this.configFilePath,
        },
      ]);
    }
    return new StartedQdrantContainer(await super.start());
  }
}

export class StartedQdrantContainer extends AbstractStartedContainer {
  private readonly _restPort: number;

  public get restPort(): number {
    return this._restPort;
  }

  private readonly _grpcPort: number;

  public get grpcPort(): number {
    return this._grpcPort;
  }

  constructor(override readonly startedTestContainer: StartedTestContainer) {
    super(startedTestContainer);
    this._restPort = this.getMappedPort(QDRANT_REST_PORT);
    this._grpcPort = this.getMappedPort(QDRANT_GRPC_PORT);
  }

  public getRestHostAddress(): string {
    return `${this.getHost()}:${this.restPort}`;
  }

  public getGrpcHostAddress(): string {
    return `${this.getHost()}:${this.grpcPort}`;
  }
}
