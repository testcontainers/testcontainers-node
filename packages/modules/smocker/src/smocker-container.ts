import { AbstractStartedContainer, GenericContainer, StartedTestContainer, Wait } from "testcontainers";

export class SmockerContainer extends GenericContainer {
  constructor(image = "thiht/smocker:0.18.5") {
    super(image);
    this.withExposedPorts(8080, 8081)
      .withWaitStrategy(Wait.forLogMessage("Starting mock server"))
      .withStartupTimeout(120_000);
  }

  public override async start(): Promise<StartedSmockerContainer> {
    return new StartedSmockerContainer(await super.start());
  }
}

export class StartedSmockerContainer extends AbstractStartedContainer {
  constructor(startedTestContainer: StartedTestContainer) {
    super(startedTestContainer);
  }

  /**
   * @returns The API URI of the smocker container
   */
  public getApiUri(): string {
    const hostname = this.getHost();
    const url = new URL("http://" + hostname);
    url.port = this.getMappedPort(8081).toString();
    return url.toString();
  }

  /**
   * @returns The mock URI of the smocker container
   */
  public getMockUri(): string {
    const hostname = this.getHost();
    const url = new URL("http://" + hostname);
    url.port = this.getMappedPort(8080).toString();
    return url.toString();
  }
}
