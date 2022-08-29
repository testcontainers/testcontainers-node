import { GenericContainer } from "../../generic-container/generic-container";
import { RandomUuid } from "../../uuid";
import { AbstractStartedContainer } from "../abstract-started-container";
import { Port } from "../../port";
import { StartedTestContainer } from "../../test-container";

const MONGODB_INTERNAL_PORT = 27017;
const TWO_MINUTES = 120_000;

export class MongoDBContainer extends GenericContainer {
  private database = "test";
  private username = new RandomUuid().nextUuid();
  private password = new RandomUuid().nextUuid();

  constructor(image = "mongo:4.2.22") {
    super(image);
  }

  public withDatabaase(database: string): this {
    this.database = database;
    return this;
  }

  public withUsername(username: string): this {
    this.username = username;
    return this;
  }

  public withPassword(password: string): this {
    this.password = password;
    return this;
  }

  public async start(): Promise<StartedMongoDBContainer> {
    this.withExposedPorts(...(this.hasExposedPorts ? this.ports : [MONGODB_INTERNAL_PORT]))
      .withStartupTimeout(TWO_MINUTES)
      .withEnv("MONGO_DB", this.database)
      .withEnv("MONGO_USER", this.username)
      .withEnv("MONGO_PASSWORD", this.password);

    return new StartedMongoDBContainer(await super.start(), this.database, this.username, this.password);
  }
}

export class StartedMongoDBContainer extends AbstractStartedContainer {
  private readonly port: Port;

  constructor(
    startedTestContainer: StartedTestContainer,
    private readonly database: string,
    private readonly username: string,
    private readonly password: string
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

  public getUsername(): string {
    return this.username;
  }

  public getPassword(): string {
    return this.password;
  }
}
