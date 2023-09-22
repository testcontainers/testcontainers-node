import {
  AbstractStartedContainer,
  AbstractStoppedContainer,
  GenericContainer,
  StartedTestContainer,
  StopOptions,
  StoppedTestContainer,
  Wait,
  BindMount,
} from "testcontainers";

const PLAYWRIGHT_DEFAULT_PORT = 80;

export class PlaywrightContainer extends GenericContainer {
  private bindMounts: BindMount[];

  private port: PortWithOptionalBinding;

  constructor(
    image = "mcr.microsoft.com/playwright:next-focal-amd64",
    bindMounts: BindMount[],
    port = PLAYWRIGHT_DEFAULT_PORT
  ) {
    super(image);
    this.bindMounts = bindMounts;
    this.port = port;
  }

  protected override async beforeContainerCreated(): Promise<void> {
    this.withExposedPorts([this.port]).withBindMounts(this.bindMounts);
    /*
    .withCommand([
        "bash",
        "-c",
        "echo 'START'; sleep infinity",
        "ls",
        "cd playwright",
        "npm i",
        "npx playwright test",
      ]);
    */
  }

  override async start(): Promise<StartedPlaywrightContainer> {
    return new StartedPlaywrightContainer(await super.start());
  }
}

export class StartedPlaywrightContainer extends AbstractStartedContainer {
  private readonly serverUrl: string;

  constructor(startedTestContainer: StartedTestContainer) {
    super(startedTestContainer);
    this.serverUrl = `http://${this.getHost()}:${this.getMappedPort(PLAYWRIGHT_DEFAULT_PORT)}/wd/hub`;
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
