import {
  AbstractStartedContainer,
  GenericContainer,
  getContainerRuntimeClient,
  getReaper,
  LABEL_TESTCONTAINERS_SESSION_ID,
  log,
  StartedTestContainer,
  Wait,
} from "testcontainers";

export const LOCALSTACK_PORT = 4566;

export class LocalstackContainer extends GenericContainer {
  constructor(image = "localstack/localstack:2.2.0") {
    super(image);

    this.withExposedPorts(LOCALSTACK_PORT).withWaitStrategy(Wait.forLogMessage("Ready", 1)).withStartupTimeout(120_000);
  }

  private resolveHostname(): void {
    const envVar = "LOCALSTACK_HOST";
    let hostnameExternalReason;
    if (this.environment[envVar]) {
      // do nothing
      hostnameExternalReason = "explicitly as environment variable";
    } else if (this.networkAliases && this.networkAliases.length > 0) {
      // use the last network alias set
      this.withEnvironment({ [envVar]: this.networkAliases.at(this.networkAliases.length - 1) ?? "" });
      hostnameExternalReason = "to match last network alias on container with non-default network";
    } else {
      this.withEnvironment({ [envVar]: "localhost" });
      hostnameExternalReason = "to match host-routable address for container";
    }
    log.info(`${envVar} environment variable set to "${this.environment[envVar]}" (${hostnameExternalReason})`);
  }

  /**
   * Configure the LocalStack container to add sessionId when starting lambda container.
   * This allows the lambda container to be identified by the {@link Reaper} and cleaned up on exit.
   */
  private async flagLambdaSessionId(): Promise<void> {
    const client = await getContainerRuntimeClient();
    const reaper = await getReaper(client);

    this.withEnvironment({
      LAMBDA_DOCKER_FLAGS: `${this.environment["LAMBDA_DOCKER_FLAGS"] ?? ""} -l ${LABEL_TESTCONTAINERS_SESSION_ID}=${reaper.sessionId}`,
    });
  }

  protected override async beforeContainerCreated(): Promise<void> {
    this.resolveHostname();
    await this.flagLambdaSessionId();
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
}
