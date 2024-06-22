import { AbstractStartedContainer, GenericContainer, StartedTestContainer, Wait } from "testcontainers";

const CHROMADB_PORT = 8000;

export class ChromaDBContainer extends GenericContainer {
  constructor(image = "chromadb/chroma:0.4.24") {
    super(image);
    this.withExposedPorts(CHROMADB_PORT)
      .withWaitStrategy(Wait.forHttp("/api/v1/heartbeat", CHROMADB_PORT))
      .withStartupTimeout(120_000);
  }

  public override async start(): Promise<StartedChromaDBContainer> {
    return new StartedChromaDBContainer(await super.start());
  }
}

export class StartedChromaDBContainer extends AbstractStartedContainer {
  private readonly host: string;

  constructor(startedTestContainer: StartedTestContainer) {
    super(startedTestContainer);
    this.host = this.startedTestContainer.getHost();
  }

  public getHttpUrl(): string {
    return `http://${this.host}:${this.startedTestContainer.getMappedPort(CHROMADB_PORT)}`;
  }
}
