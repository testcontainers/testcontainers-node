import { MongoDBContainer, StartedMongoDBContainer } from "./mongodb-container";
import mongoose from "mongoose";
import { Network } from "../../network";
import { GenericContainer } from "../../generic-container/generic-container";

describe("MongodbContainer", () => {
  jest.setTimeout(240_000);

  // connect4 {
  it("should work using default version 4.0.1", async () => {
    const mongodbContainer = await new MongoDBContainer().start();

    await checkMongo(mongodbContainer);

    await mongoose.disconnect();
    await mongodbContainer.stop();
  });
  // }

  // connect6 {
  it("should work using version 6.0.1", async () => {
    const mongodbContainer = await new MongoDBContainer("mongo:6.0.1").start();

    await checkMongo(mongodbContainer);

    await mongoose.disconnect();
    await mongodbContainer.stop();
  });
  // }

  it("should connect inside a network", async () => {
    const network = await new Network().start();
    const mongoContainer = await new MongoDBContainer().withNetwork(network).withNetworkAliases("mongo-t1").start();
    const mongoClientContainer = await new GenericContainer("mongo:4.0.1").withNetwork(network).start();

    const { exitCode } = await mongoClientContainer.exec([
      "mongo",
      mongoContainer.getConnectionString(),
      "--eval",
      "printjson(db.serverStatus())",
    ]);

    expect(exitCode).toEqual(0);

    await mongoClientContainer.stop();
    await mongoContainer.stop();
    await network.stop();
  });

  async function checkMongo(mongodbContainer: StartedMongoDBContainer) {
    const db = mongoose.createConnection(mongodbContainer.getConnectionString(), { directConnection: true });
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
