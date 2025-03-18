import { AbstractStartedContainer, StartedTestContainer } from "testcontainers";
import { AbstractGcloudEmulator } from "./abstract-gcloud-emulator";

const EMULATOR_PORT = 8080;
const DEFAULT_IMAGE = "gcr.io/google.com/cloudsdktool/cloud-sdk";

export class FirestoreEmulatorContainer extends AbstractGcloudEmulator {
  constructor(image = DEFAULT_IMAGE) {
    super(image, EMULATOR_PORT, "gcloud beta emulators firestore start");
  }

  public override async start(): Promise<StartedFirestoreEmulatorContainer> {
    return new StartedFirestoreEmulatorContainer(await super.start());
  }
}

export class StartedFirestoreEmulatorContainer extends AbstractStartedContainer {
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
