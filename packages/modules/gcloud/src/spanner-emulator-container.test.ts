import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { SpannerEmulatorContainer } from "./spanner-emulator-container";

// select the fourth FROM in the Dockerfile (spanner emulator)
const IMAGE = getImage(__dirname, 3);

describe("SpannerEmulatorContainer", { timeout: 240_000 }, () => {
  it("should start and expose endpoints", async () => {
    // <example startup> {
    const container = await new SpannerEmulatorContainer(IMAGE).withProjectId("test-project").start();
    const grpcEndpoint = container.getEmulatorGrpcEndpoint();

    expect(grpcEndpoint).toMatch(/localhost:\d+/);

    await container.stop();
    // }
  });

  it("should create and delete instance and database via helper", async () => {
    // <example createAndDelete> {
    const container = await new SpannerEmulatorContainer(IMAGE).start();
    const helper = container.helper;
    const instanceId = "test-instance";
    const databaseId = "test-db";

    // must set env for client operations
    helper.setAsEmulatorHost();

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
