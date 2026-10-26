import { AbstractStartedContainer, GenericContainer } from "testcontainers";

// https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.UsageNotes.html#DynamoDBLocal.Endpoint
const DYNAMODB_PORT = 8000;

export class DynamoDBContainer extends GenericContainer {
  private sharedDB: boolean = false;
  private disableTelemetry: boolean = false;
  private dbPath?: string;

  constructor(image: string) {
    super(image);
    this.withExposedPorts(DYNAMODB_PORT).withStartupTimeout(120_000);
  }

  /**
   * Share table between clients
   *
   * By default the DynamoDB container will present different tables
   * depending on the current AWS access key.
   *
   * Use this option to use a shared database instead. This will
   * pass ´-sharedDb` to the container. For more information please read
   * https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.UsageNotes.html#DynamoDBLocal.CommandLineOptions
   */
  public withSharedDB(): this {
    this.sharedDB = true;
    return this;
  }

  /**
   * Specify a database path
   *
   * Specify a directory (for example `.`) to persist the
   * database. This can be used to preserve tables between container
   * restarts but in general is not required.
   *
   * This option will set `-dbPath` when invoking the container.
   * Fore more information please read
   * https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.UsageNotes.html#DynamoDBLocal.CommandLineOptions
   *
   * @param dbPath - The path to the database file inside the container
   */
  public withDbPath(dbPath: string): this {
    this.dbPath = dbPath;
    return this;
  }

  /**
   * Do not sent any telemetry
   *
   * By default the AWS DynamoDB container will sent telemetry information.
   * Use this option to pass `-disableTelemetry` to the container
   * Fore more information please read
   * https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.UsageNotes.html#DynamoDBLocal.CommandLineOptions
   */
  public withDisableTelemetry(): this {
    this.disableTelemetry = true;
    return this;
  }

  /**
   * Start the DynamoDB container
   */
  public override async start(): Promise<StartedDynamoDBContainer> {
    const command = this.createCommand();
    if (command) {
      this.withCommand(command);
    }

    const started = await super.start();
    return new StartedDynamoDBContainer(started);
  }

  private createCommand(): string[] | null {
    const command: string[] = [];
    let skipInMemory = false;
    if (this.sharedDB) {
      command.push("-sharedDb");
    }
    if (this.disableTelemetry) {
      command.push("-disableTelemetry");
    }
    if (this.dbPath) {
      command.push("-dbPath", this.dbPath);
      skipInMemory = true;
    }

    if (command.length === 0) {
      return null;
    }

    // The defaut command is
    // -jar DynamoDBLocal.jar -inMemory
    return ["-jar", "DynamoDBLocal.jar", ...(skipInMemory ? [] : ["-inMemory"]), ...command];
  }
}

export class StartedDynamoDBContainer extends AbstractStartedContainer {
  public getPort(): number {
    return this.startedTestContainer.getMappedPort(DYNAMODB_PORT);
  }

  /*+
   * Returns the endpoint to reach the DynamoDB service
   *
   * The returned endpoint can be used to pass to your DynamoDB client. You
   * can also use `clientConfig` instead which provides you a complete
   * client configuration suitable for most usecases
   */
  public getEndpoint(): string {
    const hostname = this.getHost();
    const url = new URL(`http://${hostname}`);
    url.port = this.getPort().toString();
    return url.toString();
  }
}
