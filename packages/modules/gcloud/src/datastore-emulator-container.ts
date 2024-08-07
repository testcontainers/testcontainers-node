import { AbstractStartedContainer, GenericContainer, StartedTestContainer, Wait } from "testcontainers";

const EMULATOR_PORT = 8080;
const CMD = `gcloud beta emulators firestore start --host-port 0.0.0.0:${EMULATOR_PORT} --database-mode=datastore-mode`;
const DEFAULT_IMAGE = "gcr.io/google.com/cloudsdktool/cloud-sdk";

export class DatastoreEmulatorContainer extends GenericContainer {
  constructor(image = DEFAULT_IMAGE) {
    super(image);
    this.withExposedPorts(EMULATOR_PORT)
      .withCommand(["/bin/sh", "-c", CMD])
      .withWaitStrategy(Wait.forLogMessage(RegExp(".*running.*"), 1))
      .withStartupTimeout(120_000);
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
