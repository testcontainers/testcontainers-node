import { AbstractStartedContainer, GenericContainer, StartedTestContainer, Wait } from "testcontainers";

const BOLT_PORT = 7687;
const HTTP_PORT = 7474;
const USERNAME = "neo4j";

export class Neo4jContainer extends GenericContainer {
  private password = "pass123!@#WORD";
  private apoc = false;
  private ttl?: number;

  constructor(image = "neo4j:4.4.12") {
    super(image);
    this.withExposedPorts(BOLT_PORT, HTTP_PORT)
      .withWaitStrategy(Wait.forLogMessage("Started."))
      .withStartupTimeout(120_000);
  }

  public withPassword(password: string): this {
    this.password = password;
    this.withEnvironment({ NEO4J_AUTH: `${USERNAME}/${this.password}` });
    return this;
  }

  public withApoc(): this {
    this.apoc = true;
    this.withEnvironment({
      NEO4JLABS_PLUGINS: '["apoc"]',
      NEO4J_dbms_security_procedures_unrestricted: "apoc.*",
    });
    return this;
  }

  public withTtl(schedule = 5): this {
    this.ttl = schedule;
    return this;
  }

  public override async start(): Promise<StartedNeo4jContainer> {
    this.withEnvironment({ NEO4J_AUTH: `${USERNAME}/${this.password}` });
    if (this.ttl) {
      this.withEnvironment({
        NEO4J_apoc_ttl_enabled: "true",
        NEO4J_apoc_ttl_schedule: this.ttl.toString(),
      });
    }
    if (this.apoc) {
      this.withEnvironment({
        NEO4JLABS_PLUGINS: '["apoc"]',
        NEO4J_dbms_security_procedures_unrestricted: "apoc.*",
      });
    }
    return new StartedNeo4jContainer(await super.start(), this.password);
  }
}

export class StartedNeo4jContainer extends AbstractStartedContainer {
  private readonly boltPort: number;
  private readonly httpPort: number;

  constructor(
    startedTestContainer: StartedTestContainer,
    private readonly password: string
  ) {
    super(startedTestContainer);
    this.boltPort = this.startedTestContainer.getMappedPort(BOLT_PORT);
    this.httpPort = this.startedTestContainer.getMappedPort(HTTP_PORT);
  }

  public getBoltUri(): string {
    return `bolt://${this.getHost()}:${this.boltPort}/`;
  }

  public getHttpUri(): string {
    return `http://${this.getHost()}:${this.httpPort}/`;
  }

  public getPassword(): string {
    return this.password;
  }

  public getUsername(): string {
    return USERNAME;
  }
}
