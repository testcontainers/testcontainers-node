import { MongoDBContainer } from "./mongodb-container";
import mongoose from "mongoose";
import { StartedTestContainer } from "../../test-container";

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

  async function checkMongo(mongodbContainer: StartedTestContainer, port = 27017) {
    const db = await mongoose.createConnection(
      `mongodb://${mongodbContainer.getHost()}:${mongodbContainer.getMappedPort(port)}`,
      {
        directConnection: true,
      }
    );
    const fooCollection = db.collection("foo");
    const obj = { value: 1 };

    const session = await db.startSession();
    await session.withTransaction(() => {
      return fooCollection.insertOne(obj);
    });

    expect(
      await fooCollection.findOne({
        value: 1,
      })
    ).toEqual(obj);
  }
});
