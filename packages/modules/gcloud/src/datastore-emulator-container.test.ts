import { Datastore } from "@google-cloud/datastore";
import { Wait } from "testcontainers";
import { DatastoreEmulatorContainer, StartedDatastoreEmulatorContainer } from "./datastore-emulator-container";

describe("DatastoreEmulatorContainer", { timeout: 240_000 }, () => {
  // datastore4 {
  it("should work using default version", async () => {
    const datastoreEmulatorContainer = await new DatastoreEmulatorContainer().start();

    await checkDatastore(datastoreEmulatorContainer);

    await datastoreEmulatorContainer.stop();
  });
  // }

  // datastore5 {
  it("should work using version 468.0.0", async () => {
    const datastoreEmulatorContainer = await new DatastoreEmulatorContainer(
      "gcr.io/google.com/cloudsdktool/google-cloud-cli:468.0.0-emulators"
    ).start();

    await checkDatastore(datastoreEmulatorContainer);

    await datastoreEmulatorContainer.stop();
  });

  // }

  it("should have default host-port flag and database-mode flag", async () => {
    const datastoreEmulatorContainer = new DatastoreEmulatorContainer();

    const flags = datastoreEmulatorContainer["flagsManager"].expandFlags();

    expect(flags.trim()).toEqual("--host-port=0.0.0.0:8080 --database-mode=datastore-mode");
  });

  it("should be able to add flags after creating container", async () => {
    const datastoreEmulatorContainer = new DatastoreEmulatorContainer();
    // clear all default flags
    datastoreEmulatorContainer["flagsManager"].clearFlags();

    // add some new flags
    const flags = datastoreEmulatorContainer
      .withFlag("host-port", "0.0.0.0:8080")
      .withFlag("database-mode", "datastore-mode")
      ["flagsManager"].expandFlags();

    // check new added flags exists
    expect(flags.trim()).toEqual("--host-port=0.0.0.0:8080 --database-mode=datastore-mode");

    // check that container start command uses latest flags string
    const startedContainer = await datastoreEmulatorContainer
      .withWaitStrategy(Wait.forLogMessage(/.* start --host=0.0.0.0 --port=8080 --database-mode=datastore-mode/, 1))
      .start();
    await startedContainer.stop();
  });

  async function checkDatastore(datastoreEmulatorContainer: StartedDatastoreEmulatorContainer) {
    expect(datastoreEmulatorContainer).toBeDefined();
    const testProjectId = "test-project";
    const testKind = "test-kind";
    const testId = "123";
    const databaseConfig = { projectId: testProjectId, apiEndpoint: datastoreEmulatorContainer.getEmulatorEndpoint() };
    const datastore = new Datastore(databaseConfig);

    const key = datastore.key([testKind, testId]);
    const data = { message: "Hello, Datastore!" };
    await datastore.save({ key, data });
    const [entity] = await datastore.get(key);

    expect(entity).toEqual({ message: "Hello, Datastore!", [Datastore.KEY]: key });
  }
});
