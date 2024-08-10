import { AbstractStartedContainer, GenericContainer, Wait } from "testcontainers";
import type { StartedTestContainer } from "testcontainers";

const EMULATOR_PORT = 8085;
const CMD = "gcloud beta emulators pubsub start --host-port 0.0.0.0:8085";
const DEFAULT_IMAGE = "gcr.io/google.com/cloudsdktool/google-cloud-cli";

export class PubSubEmulatorContainer extends GenericContainer {
  private _projectId?: string;

  constructor(image = DEFAULT_IMAGE) {
    super(image);

    const commandLine = `${CMD} --project=${this._projectId ?? "test-project"}`;
    this.withExposedPorts(EMULATOR_PORT)
      .withWaitStrategy(Wait.forLogMessage(/Server started/g, 1))
      .withCommand(["/bin/sh", "-c", commandLine])
      .withStartupTimeout(120_000);
  }

  public withProjectId(projectId: string): PubSubEmulatorContainer {
    this._projectId = projectId;
    return this;
  }

  public override async start(): Promise<StartedPubSubEmulatorContainer> {
    return new StartedPubSubEmulatorContainer(await super.start());
  }
}

export class StartedPubSubEmulatorContainer extends AbstractStartedContainer {
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(startedTestContainer: StartedTestContainer) {
    super(startedTestContainer);
  }

  /**
   * @return a <code>host:port</code> pair corresponding to the address on which the emulator is
   * reachable from the test host machine.
   */
  public getEmulatorEndpoint(): string {
    return `${this.getHost()}:${this.getMappedPort(EMULATOR_PORT)}`;
  }
}
