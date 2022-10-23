import { GenericContainer, StartedTestContainer } from "../../index.js";
import { AbstractStartedContainer } from "../abstract-started-container.js";

const ELASTIC_SEARCH_HTTP_PORT = 9200;

export class ElasticsearchContainer extends GenericContainer {
  constructor(image = "docker.elastic.co/elasticsearch/elasticsearch:8.4.3") {
    super(image);
  }

  public override async start(): Promise<StartedElasticsearchContainer> {
    super
      .withExposedPorts(...(super.hasExposedPorts ? super.ports : [ELASTIC_SEARCH_HTTP_PORT]))
      .withEnvironment({ "discovery.type": "single-node" })
      .withStartupTimeout(120_000);

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
