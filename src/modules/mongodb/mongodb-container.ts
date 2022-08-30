import { GenericContainer } from "../../generic-container/generic-container";
import { RandomUuid } from "../../uuid";
import { AbstractStartedContainer } from "../abstract-started-container";
import { Port } from "../../port";
import { StartedTestContainer } from "../../test-container";

const MONGODB_INTERNAL_PORT = 27017;
const TWO_MINUTES = 120_000;

export class MongoDBContainer extends GenericContainer {
  private database = "test";
  private rootUsername = new RandomUuid().nextUuid();
  private rootPassword = new RandomUuid().nextUuid();

  constructor(image = "mongo:6.0.1") {
    super(image);
  }

  public withDatabase(database: string): this {
    this.database = database;
    return this;
  }

  public withRootUsername(rootUsername: string): this {
    this.rootUsername = rootUsername;
    return this;
  }

  public withRootPassword(rootPassword: string): this {
    this.rootPassword = rootPassword;
    return this;
  }
  public async start(): Promise<StartedMongoDBContainer> {
    this.withExposedPorts(...(this.hasExposedPorts ? this.ports : [MONGODB_INTERNAL_PORT]))
      .withEnv("MONGO_INITDB_DATABASE", this.database)
      .withEnv("MONGO_INITDB_ROOT_USERNAME", this.rootUsername)
      .withEnv("MONGO_INITDB_ROOT_PASSWORD", this.rootPassword)
      .withStartupTimeout(TWO_MINUTES)
      .withCmd(["--auth"]);

    return new StartedMongoDBContainer(await super.start(), this.database, this.rootUsername, this.rootPassword);
  }
}

export class StartedMongoDBContainer extends AbstractStartedContainer {
  private readonly port: Port;

  constructor(
    startedTestContainer: StartedTestContainer,
    private readonly database: string,
    private readonly rootUserName: string,
    private readonly rootPassword: string
  ) {
    super(startedTestContainer);
    this.port = startedTestContainer.getMappedPort(MONGODB_INTERNAL_PORT);
  }

  public getPort(): Port {
    return this.port;
  }

  public getDatabase(): string {
    return this.database;
  }

  public getRootUsername(): string {
    return this.rootUserName;
  }

  public getRootPassword(): string {
    return this.rootPassword;
  }
}
