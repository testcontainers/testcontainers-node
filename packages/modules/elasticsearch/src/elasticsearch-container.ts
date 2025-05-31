import { AbstractStartedContainer, GenericContainer, StartedTestContainer, Wait } from "testcontainers";

const ELASTIC_SEARCH_HTTP_PORT = 9200;

export class ElasticsearchContainer extends GenericContainer {
  private password = "changeme";
  private readonly username = "elastic";
  private readonly defaultWaitStrategy = Wait.forHttp("/", ELASTIC_SEARCH_HTTP_PORT).withBasicCredentials(
    this.username,
    this.password
  );

  constructor(image: string) {
    super(image);
    this.withExposedPorts(ELASTIC_SEARCH_HTTP_PORT)
      .withEnvironment({
        "discovery.type": "single-node",
        "xpack.security.http.ssl.enabled": "false",
      })
      .withCopyContentToContainer([
        {
          content: "-Xmx2G\n",
          target: "/usr/share/elasticsearch/config/jvm.options.d/elasticsearch-default-memory-vm.options",
        },
      ])
      .withWaitStrategy(this.defaultWaitStrategy)
      .withStartupTimeout(120_000);
  }

  public withPassword(password: string): this {
    this.password = password;
    this.defaultWaitStrategy.withBasicCredentials(this.username, this.password);
    return this;
  }

  public override async start(): Promise<StartedElasticsearchContainer> {
    this.withEnvironment({
      ELASTIC_PASSWORD: this.password,
    });

    return new StartedElasticsearchContainer(await super.start(), this.username, this.password);
  }
}

export class StartedElasticsearchContainer extends AbstractStartedContainer {
  constructor(
    override readonly startedTestContainer: StartedTestContainer,
    private readonly username: string,
    private readonly password: string
  ) {
    super(startedTestContainer);
  }

  public getPort(): number {
    return this.getMappedPort(ELASTIC_SEARCH_HTTP_PORT);
  }

  public getHttpUrl(): string {
    return `http://${this.getHost()}:${this.getPort()}`;
  }

  public getUsername(): string {
    return this.username;
  }

  public getPassword(): string {
    return this.password;
  }
}
