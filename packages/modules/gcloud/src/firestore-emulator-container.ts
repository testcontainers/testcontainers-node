import { AbstractStartedContainer, StartedTestContainer, Wait } from "testcontainers";
import { GenericGCloudEmulatorContainer } from "./generic-emulator-container";

const EMULATOR_PORT = 8080;
const CMD = `gcloud beta emulators firestore start`;
const DEFAULT_IMAGE = "gcr.io/google.com/cloudsdktool/cloud-sdk";

export class FirestoreEmulatorContainer extends GenericGCloudEmulatorContainer {
  constructor(image = DEFAULT_IMAGE) {
    super(image);
    this.withExposedPorts(EMULATOR_PORT)
      .withFlag("host-port", `0.0.0.0:${EMULATOR_PORT}`)
      .withCommand(["/bin/sh", "-c", `${CMD} ${this.expandFlags()}`])
      .withWaitStrategy(Wait.forLogMessage(RegExp(".*running.*"), 1))
      .withStartupTimeout(120_000);
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
