import { GenericContainer, Wait } from "../..";
import { Image, Tag } from "../../repo-tag";
import { Host } from "../../docker-client-factory";
import { DockerClient } from "../../docker-client";
import { BoundPorts } from "../../bound-ports";
import { StartedTestContainer } from "../../test-container";

export interface StartedNeo4jTestContainer extends StartedTestContainer {
  getPassword: () => string;
  getUsername: () => string;
  getBoltUri: () => string;
}

export class Neo4jContainer extends GenericContainer {
  public static readonly defaultBoltPort = 7687;
  public static readonly defaultHttPort = 7474;
  public static readonly defaultUsername = "neo4j";
  public static readonly defaultPassword = "test";

  private password = Neo4jContainer.defaultPassword;
  private startedContainer: StartedTestContainer | null = null;

  constructor(readonly image: Image = "neo4j", readonly tag: Tag = "latest", readonly host?: Host) {
    super(image, tag);
    this.withExposedPorts(Neo4jContainer.defaultBoltPort, Neo4jContainer.defaultHttPort);
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
    this.withEnv("NEO4J_AUTH", `${Neo4jContainer.defaultUsername}/${this.password}`).withWaitStrategy(
      Wait.forLogMessage("Started.")
    );
  }

  public async start(): Promise<StartedNeo4jTestContainer> {
    this.startedContainer = await super.start();
    (this.startedContainer as any).getPassword = this.getPassword.bind(this);
    (this.startedContainer as any).getUsername = this.getUsername.bind(this);
    (this.startedContainer as any).getBoltUri = this.getBoltUri.bind(this);

    return this.startedContainer as StartedNeo4jTestContainer;
  }

  private getBoltUri() {
    return `bolt://${this.startedContainer!.getContainerIpAddress()}:${this.startedContainer!.getMappedPort(
      Neo4jContainer.defaultBoltPort
    )}/`;
  }

  private getPassword() {
    return this.password;
  }

  private getUsername() {
    return Neo4jContainer.defaultUsername;
  }
}
