import { satisfies } from "compare-versions";
import { AbstractStartedContainer, GenericContainer, StartedTestContainer, Wait } from "testcontainers";

const MONGODB_PORT = 27017;

export class MongoDBContainer extends GenericContainer {
  private username: string | undefined;
  private password: string | undefined;

  constructor(image: string) {
    super(image);
    this.withExposedPorts(MONGODB_PORT).withWaitStrategy(Wait.forHealthCheck()).withStartupTimeout(120_000);
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

  public override async start(): Promise<StartedMongoDBContainer> {
    const cmdArgs = ["--replSet", "rs0"];
    if (!this.healthCheck) this.withWaitForRsHealthCheck();
    if (this.username && this.password) {
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

  private withWaitForRsHealthCheck(): this {
    return this.withHealthCheck({
      test: ["CMD-SHELL", this.buildMongoEvalCommand(this.getRsInitCmd())],
      interval: 5000,
      timeout: 60000,
      retries: 1000,
    });
  }

  private buildMongoEvalCommand(command: string) {
    const args = [];
    if (this.isV5OrLater()) args.push("mongosh");
    else args.push("mongo", "admin");
    if (this.username && this.password) args.push("-u", this.username, "-p", this.password);
    args.push("--quiet", "--eval", command);
    return args.join(" ");
  }

  private getRsInitCmd() {
    if (this.isV5OrLater())
      return `'try { rs.status(); } catch (e) { rs.initiate(); } while (db.runCommand({isMaster: 1}).ismaster==false) { sleep(100); }'`;
    else
      return `'try { rs.initiate(); } catch (e) {} while (db.runCommand({isMaster: 1}).ismaster==false) { sleep(100); }'`;
  }

  private isV5OrLater() {
    try {
      return satisfies(this.imageName.tag, ">=5.0.0");
    } catch {
      return false;
    }
  }
}

export class StartedMongoDBContainer extends AbstractStartedContainer {
  private readonly username: string | undefined;
  private readonly password: string | undefined;

  constructor(startedTestContainer: StartedTestContainer, username: string | undefined, password: string | undefined) {
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
