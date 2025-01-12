import { AbstractStartedContainer, GenericContainer, Wait } from "testcontainers";

export class StartedEventStoreDBContainer extends AbstractStartedContainer {
  getConnectionString(): string {
    return `esdb://${this.getHost()}:${this.getFirstMappedPort()}?tls=false`;
  }
}

const EVENT_STORE_DB_PORT = 2113;

export class EventStoreDBContainer extends GenericContainer {
  constructor(image = "eventstore/eventstore:24.10") {
    super(image);

    this.withExposedPorts(EVENT_STORE_DB_PORT)
      .withEnvironment({
        EVENTSTORE_CLUSTER_SIZE: "1",
        EVENTSTORE_RUN_PROJECTIONS: "All",
        EVENTSTORE_START_STANDARD_PROJECTIONS: "true",
        EVENTSTORE_INSECURE: "true",
      })
      .withStartupTimeout(120_000)
      .withWaitStrategy(Wait.forHealthCheck());
  }

  public override async start(): Promise<StartedEventStoreDBContainer> {
    return new StartedEventStoreDBContainer(await super.start());
  }
}
