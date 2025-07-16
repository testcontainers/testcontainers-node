import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { SpannerEmulatorContainer } from "./spanner-emulator-container";
import { SpannerEmulatorHelper } from "./spanner-emulator-helper";

// select the fourth FROM in the Dockerfile (spanner emulator)
const IMAGE = getImage(__dirname, 3);

describe("SpannerEmulatorHelper", { timeout: 240_000 }, () => {
  it("should create and delete instance and database via helper", async () => {
    // createAndDelete {
    const container = await new SpannerEmulatorContainer(IMAGE).start();
    const helper = new SpannerEmulatorHelper(container);
    const instanceId = "test-instance";
    const databaseId = "test-db";

    // create resources
    await helper.createInstance(instanceId);
    await helper.createDatabase(instanceId, databaseId);

    const client = helper.client;

    // verify instance exists
    const [instanceExists] = await client.instance(instanceId).exists();
    expect(instanceExists).toBe(true);

    // verify database exists
    const [dbExists] = await client.instance(instanceId).database(databaseId).exists();
    expect(dbExists).toBe(true);

    // delete resources
    await helper.deleteDatabase(instanceId, databaseId);
    await helper.deleteInstance(instanceId);

    // verify deletions
    const [dbExistsAfter] = await client.instance(instanceId).database(databaseId).exists();
    expect(dbExistsAfter).toBe(false);

    const [instanceExistsAfter] = await client.instance(instanceId).exists();
    expect(instanceExistsAfter).toBe(false);

    await container.stop();
    // }
  });
});
