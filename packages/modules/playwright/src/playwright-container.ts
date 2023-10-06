import {
  AbstractStartedContainer,
  AbstractStoppedContainer,
  GenericContainer,
  StartedTestContainer,
  StopOptions,
  StoppedTestContainer,
  BindMount,
  Wait,
  // Wait,
} from "testcontainers";

const PLAYWRIGHT_DEFAULT_PORT = 80;

export class PlaywrightContainer extends GenericContainer {
  private readonly bindMounts: BindMount[];

  constructor(image = "mcr.microsoft.com/playwright:next-focal-amd64", bindMounts: BindMount[]) {
    super(image);
    this.bindMounts = bindMounts;
  }

  protected override async beforeContainerCreated(): Promise<void> {
    this.withExposedPorts(PLAYWRIGHT_DEFAULT_PORT)
      .withBindMounts(this.bindMounts)
      /*.withCommand([
        "bash",
        "-c",
        "echo 'START'; sleep infinity",
        "ls",
        "cd playwright",
        "npm i",
        "npx playwright test",
      ])*/
      .withWaitStrategy(
        Wait.forAll([
          Wait.forListeningPorts(),
          /*Wait.forHttp("/status", PLAYWRIGHT_DEFAULT_PORT).forResponsePredicate((response) => {
            try {
              return JSON.parse(response).value.ready;
            } catch {
              return false;
            }
          }),*/
        ])
      );

    this.withBindMounts(this.bindMounts);
  }

  override async start(): Promise<StartedPlaywrightContainer> {
    return new StartedPlaywrightContainer(await super.start());
  }
}

export class StartedPlaywrightContainer extends AbstractStartedContainer {
  private readonly serverUrl: string;

  constructor(startedTestContainer: StartedTestContainer) {
    super(startedTestContainer);
    this.serverUrl = `http://${this.getHost()}:${this.getMappedPort(PLAYWRIGHT_DEFAULT_PORT)}`;
  }

  getServerUrl(): string {
    return this.serverUrl;
  }

  override async stop(options?: Partial<StopOptions>): Promise<StoppedPlaywrightContainer> {
    return new StoppedPlaywrightContainer(await super.stop(options));
  }
}

export class StoppedPlaywrightContainer extends AbstractStoppedContainer {
  constructor(private readonly stoppedPlaywrightContainer: StoppedTestContainer) {
    super(stoppedPlaywrightContainer);
  }
}
