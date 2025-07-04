import { AbstractStartedContainer, GenericContainer, StartedTestContainer, Wait } from "testcontainers";

export class StartedKurrentDbContainer extends AbstractStartedContainer {
  private readonly image: string

  constructor(started: StartedTestContainer, image: string) {
    super(started)
    this.image = image
  }

  getConnectionString(): string {
    const protocol = this.image.includes("eventstore")
      ? 'esdb'
      : 'kurrentdb'

    return `${protocol}://${this.getHost()}:${this.getFirstMappedPort()}?tls=false`;
  }
}

export class KurrentDbContainer extends GenericContainer {
  constructor(image: string) {
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

  public override async start(): Promise<StartedKurrentDbContainer> {
    return new StartedKurrentDbContainer(await super.start(), this.imageName.image);
  }
}
