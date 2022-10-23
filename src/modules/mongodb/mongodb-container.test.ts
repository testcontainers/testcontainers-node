import { MongoDBContainer, StartedMongoDBContainer } from "./mongodb-container";
import mongoose from "mongoose";

describe("MongodbContainer", () => {
  jest.setTimeout(240_000);

  it("should work using default version 4.0.1", async () => {
    const mongodbContainer = await new MongoDBContainer().start();

    await checkMongo(mongodbContainer);

    await mongoose.disconnect();
    await mongodbContainer.stop();
  });

  it("should work using version 6.0.1", async () => {
    const mongodbContainer = await new MongoDBContainer("mongo:6.0.1").start();

    await checkMongo(mongodbContainer);

    await mongoose.disconnect();
    await mongodbContainer.stop();
  });

  async function checkMongo(mongodbContainer: StartedMongoDBContainer) {
    const db = await mongoose.createConnection(mongodbContainer.getConnectionString(), {
      directConnection: true,
    });
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
  }
});
