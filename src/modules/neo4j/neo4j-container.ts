import { GenericContainer, Wait } from "../..";
import { StartedTestContainer } from "../../test-container";
import { RandomUuid } from "../../uuid";
import { AbstractStartedContainer } from "../abstract-started-container";

const BOLT_PORT = 7687;
const HTTP_PORT = 7474;
const USERNAME = "neo4j";

export class Neo4jContainer extends GenericContainer {
  private password = new RandomUuid().nextUuid();
  private apoc = false;
  private ttl?: number;

  constructor(image = "neo4j:4.3.2") {
    super(image);
  }

  public withPassword(password: string): this {
    this.password = password;
    return this;
  }

  public withApoc(): this {
    this.apoc = true;
    return this;
  }

  public withTtl(schedule = 5): this {
    this.ttl = schedule;
    return this;
  }

  public async start(): Promise<StartedNeo4jContainer> {
    this.withExposedPorts(...(this.hasExposedPorts ? this.ports : [BOLT_PORT, HTTP_PORT]))
      .withWaitStrategy(Wait.forLogMessage("Started."))
      .withEnv("NEO4J_AUTH", `${USERNAME}/${this.password}`)
      .withStartupTimeout(120_000);

    if (this.apoc) {
      this.withEnv("NEO4JLABS_PLUGINS", '["apoc"]').withEnv("NEO4J_dbms_security_procedures_unrestricted", "apoc.*");
    }

    if (this.ttl) {
      this.withEnv("NEO4J_apoc_ttl_enabled", "true").withEnv("NEO4J_apoc_ttl_schedule", this.ttl.toString());
    }

    return new StartedNeo4jContainer(await super.start(), this.password);
  }
}

export class StartedNeo4jContainer extends AbstractStartedContainer {
  private readonly boltPort: number;
  private readonly httpPort: number;

  constructor(startedTestContainer: StartedTestContainer, private readonly password: string) {
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
