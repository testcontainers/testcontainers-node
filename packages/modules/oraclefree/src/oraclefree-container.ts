import { AbstractStartedContainer, GenericContainer, StartedTestContainer, Wait } from "testcontainers";

/** Default Oracle listener port. */
const ORACLEDB_PORT = 1521;
/** Default pluggable database name provided by the Oracle Free image. */
const DEFAULT_DATABASE = "FREEPDB1";

/**
 * Testcontainers wrapper for Oracle Free.
 *
 * Supports configuring application user credentials and optional custom database creation.
 */
export class OracleDbContainer extends GenericContainer {
  private username = "test";
  private password = "test";
  private database?: string = undefined;

  constructor(image: string) {
    super(image);
    this.withExposedPorts(ORACLEDB_PORT);
    this.withWaitStrategy(Wait.forLogMessage("DATABASE IS READY TO USE!"));
    this.withStartupTimeout(120_000);
  }

  /** Sets the application username created at container startup. */
  public withUsername(username: string): this {
    this.username = username;
    return this;
  }

  /** Sets the password for both SYS and application user startup configuration. */
  public withPassword(password: string): this {
    this.password = password;
    return this;
  }

  /** Sets a custom application database/service name. */
  public withDatabase(database: string): this {
    if (database.trim() === "") {
      throw new Error("Database name cannot be empty.");
    }

    if (database.toUpperCase() === DEFAULT_DATABASE) {
      this.database = undefined;
      return this;
    }

    this.database = database;
    return this;
  }

  /** Starts the container and returns a typed started container instance. */
  public override async start(): Promise<StartedOracleDbContainer> {
    this.withEnvironment({
      ORACLE_PASSWORD: this.password,
      APP_USER: this.username,
      APP_USER_PASSWORD: this.password,
    });

    if (this.database) {
      this.withEnvironment({
        ORACLE_DATABASE: this.database,
      });
    }

    return new StartedOracleDbContainer(
      await super.start(),
      this.username,
      this.password,
      this.database ?? DEFAULT_DATABASE
    );
  }
}

/** Represents a running Oracle Free test container with Oracle-specific accessors. */
export class StartedOracleDbContainer extends AbstractStartedContainer {
  constructor(
    startedTestContainer: StartedTestContainer,
    private readonly username: string,
    private readonly password: string,
    private readonly database: string
  ) {
    super(startedTestContainer);
  }

  /** Returns the mapped Oracle listener port. */
  public getPort(): number {
    return this.getMappedPort(ORACLEDB_PORT);
  }

  /** Returns the configured application username. */
  public getUsername(): string {
    return this.username;
  }

  /** Returns the configured password. */
  public getPassword(): string {
    return this.password;
  }

  /** Returns the configured service/database name. */
  public getDatabase(): string {
    return this.database;
  }

  /** Returns a host:port/database URL fragment. */
  public getUrl(): string {
    return `${this.getHost()}:${this.getPort()}/${this.database}`;
  }

  /** Returns an Oracle connection descriptor string (TNS format). */
  public getConnectionDescriptor(): string {
    return `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=${this.getHost()})(PORT=${this.getPort()}))(CONNECT_DATA=(SERVICE_NAME=${this.database})))`;
  }
}
