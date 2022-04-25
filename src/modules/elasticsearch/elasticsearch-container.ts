import { GenericContainer, StartedTestContainer } from "../..";
import { AbstractStartedContainer } from "../abstract-started-container";
import { Port } from "../../port";

const ELASTIC_SEARCH_HTTP_PORT = 9200;

export class ElasticsearchContainer extends GenericContainer {
  constructor(image = "docker.elastic.co/elasticsearch/elasticsearch:7.9.2") {
    super(image);
  }

  public async start(): Promise<StartedElasticsearchContainer> {
    this.withExposedPorts(...(this.hasExposedPorts ? this.ports : [ELASTIC_SEARCH_HTTP_PORT]))
      .withEnv("discovery.type", "single-node")
      .withStartupTimeout(120_000);

    return new StartedElasticsearchContainer(await super.start());
  }
}

export class StartedElasticsearchContainer extends AbstractStartedContainer {
  private readonly httpPort: Port;

  constructor(readonly startedTestContainer: StartedTestContainer) {
    super(startedTestContainer);
    this.httpPort = this.getMappedPort(ELASTIC_SEARCH_HTTP_PORT);
  }

  public getHttpUrl(): string {
    return `http://${this.getHost()}:${this.httpPort}`;
  }
}
