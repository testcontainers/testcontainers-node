import { AbstractStartedContainer, GenericContainer, StartedTestContainer } from "testcontainers";

const LOCAL_DYNAMO_PORT = 8000;

export class DynamoDBContainer extends GenericContainer {
  constructor(image = "amazon/dynamodb-local") {
    super(image);
  }

  public override async start(): Promise<StartedDynamoDBContainer> {
    this.withExposedPorts(LOCAL_DYNAMO_PORT).withStartupTimeout(120_000);

    return new StartedDynamoDBContainer(await super.start());
  }
}

export class StartedDynamoDBContainer extends AbstractStartedContainer {
  constructor(startedTestContainer: StartedTestContainer) {
    super(startedTestContainer);
  }

  public getConfig() {
    return {
      region: "us-east-1",
      endpoint: this.getConnectionString(),
    };
  }

  public getConnectionString(): string {
    return `http://${this.getHost()}:${this.getMappedPort(LOCAL_DYNAMO_PORT)}`;
  }
}
