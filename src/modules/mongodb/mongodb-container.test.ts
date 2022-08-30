import { MongoDBContainer } from "./mongodb-container";
import { MongoClient } from "mongodb";

describe("MongoDBContainer", () => {
  jest.setTimeout(180_000);

  it("Starts a MongoDB with default image", async function () {
    const container = await new MongoDBContainer().start();

    const username = container.getRootUsername();
    const password = container.getRootPassword();
    const host = container.getHost();
    const port = container.getPort();
    const database = container.getDatabase();

    const uri = `mongodb://${username}:${password}@${host}:${port}/${database}?authSource=admin&w=1`;

    await MongoClient.connect(uri).then(async function (client) {
      const adminDb = client?.db(database).admin();
      await adminDb.buildInfo().then(async function (info) {
        if (info) {
          expect(info?.version).toBe("6.0.1");
        }
      });
      await client?.close();
    });

    await container.stop();
  });

  it("Starts a MongoDB with requested image", async function () {
    const container = await new MongoDBContainer("mongo:4.2.22")
      .withDatabase("myDB")
      .withRootUsername("MyMongoUser")
      .withRootPassword("SomePassword")
      .start();

    const username = container.getRootUsername();
    const password = container.getRootPassword();
    const host = container.getHost();
    const port = container.getPort();
    const database = container.getDatabase();

    const uri = `mongodb://${username}:${password}@${host}:${port}/${database}?authSource=admin&w=1`;

    await MongoClient.connect(uri).then(async function (client) {
      const adminDb = client?.db(database).admin();
      await adminDb.buildInfo().then(async function (info) {
        if (info) {
          expect(info?.version).toBe("4.2.22");
        }
      });
      await client?.close();
    });

    await container.stop();
  });
});
