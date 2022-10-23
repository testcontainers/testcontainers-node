import { GenericContainer, Wait } from "../..";
import { StartedTestContainer } from "../../test-container";
import { RandomUuid } from "../../uuid";
import { AbstractStartedContainer } from "../abstract-started-container";

const ARANGODB_PORT = 8529;
const USERNAME = "root";

export class ArangoDBContainer extends GenericContainer {
  constructor(image = "arangodb:3.7.13", private password = new RandomUuid().nextUuid()) {
    super(image);
  }

  public withPassword(password: string): this {
    this.password = password;
    return this;
  }

  public async start(): Promise<StartedArangoContainer> {
    this.withExposedPorts(...(this.hasExposedPorts ? this.ports : [ARANGODB_PORT]))
      .withWaitStrategy(Wait.forLogMessage("Have fun!"))
      .withEnvironment({ ARANGO_ROOT_PASSWORD: this.password })
      .withStartupTimeout(120_000);

    return new StartedArangoContainer(await super.start(), this.password);
  }
}

export class StartedArangoContainer extends AbstractStartedContainer {
  private readonly host: string;
  private readonly port: number;

  constructor(startedTestContainer: StartedTestContainer, private readonly password: string) {
    super(startedTestContainer);
    this.host = this.startedTestContainer.getHost();
    this.port = this.startedTestContainer.getMappedPort(ARANGODB_PORT);
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
    return USERNAME;
  }
}
