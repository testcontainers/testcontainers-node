import { GenericContainer, Wait } from "../..";
import { Image, Tag } from "../../repo-tag";
import { Host } from "../../docker-client-factory";
import { DockerClient } from "../../docker-client";
import { BoundPorts } from "../../bound-ports";
import { StartedTestContainer } from "../../test-container";
import { Port } from "../../port";
import { RandomUuid } from "../../uuid";
import { AbstractStartedContainer } from "../abstract-started-container";

export class Neo4jContainer extends GenericContainer {
  private readonly defaultBoltPort = 7687;
  private readonly defaultHttpPort = 7474;
  private readonly defaultUsername = "neo4j";

  constructor(image: Image = "neo4j", tag: Tag = "latest", private password = new RandomUuid().nextUuid()) {
    super(image, tag);
    this.withExposedPorts(this.defaultBoltPort, this.defaultHttpPort).withWaitStrategy(Wait.forLogMessage("Started."));
  }

  public withPassword(password: string): this {
    this.password = password;
    return this;
  }

  public withApoc(): this {
    return this.withEnv("NEO4JLABS_PLUGINS", '["apoc"]').withEnv(
      "NEO4J_dbms_security_procedures_unrestricted",
      "apoc.*"
    );
  }

  public withTtl(schedule = 5) {
    this.withEnv("NEO4J_apoc_ttl_enabled", "true").withEnv("NEO4J_apoc_ttl_schedule", schedule.toString());
  }

  protected async preCreate(dockerClient: DockerClient, boundPorts: BoundPorts): Promise<void> {
    this.withEnv("NEO4J_AUTH", `${this.defaultUsername}/${this.password}`);
  }

  public async start(): Promise<StartedNeo4jContainer> {
    return new StartedNeo4jContainer(
      await super.start(),
      this.defaultBoltPort,
      this.defaultHttpPort,
      this.defaultUsername,
      this.password
    );
  }
}

export class StartedNeo4jContainer extends AbstractStartedContainer {
  private readonly host: Host;
  private readonly boltPort: Port;
  private readonly httpPort: Port;

  constructor(
    startedTestContainer: StartedTestContainer,
    boltPort: Port,
    httpPort: Port,
    private readonly username: string,
    private readonly password: string
  ) {
    super(startedTestContainer);
    this.host = this.startedTestContainer.getContainerIpAddress();
    this.boltPort = this.startedTestContainer.getMappedPort(boltPort);
    this.httpPort = this.startedTestContainer.getMappedPort(httpPort);
  }

  public getBoltUri() {
    return `bolt://${this.host}:${this.boltPort}/`;
  }

  public getHttpUri() {
    return `http://${this.host}:${this.httpPort}/`;
  }

  public getPassword() {
    return this.password;
  }

  public getUsername() {
    return this.username;
  }
}
