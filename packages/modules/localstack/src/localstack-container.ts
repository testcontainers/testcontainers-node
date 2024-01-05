import { AbstractStartedContainer, GenericContainer, log, StartedTestContainer, Wait } from "testcontainers";

export const LOCALSTACK_PORT = 4566;

const DEFAULT_REGION = "us-east-1";
const DEFAULT_AWS_ACCESS_KEY_ID = "test";
const DEFAULT_AWS_SECRET_ACCESS_KEY = "test";

export class LocalstackContainer extends GenericContainer {
  constructor(image = "localstack/localstack:2.2.0") {
    super(image);
  }

  private resolveHostname(): void {
    const envVar = "LOCALSTACK_HOST";
    let hostnameExternalReason;
    if (this.environment[envVar]) {
      // do nothing
      hostnameExternalReason = "explicitly as environment variable";
    } else if (this.networkAliases && this.networkAliases.length > 0) {
      this.environment[envVar] = this.networkAliases.at(this.networkAliases.length - 1) || ""; // use the last network alias set
      hostnameExternalReason = "to match last network alias on container with non-default network";
    } else {
      this.withEnvironment({ LOCALSTACK_HOST: "localhost" });
      hostnameExternalReason = "to match host-routable address for container";
    }
    log.info(`${envVar} environment variable set to ${this.environment[envVar]} (${hostnameExternalReason})"`);
  }

  protected override async beforeContainerCreated(): Promise<void> {
    this.resolveHostname();
    this.withExposedPorts(...(this.hasExposedPorts ? this.exposedPorts : [LOCALSTACK_PORT]))
      .withWaitStrategy(Wait.forLogMessage("Ready", 1))
      .withStartupTimeout(120_000);
  }

  public override async start(): Promise<StartedLocalStackContainer> {
    return new StartedLocalStackContainer(await super.start());
  }
}

export class StartedLocalStackContainer extends AbstractStartedContainer {
  constructor(startedTestContainer: StartedTestContainer) {
    super(startedTestContainer);
  }

  public getPort(): number {
    return this.startedTestContainer.getMappedPort(LOCALSTACK_PORT);
  }

  /**
   * @returns A connection URI in the form of `http://host:port`
   */
  public getConnectionUri(): string {
    return `http://${this.getHost()}:${this.getPort().toString()}`;
  }

  /**
   * Provides a default region that is preconfigured to communicate with a given simulated service.
   * @returns A default region
   */
  public getRegion(): string {
    return this.startedTestContainer.getEnvironment()["DEFAULT_REGION"] || DEFAULT_REGION;
  }

  /**
   * Provides a default access key that is preconfigured to communicate with a given simulated service.
   * <a href="https://github.com/localstack/localstack/blob/master/doc/interaction/README.md?plain=1#L32">AWS Access Key</a>
   * @returns A default access key
   */
  public getAccessKey(): string {
    return this.startedTestContainer.getEnvironment()["AWS_ACCESS_KEY_ID"] || DEFAULT_AWS_ACCESS_KEY_ID;
  }

  /**
   * Provides a default secret key that is preconfigured to communicate with a given simulated service.
   * <a href="https://github.com/localstack/localstack/blob/master/doc/interaction/README.md?plain=1#L32">AWS Secret Key</a>
   * @returns A default secret key
   */
  public getSecretKey(): string {
    return this.startedTestContainer.getEnvironment()["AWS_SECRET_ACCESS_KEY"] || DEFAULT_AWS_SECRET_ACCESS_KEY;
  }
}
