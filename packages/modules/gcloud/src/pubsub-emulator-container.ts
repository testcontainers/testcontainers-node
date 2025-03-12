import type { StartedTestContainer } from "testcontainers";
import { AbstractStartedContainer, Wait } from "testcontainers";
import { GenericGCloudEmulatorContainer } from "./generic-emulator-container";

const EMULATOR_PORT = 8085;
const CMD = "gcloud beta emulators pubsub start";
const DEFAULT_IMAGE = "gcr.io/google.com/cloudsdktool/google-cloud-cli";

export class PubSubEmulatorContainer extends GenericGCloudEmulatorContainer {
  private _projectId?: string;

  constructor(image = DEFAULT_IMAGE) {
    super(image);

    this.withExposedPorts(EMULATOR_PORT)
      .withFlag("host-port", `0.0.0.0:${EMULATOR_PORT}`)
      .withWaitStrategy(Wait.forLogMessage(/Server started/g, 1))
      .withStartupTimeout(120_000);
  }

  public withProjectId(projectId: string): this {
    this._projectId = projectId;
    return this;
  }

  public override async start(): Promise<StartedPubSubEmulatorContainer> {
    // Determine the valid command-line prompt when starting the Pub/Sub emulator
    const selectedProjectId = this._projectId ?? "test-project";
    this
      .withFlag("project", selectedProjectId)
      .withCommand(["/bin/sh", "-c", `${CMD} ${this.expandFlags()}`]);

    return new StartedPubSubEmulatorContainer(await super.start(), selectedProjectId);
  }
}

export class StartedPubSubEmulatorContainer extends AbstractStartedContainer {
  constructor(startedTestContainer: StartedTestContainer, private readonly projectId: string) {
    super(startedTestContainer);
  }

  /**
   * @return a <code>host:port</code> pair corresponding to the address on which the emulator is
   * reachable from the test host machine.
   */
  public getEmulatorEndpoint(): string {
    return `${this.getHost()}:${this.getMappedPort(EMULATOR_PORT)}`;
  }

  /**
   * @returns the project ID associated with the Pub/Sub emulator.
   */
  public getProjectId(): string {
    return this.projectId;
  }
}
