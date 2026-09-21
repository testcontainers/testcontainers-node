import { Datastore } from "@google-cloud/datastore";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { DatastoreEmulatorContainer } from "./datastore-emulator-container";

const IMAGE = getImage(__dirname);

describe("DatastoreEmulatorContainer", { timeout: 240_000 }, () => {
  it("should work using default version", async () => {
    // datastoreExample {
    await using container = await new DatastoreEmulatorContainer(IMAGE).start();

    const datastore = new Datastore({
      projectId: "test-project",
      apiEndpoint: container.getEmulatorEndpoint(),
    });

    const key = datastore.key(["test-kind", "123"]);
    const data = { message: "Hello, Datastore!" };
    await datastore.save({ key, data });
    const [entity] = await datastore.get(key);

    expect(entity).toEqual({ message: "Hello, Datastore!", [Datastore.KEY]: key });
    // }
  });
});
