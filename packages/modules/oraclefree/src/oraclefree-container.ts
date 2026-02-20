import { AbstractStartedContainer, GenericContainer, StartedTestContainer, Wait } from "testcontainers";

const ORACLEDB_PORT = 1521;
const DEFAULT_DATABASE = "FREEPDB1";

export class OracleDbContainer extends GenericContainer {

  private username = "test"
  private password = "test"
  private database?: string = undefined; // default database in the container

  constructor(image: string) {
    super(image);
    this.withExposedPorts(ORACLEDB_PORT);
    this.withWaitStrategy(Wait.forLogMessage("DATABASE IS READY TO USE!"));
    this.withStartupTimeout(120_000);
  }

  public withUsername(username: string): this {
    this.username = username;
    return this;
  }

  public withPassword(password: string): this {
    this.password = password;
    return this;
  }

  public withDatabase(database: string): this {
    if (database === DEFAULT_DATABASE) throw new Error(`The default database "${DEFAULT_DATABASE}" cannot be used. Please choose a different name for the database.`);
    this.database = database;
    return this;
  }

  public override async start(): Promise<StartedOracleDbContainer> {
    this.withEnvironment({
      ORACLE_PASSWORD: this.password,
      APP_USER: this.username,
      APP_USER_PASSWORD: this.password,
    });

    if (this.database) {
      this.withEnvironment({
        ORACLE_DATABSE: this.database,
      });
    }

    return new StartedOracleDbContainer(await super.start(), this.username, this.password, this.database ?? DEFAULT_DATABASE);
  }
}

export class StartedOracleDbContainer extends AbstractStartedContainer {
  constructor(
    startedTestContainer: StartedTestContainer,
    private readonly username: string,
    private readonly password: string,
    private readonly database: string
  ) {
    super(startedTestContainer);
  }

  public getPort(): number {
    return this.getMappedPort(ORACLEDB_PORT);
  }

  public getUsername(): string {
    return this.username;
  }

  public getPassword(): string {
    return this.password;
  }

  public getDatabase(): string {
    return this.database;
  }

  public getUrl(): string {
    return `${this.getHost()}:${this.getPort()}/${this.database}`;
  }

  public getConnectionDescriptor(): string {
    return `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=${this.getHost()})(PORT=${this.getPort()}))(CONNECT_DATA=(SERVICE_NAME=${this.database})))`;
  }
}