import { GenericContainer, Wait } from "../..";
import { Image, Tag } from "../../repo-tag";
import { Host } from "../../docker-client-factory";
import { DockerClient, ContainerName, ExecResult, Command } from "../../docker-client";
import { BoundPorts } from "../../bound-ports";
import { StartedTestContainer, OptionalStopOptions, StoppedTestContainer } from "../../test-container";
import { Port } from "../../port";
import { Id as ContainerId } from "../../container";
import { RandomUuid } from "../../uuid";

export class StartedNeo4jTestContainer implements StartedTestContainer {
  constructor(
    private startedContainer: StartedTestContainer,
    private boltPort: number,
    private httpPort: number,
    private username: string,
    private password: string
  ) {}

  public stop(options?: OptionalStopOptions): Promise<StoppedTestContainer> {
    return this.startedContainer.stop(options);
  }

  public getContainerIpAddress(): Host {
    return this.startedContainer.getContainerIpAddress();
  }

  public getMappedPort(port: Port): Port {
    return this.startedContainer.getMappedPort(port);
  }

  public getName(): ContainerName {
    return this.startedContainer.getName();
  }

  public getId(): ContainerId {
    return this.startedContainer.getId();
  }

  public exec(command: Command[]): Promise<ExecResult> {
    return this.startedContainer.exec(command);
  }

  public logs(): Promise<NodeJS.ReadableStream> {
    return this.startedContainer.logs();
  }

  public getBoltUri() {
    return `bolt://${this.startedContainer.getContainerIpAddress()}:${this.startedContainer.getMappedPort(
      this.boltPort
    )}/`;
  }

  public getHttpUri() {
    return `http://${this.startedContainer.getContainerIpAddress()}:${this.startedContainer.getMappedPort(
      this.httpPort
    )}/`;
  }

  public getPassword() {
    return this.password;
  }

  public getUsername() {
    return this.username;
  }
}

export class Neo4jContainer extends GenericContainer {
  private readonly defaultBoltPort = 7687;
  private readonly defaultHttPort = 7474;
  private readonly defaultUsername = "neo4j";

  constructor(
    readonly image: Image = "neo4j",
    readonly tag: Tag = "latest",
    readonly host?: Host,
    private password = new RandomUuid().nextUuid()
  ) {
    super(image, tag);
    this.withExposedPorts(this.defaultBoltPort, this.defaultHttPort);
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

  protected async preCreate(dockerClient: DockerClient, boundPorts: BoundPorts): Promise<void> {
    this.withEnv("NEO4J_AUTH", `${this.defaultUsername}/${this.password}`).withWaitStrategy(
      Wait.forLogMessage("Started.")
    );
  }

  public async start(): Promise<StartedNeo4jTestContainer> {
    const startedTestContainer = await super.start();
    return new StartedNeo4jTestContainer(
      startedTestContainer,
      this.defaultBoltPort,
      this.defaultHttPort,
      this.defaultUsername,
      this.password
    );
  }
}
