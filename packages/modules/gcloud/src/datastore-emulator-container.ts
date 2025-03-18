import { AbstractStartedContainer, StartedTestContainer } from "testcontainers";
import { AbstractGcloudEmulator } from "./abstract-gcloud-emulator";

const EMULATOR_PORT = 8080;
const DEFAULT_IMAGE = "gcr.io/google.com/cloudsdktool/cloud-sdk";

export class DatastoreEmulatorContainer extends AbstractGcloudEmulator {
  constructor(image = DEFAULT_IMAGE) {
    super(image, EMULATOR_PORT, "gcloud beta emulators firestore start");
    this.withFlag("database-mode", `datastore-mode`);
  }

  public override async start(): Promise<StartedDatastoreEmulatorContainer> {
    return new StartedDatastoreEmulatorContainer(await super.start());
  }
}

export class StartedDatastoreEmulatorContainer extends AbstractStartedContainer {
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
