import { AbstractStartedContainer, GenericContainer, Wait, WaitStrategy } from "testcontainers";

export class StartedMockserverContainer extends AbstractStartedContainer {
  getMockserverPort(): number {
    return this.getFirstMappedPort();
  }

  getUrl(): string {
    return `http://${this.getHost()}:${this.getFirstMappedPort()}`;
  }

  getSecureUrl(): string {
    return `https://${this.getHost()}:${this.getFirstMappedPort()}`;
  }
}

const MOCKSERVER_PORT = 1080;

export class MockserverContainer extends GenericContainer {
  constructor(image: string) {
    super(image);

    this.withStartupTimeout(120_000);
  }

  override async start(): Promise<StartedMockserverContainer> {
    this.withExposedPorts(MOCKSERVER_PORT);

    return new StartedMockserverContainer(await super.start());
  }

  protected override getDefaultWaitStrategy(): WaitStrategy {
    return Wait.forLogMessage(/started on port: 1080/);
  }
}
