import { GenericContainer, Wait } from "../..";
import { StartedTestContainer } from "../../test-container";
import { Port } from "../../port";
import { RandomUuid } from "../../uuid";
import { AbstractStartedContainer } from "../abstract-started-container";
import { Host } from "../../docker/types";

export class ArangoDBContainer extends GenericContainer {
  private readonly defaultPort = 8529;
  private readonly defaultUsername = "root";

  constructor(image = "arangodb:latest", private password = new RandomUuid().nextUuid()) {
    super(image);
    this.withExposedPorts(this.defaultPort).withWaitStrategy(Wait.forLogMessage("Have fun!"));
  }

  public withPassword(password: string): this {
    this.password = password;
    return this;
  }

  protected async preCreate(): Promise<void> {
    this.withEnv("ARANGO_ROOT_PASSWORD", this.password);
  }

  public async start(): Promise<StartedArangoContainer> {
    return new StartedArangoContainer(await super.start(), this.defaultPort, this.defaultUsername, this.password);
  }
}

export class StartedArangoContainer extends AbstractStartedContainer {
  private readonly host: Host;

  constructor(
    startedTestContainer: StartedTestContainer,
    private readonly port: Port,
    private readonly username: string,
    private readonly password: string
  ) {
    super(startedTestContainer);
    this.host = this.startedTestContainer.getHost();
    this.port = this.startedTestContainer.getMappedPort(port);
  }

  public getTcpUrl(): string {
    return `tcp://${this.host}:${this.port}/`;
  }

  public getHttpUrl(): string {
    return `http://${this.host}:${this.port}/`;
  }

  public getPassword(): string {
    return this.password;
  }

  public getUsername(): string {
    return this.username;
  }
}
