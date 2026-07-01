import { AbstractStartedContainer, GenericContainer, StartedTestContainer, Wait } from "testcontainers";

const MONGODB_PORT = 27017;
const DEFAULT_DATABASE_NAME = "test";

export class MongoDBAtlasLocalContainer extends GenericContainer {
  private username: string | undefined;
  private password: string | undefined;

  constructor(image: string) {
    super(image);
    this.withExposedPorts(MONGODB_PORT)
      .withWaitStrategy(Wait.forSuccessfulCommand("runner healthcheck"))
      .withStartupTimeout(120_000);
  }

  public withUsername(username: string): this {
    if (!username) throw new Error("Username should not be empty.");
    this.username = username;
    return this;
  }

  public withPassword(password: string): this {
    if (!password) throw new Error("Password should not be empty.");
    this.password = password;
    return this;
  }

  public override async start(): Promise<StartedMongoDBAtlasLocalContainer> {
    if (this.username && this.password) {
      // Note: the Atlas Local image uses MONGODB_INITDB_* (vs MONGO_INITDB_* in mongodb-container.ts).
      // This difference is intentional — do not "fix" it to match the sibling file.
      this.withEnvironment({
        MONGODB_INITDB_ROOT_USERNAME: this.username,
        MONGODB_INITDB_ROOT_PASSWORD: this.password,
      });
    }

    return new StartedMongoDBAtlasLocalContainer(await super.start(), this.username, this.password);
  }
}

export class StartedMongoDBAtlasLocalContainer extends AbstractStartedContainer {
  constructor(
    startedTestContainer: StartedTestContainer,
    private readonly username: string | undefined,
    private readonly password: string | undefined
  ) {
    super(startedTestContainer);
  }

  public getConnectionString(): string {
    return this.buildConnectionString();
  }

  public getDatabaseConnectionString(databaseName = DEFAULT_DATABASE_NAME): string {
    return this.buildConnectionString(databaseName);
  }

  private buildConnectionString(databaseName?: string): string {
    const url = new URL("mongodb://");
    url.hostname = this.getHost();
    url.port = this.getMappedPort(MONGODB_PORT).toString();
    url.pathname = databaseName ? `/${databaseName}` : "/";

    if (this.username && this.password) {
      url.username = this.username;
      url.password = this.password;
      url.searchParams.set("authSource", "admin");
    }

    return url.toString();
  }
}
