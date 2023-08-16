import { AbstractStartedContainer, GenericContainer, StartedTestContainer, Wait } from "testcontainers";

const LOCALSTACK_PORT = 4566;

export class LocalstackContainer extends GenericContainer {
  constructor(image = "localstack/localstack:2.2.0") {
    super(image);
  }

  protected override async beforeContainerCreated(): Promise<void> {
    this.withExposedPorts(...(this.hasExposedPorts ? this.exposedPorts : [LOCALSTACK_PORT]))
      .withWaitStrategy(Wait.forLogMessage("Ready", 1))
      .withStartupTimeout(120_000)
      .withEnvironment({ LOCALSTACK_HOST: "localhost" });
  }

  public override async start(): Promise<StartedLocalStackContainer> {
    return new StartedLocalStackContainer(await super.start());
  }
}

export class StartedLocalStackContainer extends AbstractStartedContainer {
  private readonly port: number;

  constructor(startedTestContainer: StartedTestContainer) {
    super(startedTestContainer);
    this.port = startedTestContainer.getMappedPort(LOCALSTACK_PORT);
  }

  public getPort(): number {
    return this.port;
  }

  /**
   * @returns A connection URI in the form of `http://host:port`
   */
  public getConnectionUri(): string {
    return "http://" + this.getHost() + ":" + this.getPort().toString();
  }
}
