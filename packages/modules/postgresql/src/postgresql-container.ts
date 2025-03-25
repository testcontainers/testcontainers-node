import { AbstractStartedContainer, GenericContainer, StartedTestContainer, Wait } from "testcontainers";

const POSTGRES_PORT = 5432;

export class PostgreSqlContainer extends GenericContainer {
  private database = "test";
  private username = "test";
  private password = "test";

  constructor(image = "postgres:13.3-alpine") {
    super(image);
    this.withExposedPorts(POSTGRES_PORT);
    this.withWaitStrategy(Wait.forHealthCheck());
    this.withStartupTimeout(120_000);
  }

  public withDatabase(database: string): this {
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

  public override async start(): Promise<StartedPostgreSqlContainer> {
    this.withEnvironment({
      POSTGRES_DB: this.database,
      POSTGRES_USER: this.username,
      POSTGRES_PASSWORD: this.password,
    });
    if (!this.healthCheck) {
      this.withHealthCheck({
        test: ["CMD-SHELL", `PGPASSWORD=${this.password} psql -U ${this.username} -d ${this.database} -c 'SELECT 1;'`],
        interval: 250,
        timeout: 1000,
        retries: 1000,
      });
    }
    return new StartedPostgreSqlContainer(await super.start(), this.database, this.username, this.password);
  }
}

export class StartedPostgreSqlContainer extends AbstractStartedContainer {
  private snapshotName: string = "migrated_template";
  constructor(
    startedTestContainer: StartedTestContainer,
    private readonly database: string,
    private readonly username: string,
    private readonly password: string
  ) {
    super(startedTestContainer);
  }

  public getPort(): number {
    return super.getMappedPort(POSTGRES_PORT);
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

  /**
   * @returns A connection URI in the form of `postgres[ql]://[username[:password]@][host[:port],]/database`
   */
  public getConnectionUri(): string {
    const url = new URL("", "postgres://");
    url.hostname = this.getHost();
    url.port = this.getPort().toString();
    url.pathname = this.getDatabase();
    url.username = this.getUsername();
    url.password = this.getPassword();
    return url.toString();
  }

  public withSnapshotName(snapshotName: string): this {
    this.snapshotName = snapshotName;
    return this;
  }

  /**
   * Takes a snapshot of the current state of the database as a template, which can then be restored using
   * the restore method. By default, the snapshot will be created under a database called migrated_template.
   *
   * If a snapshot already exists under the given/default name, it will be overwritten with the new snapshot.
   *
   * @param opts Optional snapshot configuration options
   * @returns Promise resolving when snapshot is complete
   */
  public async snapshot(snapshotName?: string): Promise<void> {
    const name = snapshotName || this.snapshotName;

    this.snapshotSanityCheck(name);

    // Execute the commands to create the snapshot, in order
    await this.execCommandsSQL([
      // Update pg_database to remove the template flag, then drop the database if it exists.
      // This is needed because dropping a template database will fail.
      `UPDATE pg_database SET datistemplate = FALSE WHERE datname = '${name}'`,
      `DROP DATABASE IF EXISTS "${name}"`,
      // Create a copy of the database to another database to use as a template now that it was fully migrated
      `CREATE DATABASE "${name}" WITH TEMPLATE "${this.getDatabase()}" OWNER "${this.getUsername()}"`,
      // Snapshot the template database so we can restore it onto our original database going forward
      `ALTER DATABASE "${name}" WITH is_template = TRUE`,
    ]);
  }

  /**
   * Restores the database to a specific snapshot. By default, it will restore the last snapshot taken on the
   * database by the snapshot method. If a snapshot name is provided, it will instead try to restore the snapshot by name.
   *
   * @param opts Optional snapshot configuration options
   * @returns Promise resolving when restore is complete
   */
  public async restore(snapshotName?: string): Promise<void> {
    const name = snapshotName || this.snapshotName;

    this.snapshotSanityCheck(name);

    // Execute the commands to restore the snapshot, in order
    await this.execCommandsSQL([
      // Drop the entire database by connecting to the postgres global database
      `DROP DATABASE "${this.getDatabase()}" WITH (FORCE)`,
      // Then restore the previous snapshot
      `CREATE DATABASE "${this.getDatabase()}" WITH TEMPLATE "${name}" OWNER "${this.getUsername()}"`,
    ]);
  }

  /**
   * Executes a series of SQL commands against the Postgres database
   * @param commands SQL commands to execute
   */
  private async execCommandsSQL(commands: string[]): Promise<void> {
    for (const command of commands) {
      try {
        const result = await this.exec([
          "psql",
          "-v",
          "ON_ERROR_STOP=1",
          "-U",
          this.getUsername(),
          "-d",
          "postgres",
          "-c",
          command,
        ]);

        if (result.exitCode !== 0) {
          throw new Error(`Command failed with exit code ${result.exitCode}: ${result.output}`);
        }
      } catch (error) {
        console.error(`Failed to execute command: ${command}`, error);
        throw error;
      }
    }
  }

  /**
   * Checks if the snapshot name is valid and if the database is not the postgres system database
   * @param snapshotName The name of the snapshot to check
   */
  private snapshotSanityCheck(snapshotName: string): void {
    if (this.getDatabase() === "postgres") {
      throw new Error("cannot restore the postgres system database as it cannot be dropped to be restored");
    }

    if (this.getDatabase() === snapshotName) {
      throw new Error("cannot restore the database to itself");
    }
  }
}
