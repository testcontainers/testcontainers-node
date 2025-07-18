import mongoose from "mongoose";
import { getImage } from "../../testcontainers/src/utils/test-helper";
import { MongoDBContainer } from "./mongodb-container";

const IMAGE = getImage(__dirname);

describe("MongodbContainer", { timeout: 240_000 }, () => {
  // connect4 {
  it("should work using default version 4.0.1", async () => {
    await using mongodbContainer = await new MongoDBContainer(IMAGE).start();

    // directConnection: true is required as the testcontainer is created as a MongoDB Replica Set.
    const db = mongoose.createConnection(mongodbContainer.getConnectionString(), { directConnection: true });

    // You can also add the default connection flag as a query parameter
    // const connectionString = `${mongodbContainer.getConnectionString()}?directConnection=true`;
    // const db = mongoose.createConnection(connectionString);

    const fooCollection = db.collection("foo");
    const obj = { value: 1 };

    const session = await db.startSession();
    await session.withTransaction(async () => {
      await fooCollection.insertOne(obj);
    });

    expect(
      await fooCollection.findOne({
        value: 1,
      })
    ).toEqual(obj);

    await mongoose.disconnect();
  });
  // }

  // connect6 {
  it("should work using version 6.0.1", async () => {
    await using mongodbContainer = await new MongoDBContainer("mongo:6.0.1").start();

    // directConnection: true is required as the testcontainer is created as a MongoDB Replica Set.
    const db = mongoose.createConnection(mongodbContainer.getConnectionString(), { directConnection: true });

    // You can also add the default connection flag as a query parameter
    // const connectionString = `${mongodbContainer.getConnectionString()}?directConnection=true`;
    // const db = mongoose.createConnection(connectionString);

    const fooCollection = db.collection("foo");
    const obj = { value: 1 };

    const session = await db.startSession();
    await session.withTransaction(async () => {
      await fooCollection.insertOne(obj);
    });

    expect(
      await fooCollection.findOne({
        value: 1,
      })
    ).toEqual(obj);

    await mongoose.disconnect();
  });
  // }
});
