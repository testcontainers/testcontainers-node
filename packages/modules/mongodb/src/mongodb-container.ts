import { satisfies } from "compare-versions";
import { AbstractStartedContainer, GenericContainer, StartedTestContainer, Wait } from "testcontainers";

const MONGODB_PORT = 27017;

export class MongoDBContainer extends GenericContainer {
  private username = "";
  private password = "";

  constructor(image: string) {
    super(image);
    this.withExposedPorts(MONGODB_PORT).withStartupTimeout(120_000);
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

  public override async start(): Promise<StartedMongoDBContainer> {
    const cmdArgs = ["--replSet", "rs0", "--bind_ip_all"];
    this.withHealthCheck({
      test: ["CMD", ...this.buildMongoEvalCommand(this.buildMongoWaitCommand())],
      startPeriod: 1_000,
      timeout: 60_000,
      retries: 10,
      interval: 2_000,
    }).withWaitStrategy(Wait.forHealthCheck());
    if (this.authEnabled()) {
      cmdArgs.push("--keyFile", "/data/db/key.txt");
      this.withEnvironment({
        MONGO_INITDB_ROOT_USERNAME: this.username,
        MONGO_INITDB_ROOT_PASSWORD: this.password,
      })
        .withCopyContentToContainer([
          {
            content: "1111111111",
            mode: 0o400,
            target: "/data/db/key.txt",
          },
        ])
        .withCommand(cmdArgs);
    } else {
      this.withCommand(cmdArgs);
    }
    return new StartedMongoDBContainer(await super.start(), this.username, this.password);
  }

  private buildMongoEvalCommand(command: string) {
    const useMongosh = satisfies(this.imageName.tag, ">=5.0.0");
    const args = [];
    if (useMongosh) args.push("mongosh");
    else args.push("mongo", "admin");
    args.push("-u", this.username, "-p", this.password, "--eval", command);
    return args;
  }

  private buildMongoWaitCommand() {
    return `rs.initiate(); while (db.runCommand({isMaster: 1}).ismaster==false) { sleep(1000); } `;
  }

  private authEnabled() {
    return this.username && this.password;
  }
}

export class StartedMongoDBContainer extends AbstractStartedContainer {
  private readonly username: string = "";
  private readonly password: string = "";

  constructor(startedTestContainer: StartedTestContainer, username: string, password: string) {
    super(startedTestContainer);
    this.username = username;
    this.password = password;
  }

  public getConnectionString(): string {
    if (this.username && this.password)
      return `mongodb://${this.username}:${this.password}@${this.getHost()}:${this.getMappedPort(MONGODB_PORT)}?authSource=admin`;
    return `mongodb://${this.getHost()}:${this.getMappedPort(MONGODB_PORT)}`;
  }
}
