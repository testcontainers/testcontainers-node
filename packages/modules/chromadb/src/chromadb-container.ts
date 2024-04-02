import { AbstractStartedContainer, GenericContainer, StartedTestContainer, Wait } from "testcontainers";

const CHROMADB_PORT = 8000;

export class ChromaDBContainer extends GenericContainer {
  constructor(image = "chromadb/chroma:0.4.22") {
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
  private readonly port: number;

  constructor(startedTestContainer: StartedTestContainer) {
    super(startedTestContainer);
    this.host = this.startedTestContainer.getHost();
    this.port = this.startedTestContainer.getMappedPort(CHROMADB_PORT);
  }

  public getHttpUrl(): string {
    return `http://${this.host}:${this.port}`;
  }
}
