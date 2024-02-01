import { AbstractStartedContainer, GenericContainer, StartedTestContainer, Wait } from "testcontainers";
import { getContainerPort, PortWithOptionalBinding } from "testcontainers/build/utils/port";

const MSSQL_PORT = 1433;
export class MSSQLServerContainer extends GenericContainer {
  private database = "master";
  private username = "sa";
  private password = "Passw0rd";
  private acceptEula = "N";
  private message: string | RegExp = /.*Recovery is complete.*/;

  constructor(image = "mcr.microsoft.com/mssql/server:2022-latest") {
    super(image);
    this.withExposedPorts(MSSQL_PORT)
      .withEnvironment({
        ACCEPT_EULA: this.acceptEula,
        MSSQL_SA_PASSWORD: this.password,
        MSSQL_TCP_PORT: String(MSSQL_PORT),
      })
      .withWaitStrategy(Wait.forLogMessage(this.message, 1))
      .withStartupTimeout(120_000);
  }

  public acceptLicense(): this {
    this.acceptEula = "Y";
    this.withEnvironment({ ...this.environment, ACCEPT_EULA: this.acceptEula });
    return this;
  }

  public withDatabase(database: string): this {
    this.database = database;
    return this;
  }

  public withPassword(password: string): this {
    this.password = password;
    this.withEnvironment({ ...this.environment, MSSQL_SA_PASSWORD: this.password });
    return this;
  }

  public withWaitForMessage(message: string | RegExp): this {
    this.message = message;
    return this;
  }

  public override withExposedPorts(...ports: PortWithOptionalBinding[]): this {
    this.withEnvironment({ ...this.environment, MSSQL_TCP_PORT: String(getContainerPort(ports[0])) });
    return super.withExposedPorts(...ports);
  }

  public override async start(): Promise<StartedMSSQLServerContainer> {
    return new StartedMSSQLServerContainer(await super.start(), this.database, this.username, this.password);
  }
}

export class StartedMSSQLServerContainer extends AbstractStartedContainer {
  constructor(
    startedTestContainer: StartedTestContainer,
    private readonly database: string,
    private readonly username: string,
    private readonly password: string
  ) {
    super(startedTestContainer);
  }

  public getPort(): number {
    return this.getMappedPort(MSSQL_PORT);
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
   * @param {boolean} secure use secure connection?
   * @returns A connection URI in the form of `Server=<host>,1433;Database=<database>;User Id=<username>;Password=<password>;Encrypt=false`
   */
  public getConnectionUri(secure = false): string {
    return `Server=${this.getHost()},${this.getPort()};Database=${this.getDatabase()};User Id=${this.getUsername()};Password=${this.getPassword()};Encrypt=${secure}`;
  }
}
