import { AbstractStartedContainer, GenericContainer, StartedTestContainer } from "testcontainers";

const ELASTIC_SEARCH_HTTP_PORT = 9200;

export class ElasticsearchContainer extends GenericContainer {
  constructor(image = "elasticsearch:7.17.7") {
    super(image);
    this.withExposedPorts(ELASTIC_SEARCH_HTTP_PORT)
      .withEnvironment({ "discovery.type": "single-node" })
      .withCopyContentToContainer([
        {
          content: "-Xmx2G\n",
          target: "/usr/share/elasticsearch/config/jvm.options.d/elasticsearch-default-memory-vm.options",
        },
      ])
      .withStartupTimeout(120_000);
  }

  public override async start(): Promise<StartedElasticsearchContainer> {
    return new StartedElasticsearchContainer(await super.start());
  }
}

export class StartedElasticsearchContainer extends AbstractStartedContainer {
  private readonly httpPort: number;

  constructor(override readonly startedTestContainer: StartedTestContainer) {
    super(startedTestContainer);
    this.httpPort = this.getMappedPort(ELASTIC_SEARCH_HTTP_PORT);
  }

  public getHttpUrl(): string {
    return `http://${this.getHost()}:${this.httpPort}`;
  }
}
