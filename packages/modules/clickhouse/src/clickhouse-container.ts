import { AbstractStartedContainer, GenericContainer, StartedTestContainer, Wait } from "testcontainers";

const IMAGE_NAME = "clickhouse/clickhouse-server";
const DEFAULT_IMAGE_VER = "23.3.8.21-alpine"

const HTTP_PORT = 8123;
const NATIVE_PORT = 9000;

const CONFIG_PATH_XML = "/etc/clickhouse-server/config.d/config.xml";
const CONFIG_PATH_YAML = "/etc/clickhouse-server/config.d/config.yaml";
const CONFIG_FILE_MODE = parseInt("0644", 8)

export class ClickhouseContainer extends GenericContainer {
  private database = "test";
  private username = "test";
  private password = "test";
  private hostConfigPathXml: string = "";
  private hostConfigPathYaml: string = "";

  constructor(imageVer = DEFAULT_IMAGE_VER) {
    super(`${IMAGE_NAME}:${imageVer}`);
  }

  public withDatabase(database: string): this {
    this.database = database;
    return this;
  }

  public withUsername(username: string): this {
    this.username = username;
    return this;
  }

  public withPassword(password: string): this {
    this.password = password;
    return this;
  }

  public withXmlConfigFile(path: string): this {
    this.hostConfigPathXml = path;
    return this;
  }

  public withYamlConfigFile(path: string): this {
    this.hostConfigPathYaml = path;
    return this;
  }

  public override async start(): Promise<StartedClickhouseContainer> {
    this.withExposedPorts(...(this.hasExposedPorts ? this.exposedPorts : [HTTP_PORT, NATIVE_PORT]))
      .withEnvironment({
        CLICKHOUSE_DB: this.database,
        CLICKHOUSE_USER: this.username,
        CLICKHOUSE_PASSWORD: this.password,
      })
      .withWaitStrategy(Wait.forHttp(`/ping`, HTTP_PORT)
        .forStatusCode(200)
      )
      .withStartupTimeout(120_000);
    
    if (this.hostConfigPathXml)
      this.withCopyFilesToContainer([{source: this.hostConfigPathXml, target: CONFIG_PATH_XML, mode: CONFIG_FILE_MODE}]);
    if (this.hostConfigPathYaml)
      this.withCopyFilesToContainer([{source: this.hostConfigPathYaml, target: CONFIG_PATH_YAML, mode: CONFIG_FILE_MODE}]);

    return new StartedClickhouseContainer(
      await super.start(),
      HTTP_PORT,
      NATIVE_PORT,
      this.database,
      this.username,
      this.password,
    );
  }
}

export class StartedClickhouseContainer extends AbstractStartedContainer {
  private readonly httpHostPort: number;
  private readonly nativeHostPort: number;

  constructor(
    startedTestContainer: StartedTestContainer,
    httpPort: number,
    nativePort: number,
    private readonly database: string,
    private readonly username: string,
    private readonly password: string,
  ) {
    super(startedTestContainer);
    this.httpHostPort = startedTestContainer.getMappedPort(httpPort);
    this.nativeHostPort = startedTestContainer.getMappedPort(nativePort);
  }

  public getHostPorts(): {http: number; native: number} {
    return {http: this.httpHostPort, native: this.nativeHostPort}
  }

  public getDatabase(): string {
    return this.database;
  }

  public getUsername(): string {
    return this.username;
  }

  public getPassword(): string {
    return this.password;
  }
}
