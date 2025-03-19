import { AbstractStartedContainer, StartedTestContainer, Wait } from "testcontainers";
import { AbstractGcloudEmulator } from "./abstract-gcloud-emulator";

const EMULATOR_PORT = 8085;
const DEFAULT_IMAGE = "gcr.io/google.com/cloudsdktool/google-cloud-cli";

export class PubSubEmulatorContainer extends AbstractGcloudEmulator {
  private projectId?: string;

  constructor(image = DEFAULT_IMAGE) {
    super(image, EMULATOR_PORT, "gcloud beta emulators pubsub start");
    this.withWaitStrategy(Wait.forLogMessage(/Server started/g));
  }

  public withProjectId(projectId: string): this {
    this.projectId = projectId;
    return this;
  }

  public override async start(): Promise<StartedPubSubEmulatorContainer> {
    const selectedProjectId = this.projectId ?? "test-project";
    this.withFlag("project", selectedProjectId);

    return new StartedPubSubEmulatorContainer(await super.start(), selectedProjectId);
  }
}

export class StartedPubSubEmulatorContainer extends AbstractStartedContainer {
  constructor(
    startedTestContainer: StartedTestContainer,
    private readonly projectId: string
  ) {
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
