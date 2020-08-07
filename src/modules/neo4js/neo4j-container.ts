import { GenericContainer, Wait } from "../..";
import { Image, Tag } from "../../repo-tag";
import { Host } from "../../docker-client-factory";
import { Uuid, RandomUuid } from "../../uuid";
import { DockerClient } from "../../docker-client";
import { BoundPorts } from "../../bound-ports";

export class Neo4jContainer extends GenericContainer {
  public static readonly defaultBoltPort = 7687;
  public static readonly defaultHttPort = 7474;
  public static readonly defaultUserName = "neo4j";
  public static readonly defaultPassword = "test";

  private readonly uuid: Uuid = new RandomUuid();
  private password = Neo4jContainer.defaultPassword;

  constructor(readonly image: Image = "neo4j", readonly tag: Tag = "latest", readonly host?: Host) {
    super(image, tag);
    this.host = host === undefined ? this.uuid.nextUuid() : host;
    this.withName(this.host).withExposedPorts(Neo4jContainer.defaultBoltPort, Neo4jContainer.defaultHttPort);
  }

  public withPassword(password: string): this {
    this.password = password;
    return this;
  }

  protected async preCreate(dockerClient: DockerClient, boundPorts: BoundPorts): Promise<void> {
    this.withEnv("NEO4J_AUTH", `${Neo4jContainer.defaultUserName}/${this.password}`).withWaitStrategy(
      Wait.forLogMessage("Started.")
    );
  }
}
