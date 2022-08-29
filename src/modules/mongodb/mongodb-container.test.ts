import mongoose from "mongoose";
import { MongoDBContainer } from "./mongodb-container";
import { MongoClient } from "mongodb";

describe("MongoDBContainer", () => {
  jest.setTimeout(180_000);

  it("Starts a MongoDB with default image", async function () {
    const container = await new MongoDBContainer().start();

    const userName = container.getUsername();
    const password = container.getPassword();
    const host = "127.0.0.1";
    const port = container.getPort();
    const database = container.getDatabase();

    //const uri = `mongodb://${userName}:${password}@${host}:${port}/${database}`
    const uri = `mongodb://${host}:${port}/${database}`;

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

  it("Starts a MongoDB with requested image", async function () {
    const container = await new MongoDBContainer("mongo:6.0.1").start();

    const host = "127.0.0.1";
    const port = container.getPort();
    const database = container.getDatabase();

    const uri = `mongodb://${host}:${port}/${database}`;

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
});
