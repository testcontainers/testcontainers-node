import { AbstractStartedContainer, GenericContainer } from "testcontainers";

// https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.UsageNotes.html#DynamoDBLocal.Endpoint
const DYNAMODB_PORT = 8000;

/* When running in AWS we do not have to pass any client configuration:
 *
 * * The default endpoint will be used
 * * The region will be inferred from the lambda region
 * * The credentials are taken from the lambda IAM role
 *
 * When connecting locally, we have to provide all three eventhough region
 * and credentials are not really relevant. We want to help the user with
 * a minimal configuration that works
 */
type DynamoDBLocalClientConfig = {
  endpoint: string;
  region: string;
  credentials: {
    readonly accessKeyId: string;
    readonly secretAccessKey: string;
  };
};

export class DynamoDBContainer extends GenericContainer {
  private sharedDB: boolean = false;
  private inMemory: boolean = false;
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
   * Ensure the database is kept in memory
   *
   * Use this option to keep the complete database in memory. This will
   * pass `-inMemory` to the container.
   * Fore more information please read
   * https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.UsageNotes.html#DynamoDBLocal.CommandLineOptions
   */
  public withInMemory(): this {
    this.inMemory = true;
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
    if (this.sharedDB) {
      command.push("-sharedDb");
    }
    if (this.inMemory) {
      command.push("-inMemory");
    }
    if (this.disableTelemetry) {
      command.push("-disableTelemetry");
    }
    if (this.dbPath) {
      command.push("-dbPath", this.dbPath);
    }

    if (command.length === 0) {
      return null;
    }

    // If we pass arguments we also have to pass
    // -jar DynamoDBLocal.jar
    return ["-jar", "DynamoDBLocal.jar", ...command];
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

  /**
   * Returns a partial DynamoDBConfig
   *
   * When intializing a DynamoDB client inside AWS itself (e.g. inside a
   * lambda) we do not have to pass any configuration settings. When
   * connecting locally, we have to set at least `endpoint`,
   * `region` (can be a dummy) and `credentials` (can also be a dummy).
   *
   * `clientConfig` will return minimal configuration with `endpoint`, a dummy
   * `region` of `us-east-1` and dummy credentials.
   *
   * This allows you to intialize a client through
   *
   * ```js
   * const client = new DynamoDBClient(container.clientConfig());
   * ```
   */
  public clientConfig(): DynamoDBLocalClientConfig {
    // The AWS credentials you see here are fake credentials and taken from the
    // following example:
    // https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html
    return {
      endpoint: this.getEndpoint(),
      region: "us-east-1",
      credentials: {
        accessKeyId: "AKIAIOSFODNN7EXAMPLE",
        secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
      },
    };
  }
}
