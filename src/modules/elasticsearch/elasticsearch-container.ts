import { GenericContainer, StartedTestContainer } from "../..";
import { Image, Tag } from "../../repo-tag";
import { AbstractStartedContainer } from "../abstract-started-container";
import { Port } from "../../port";

const ELASTIC_SEARCH_HTTP_PORT = 9200;
const ELASTIC_SEARCH_IMAGE_NAME = "docker.elastic.co/elasticsearch/elasticsearch";
const ELASTIC_SEARCH_IMAGE_TAG = "7.9.2";

export class ElasticsearchContainer extends GenericContainer {
  private readonly httpPort = ELASTIC_SEARCH_HTTP_PORT;

  constructor(
    readonly image: Image = ELASTIC_SEARCH_IMAGE_NAME,
    readonly tag: Tag = ELASTIC_SEARCH_IMAGE_TAG,
    readonly timeout = 120_000
  ) {
    super(image, tag);

    this.withExposedPorts(this.httpPort).withEnv("discovery.type", "single-node").withStartupTimeout(timeout);
  }

  async start(): Promise<StartedElasticsearchContainer> {
    return new StartedElasticsearchContainer(await super.start(), this.httpPort);
  }
}

export class StartedElasticsearchContainer extends AbstractStartedContainer {
  constructor(readonly startedTestContainer: StartedTestContainer, private readonly httpPort: Port) {
    super(startedTestContainer);
  }

  getHttpUrl(): string {
    return `http://${this.getContainerIpAddress()}:${this.getMappedPort(this.httpPort)}`;
  }
}
