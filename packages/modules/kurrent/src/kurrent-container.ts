import { AbstractStartedContainer, GenericContainer, Wait } from "testcontainers";

export class StartedKurrentContainer extends AbstractStartedContainer {
  getConnectionString(): string {
    return `esdb://${this.getHost()}:${this.getFirstMappedPort()}?tls=false`;
  }
}

export class KurrentContainer extends GenericContainer {
  constructor(image = "kurrentplatform/kurrentdb:25.0") {
    super(image);

    this.withExposedPorts(2113)
      .withEnvironment({
        KURRENTDB_CLUSTER_SIZE: "1",
        KURRENTDB_RUN_PROJECTIONS: "All",
        KURRENTDB_START_STANDARD_PROJECTIONS: "true",
        KURRENTDB_INSECURE: "true",
      })
      .withStartupTimeout(120_000)
      .withWaitStrategy(Wait.forHealthCheck());
  }

  public override async start(): Promise<StartedKurrentContainer> {
    return new StartedKurrentContainer(await super.start());
  }
}
