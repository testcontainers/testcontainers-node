import { AbstractStartedContainer, GenericContainer, StartedTestContainer, Wait } from "testcontainers";

const COUCHDB_PORT = 5984;

export class CouchDBContainer extends GenericContainer {
  private username: string = "root";
  private password: string = "root";

  constructor(image: string) {
    super(image);
    this.withExposedPorts(COUCHDB_PORT)
      .withStartupTimeout(120_000)
      .withWaitStrategy(Wait.forHttp("/_up", COUCHDB_PORT).forStatusCode(200).withStartupTimeout(60_000));
  }

  public withUsername(username: string): this {
    this.username = username;
    return this;
  }

  public withPassword(password: string): this {
    this.password = password;
    return this;
  }

  public override async start(): Promise<StartedCouchDBContainer> {
    this.withEnvironment({
      COUCHDB_USER: this.username,
      COUCHDB_PASSWORD: this.password,
    });
    return new StartedCouchDBContainer(await super.start(), this.username, this.password);
  }
}

export class StartedCouchDBContainer extends AbstractStartedContainer {
  constructor(
    startedTestContainer: StartedTestContainer,
    private readonly username: string,
    private readonly password: string
  ) {
    super(startedTestContainer);
  }

  public getPort(): number {
    return this.getMappedPort(COUCHDB_PORT);
  }

  public getUsername(): string {
    return this.username;
  }

  public getPassword(): string {
    return this.password;
  }

  public getUrl(): string {
    return `http://${this.username}:${this.password}@${this.getHost()}:${this.getPort()}`;
  }
}
