import { AbstractStartedContainer, GenericContainer, StartedTestContainer, Wait } from "testcontainers";
import zxcvbn from "zxcvbn";

const OPENSEARCH_HTTP_PORT = 9200;
const OPENSEARCH_TRANSPORT_PORT = 9300;
const OPENSEARCH_PERFORMANCE_ANALYZER_PORT = 9600;

export class OpenSearchContainer extends GenericContainer {
  // default to security on, with a strong demo password
  private securityEnabled = true;
  private password = "yourStrong(!)P@ssw0rd";
  private readonly username = "admin";

  // HTTPS + Basic Auth wait strategy
  private readonly defaultWaitStrategy = Wait.forHttp("/", OPENSEARCH_HTTP_PORT)
    .usingTls()
    .allowInsecure()
    .withBasicCredentials(this.username, this.password);

  constructor(image: string) {
    super(image);

    this.withExposedPorts(OPENSEARCH_HTTP_PORT, OPENSEARCH_TRANSPORT_PORT, OPENSEARCH_PERFORMANCE_ANALYZER_PORT)
      .withEnvironment({
        "discovery.type": "single-node",
        // disable security plugin if requested
        "plugins.security.disabled": (!this.securityEnabled).toString(),
      })
      .withWaitStrategy(this.defaultWaitStrategy)
      .withStartupTimeout(120_000);
  }

  /**
   * Toggle OpenSearch security plugin on/off.
   */
  public withSecurityEnabled(enabled: boolean): this {
    this.securityEnabled = enabled;
    this.withEnvironment({
      "plugins.security.disabled": (!enabled).toString(),
    });
    return this;
  }

  /**
   * Override the 'admin' password.
   * Enforces OpenSearch’s requirement of zxcvbn score ≥ 3
   */
  public withPassword(password: string): this {
    const { score } = zxcvbn(password);
    if (score < 3) {
      throw new Error(
        `Password "${password}" is too weak (zxcvbn score ${score}). Must score ≥ 3 to meet OpenSearch security requirements.`
      );
    }

    this.password = password;
    this.defaultWaitStrategy.withBasicCredentials(this.username, this.password);
    return this;
  }

  /**
   * Start the container, injecting the initial-admin-password env var,
   * then wrap in our typed StartedOpenSearchContainer.
   */
  public override async start(): Promise<StartedOpenSearchContainer> {
    this.withEnvironment({
      OPENSEARCH_INITIAL_ADMIN_PASSWORD: this.password,
    });

    const started = await super.start();
    return new StartedOpenSearchContainer(started, this.username, this.password);
  }
}

export class StartedOpenSearchContainer extends AbstractStartedContainer {
  constructor(
    override readonly startedTestContainer: StartedTestContainer,
    private readonly username: string,
    private readonly password: string
  ) {
    super(startedTestContainer);
  }

  /** Mapped HTTP(S) port */
  public getPort(): number {
    return this.getMappedPort(OPENSEARCH_HTTP_PORT);
  }

  /** HTTPS endpoint URL */
  public getHttpUrl(): string {
    return `https://${this.getHost()}:${this.getPort()}`;
  }

  /** Admin username (always 'admin' by default) */
  public getUsername(): string {
    return this.username;
  }

  /** Admin password */
  public getPassword(): string {
    return this.password;
  }
}
