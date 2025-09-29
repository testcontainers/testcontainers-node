import { Datastore } from "@google-cloud/datastore";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { DatastoreEmulatorContainer } from "./datastore-emulator-container";

const IMAGE = getImage(__dirname);

describe("DatastoreEmulatorContainer", { timeout: 240_000 }, () => {
  it.each([IMAGE, "gcr.io/google.com/cloudsdktool/google-cloud-cli:468.0.0-emulators"])(
    "should work with %s",
    async (image) => {
      // datastoreExample {
      await using container = await new DatastoreEmulatorContainer(image).start();

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
    }
  );
});
