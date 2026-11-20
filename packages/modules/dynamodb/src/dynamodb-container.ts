import { AbstractStartedContainer, GenericContainer, Wait } from "testcontainers";

// https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.UsageNotes.html#DynamoDBLocal.Endpoint
const DYNAMODB_PORT = 8000;

export class DynamoDBContainer extends GenericContainer {
  private sharedDB: boolean = false;

  constructor(image: string) {
    super(image);
    this.withExposedPorts(DYNAMODB_PORT)
      .withStartupTimeout(120_000)
      .withWaitStrategy(Wait.forHttp("/", DYNAMODB_PORT).forStatusCode(400))
      .withEnvironment({
        DDB_LOCAL_TELEMETRY: "0",
      });
  }

  public withSharedDB(): this {
    this.sharedDB = true;
    return this;
  }

  public override async start(): Promise<StartedDynamoDBContainer> {
    this.withCommand(["-jar", "DynamoDBLocal.jar", "-inMemory", ...(this.sharedDB ? ["-sharedDb"] : [])]);

    const started = await super.start();
    return new StartedDynamoDBContainer(started);
  }
}

export class StartedDynamoDBContainer extends AbstractStartedContainer {
  public getPort(): number {
    return this.startedTestContainer.getMappedPort(DYNAMODB_PORT);
  }

  public getEndpoint(): string {
    return `http://${this.getHost()}:${this.getPort()}`;
  }
}
