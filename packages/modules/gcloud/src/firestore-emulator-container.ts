import { AbstractStartedContainer, GenericContainer, StartedTestContainer, Wait } from "testcontainers";

const EMULATOR_PORT = 8080;
const CMD = `gcloud beta emulators firestore start --host-port 0.0.0.0:${EMULATOR_PORT}`;
const DEFAULT_IMAGE = "gcr.io/google.com/cloudsdktool/cloud-sdk";
enum DatabaseMode {
  FirestoreNative = "firestore-native",
  DatastoreMode = "datastore-mode",
}

export class FirestoreEmulatorContainer extends GenericContainer {
  constructor(image = DEFAULT_IMAGE, useDatastoreMode = false) {
    super(image);
    this.withExposedPorts(EMULATOR_PORT)
      .withCommand([
        "/bin/sh",
        "-c",
        CMD,
        `--database-mode=${useDatastoreMode ? DatabaseMode.DatastoreMode : DatabaseMode.FirestoreNative}`,
      ])
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
