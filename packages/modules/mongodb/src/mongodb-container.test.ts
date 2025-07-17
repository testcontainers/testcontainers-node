import mongoose from "mongoose";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { MongoDBContainer } from "./mongodb-container";

const IMAGE = getImage(__dirname);

describe("MongodbContainer", { timeout: 240_000 }, () => {
  // connect4 {
  it("should work using default version 4.0.1", async () => {
    const mongodbContainer = await new MongoDBContainer(IMAGE).start();

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
    await mongodbContainer.stop();
  });
  // }

  // connect6 {
  it("should work using version 6.0.1", async () => {
    const mongodbContainer = await new MongoDBContainer("mongo:6.0.1").start();

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
    await mongodbContainer.stop();
  });
  // }
});

describe("MongodbContainer connect with credentials", { timeout: 240_000 }, () => {
  it.for([["mongo:4.0.1"], ["mongo:5.0"], ["mongo:8.0"]])("should connect to %s with credentials", async ([image]) => {
    const mongodbContainer = await new MongoDBContainer(image)
      .withUsername("mongo_user")
      .withPassword("mongo_password")
      .start();
    const connection = mongoose.createConnection(mongodbContainer.getConnectionString(), {
      directConnection: true,
    });
    try {
      const result = await connection.collection("testcontainers").insertOne({ title: "testcontainers" });
      const id = result.insertedId.toString();
      expect(id).not.toBeNull();
      expect(id).not.toBe("");
      const rsStatus = await connection.db?.admin().replSetGetStatus();
      expect(rsStatus).toBeDefined();
      expect(rsStatus?.set).toBe("rs0");
    } finally {
      await connection.close();
      await mongodbContainer.stop();
    }
  });
});
