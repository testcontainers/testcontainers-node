import { AbstractStartedContainer, GenericContainer, StartedTestContainer, Wait } from "testcontainers";

export const SUPERTOKENS_PORT = 3567;

export class SupertokensContainer extends GenericContainer {
  constructor(image = "registry.supertokens.io/supertokens/supertokens-postgresql:7.0") {
    super(image);
  }

  protected override async beforeContainerCreated(): Promise<void> {
    this.withExposedPorts(...(this.hasExposedPorts ? this.exposedPorts : [SUPERTOKENS_PORT]))
      .withWaitStrategy(Wait.forHttp("/hello", SUPERTOKENS_PORT))
      .withStartupTimeout(120_000);
  }

  public override async start(): Promise<StartedSupertokensContainer> {
    return new StartedSupertokensContainer(await super.start());
  }
}

export class StartedSupertokensContainer extends AbstractStartedContainer {
  constructor(startedTestContainer: StartedTestContainer) {
    super(startedTestContainer);
  }

  public getPort(): number {
    return this.startedTestContainer.getMappedPort(SUPERTOKENS_PORT);
  }

  public getConnectionUri(): string {
    return `http://${this.getHost()}:${this.getPort().toString()}`;
  }
}
