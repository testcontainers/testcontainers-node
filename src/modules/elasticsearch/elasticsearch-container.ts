import { GenericContainer, StartedTestContainer } from "../..";
import { AbstractStartedContainer } from "../abstract-started-container";

const ELASTIC_SEARCH_HTTP_PORT = 9200;

export class ElasticsearchContainer extends GenericContainer {
  constructor(image = "elasticsearch:7.17.7") {
    super(image);
  }

  public override async start(): Promise<StartedElasticsearchContainer> {
    this.withExposedPorts(...(this.hasExposedPorts ? this.opts.exposedPorts : [ELASTIC_SEARCH_HTTP_PORT]))
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
