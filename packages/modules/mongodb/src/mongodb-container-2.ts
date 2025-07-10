import { AbstractStartedContainer, ExecResult, GenericContainer, StartedTestContainer, Wait } from "testcontainers";

const MONGODB_PORT = 27017;

export class MongoDBContainer2 extends GenericContainer {
  private username = "";
  private password = "";
  private database = "testcontainers";

  constructor(image: string) {
    super(image);
    this.withExposedPorts(MONGODB_PORT)
      .withWaitStrategy(Wait.forLogMessage(/.*waiting for connections.*/i))
      .withStartupTimeout(120_000);
  }

  public withUsername(username: string): this {
    if (username === "") throw new Error("Username should not be empty.");
    this.username = username;
    return this;
  }

  public withPassword(password: string): this {
    if (password === "") throw new Error("Password should not be empty.");
    this.password = password;
    return this;
  }

  public withDatabase(database: string): this {
    if (database === "") throw new Error("Database should not be empty.");
    this.database = database;
    return this;
  }

  public override async start(): Promise<StartedMongoDBContainer2> {
    if (this.authEnabled()) {
      this.withEnvironment({
        MONGO_INITDB_ROOT_USERNAME: this.username,
        MONGO_INITDB_ROOT_PASSWORD: this.password,
        MONGO_INITDB_DATABASE: this.database,
      })
        .withCopyContentToContainer([
          {
            content: "1111111111",
            mode: 0o400,
            target: "/data/db/key.txt",
          },
        ])
        .withCommand(["--replSet", "rs0", "--keyFile", "/data/db/key.txt"]);
    } else {
      this.withCommand(["--replSet", "rs0"]);
    }
    return new StartedMongoDBContainer2(await super.start(), this.username, this.password, this.database);
  }

  protected override async containerStarted(container: StartedTestContainer): Promise<void> {
    await this.executeMongoEvalCommand(container, this.buildMongoRsInitCommand());
    await this.executeMongoEvalCommand(container, this.buildMongoWaitCommand());
  }

  private async executeMongoEvalCommand(container: StartedTestContainer, command: string) {
    let totalElapsed = 0;
    const waitInterval = 1000;
    const timeout = 60 * waitInterval;
    while (totalElapsed < timeout) {
      const execResult = await container.exec(this.buildMongoEvalCommand(command));
      const output = execResult.output?.trimEnd();
      if (
        output?.endsWith("MongoServerError: Authentication failed.") ||
        output?.includes("MongoNetworkError: connect ECONNREFUSED")
      ) {
        await new Promise((resolve) => setTimeout(resolve, waitInterval));
        totalElapsed += waitInterval;
      } else {
        this.checkMongoNodeExitCode(execResult);
        break;
      }
    }
  }

  private buildMongoEvalCommand(command: string) {
    return ["mongosh", "-u", this.username, "-p", this.password, "--eval", command];
  }

  private checkMongoNodeExitCode(execResult: ExecResult) {
    const { exitCode, output } = execResult;
    if (execResult.exitCode !== 0) {
      throw new Error(`Error running mongo command. Exit code ${exitCode}: ${output}`);
    }
  }

  private buildMongoRsInitCommand() {
    return `
    while (true) {
      try {
        rs.initiate();
        break;
      }
      catch {
        sleep(1000);
      }
    }
    `;
  }

  private buildMongoWaitCommand() {
    return `
    while (true) {
      try {
        rs.status();
        break;
      }
      catch {
        sleep(1000);
      }
    }
    `;
  }

  private authEnabled() {
    return this.username && this.password;
  }
}

export class StartedMongoDBContainer2 extends AbstractStartedContainer {
  private readonly username: string = "";
  private readonly password: string = "";
  private readonly database: string = "";

  constructor(startedTestContainer: StartedTestContainer, username: string, password: string, database: string) {
    super(startedTestContainer);
    this.username = username;
    this.password = password;
    this.database = database;
  }

  public getConnectionString(): string {
    if (this.username && this.password)
      return `mongodb://${this.username}:${this.password}@${this.getHost()}:${this.getMappedPort(MONGODB_PORT)}/${this.database}?authSource=admin`;
    return `mongodb://${this.getHost()}:${this.getMappedPort(MONGODB_PORT)}/${this.database}`;
  }
}
