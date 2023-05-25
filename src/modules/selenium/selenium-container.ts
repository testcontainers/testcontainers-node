import { GenericContainer } from "../../generic-container/generic-container";
import { AbstractStartedContainer } from "../abstract-started-container";
import { Wait } from "../../wait-strategy/wait";
import { StartedTestContainer } from "../../test-container";

const SELENIUM_PORT = 4444;
const UNKNOWN_PORT = 7900;

export class SeleniumContainer extends GenericContainer {
  constructor(image = "selenium/standalone-chrome:112.0") {
    super(image);
  }

  protected override async beforeContainerStarted(): Promise<void> {
    this.withBindMounts([{ source: "/dev/shm", target: "/dev/shm", mode: "rw" }]);
    this.withExposedPorts(SELENIUM_PORT, UNKNOWN_PORT);
    this.withWaitStrategy(
      Wait.forAll([Wait.forLogMessage(/.*Started Selenium Standalone.*/), Wait.forListeningPorts()])
    );
  }

  public override async start(): Promise<StartedSeleniumContainer> {
    return new StartedSeleniumContainer(await super.start());
  }
}

export class StartedSeleniumContainer extends AbstractStartedContainer {
  private readonly serverUrl: string;

  constructor(startedTestContainer: StartedTestContainer) {
    super(startedTestContainer);
    this.serverUrl = `http://${this.getHost()}:${this.getMappedPort(4444)}/wd/hub`;
  }

  getServerUrl(): string {
    return this.serverUrl;
  }
}
