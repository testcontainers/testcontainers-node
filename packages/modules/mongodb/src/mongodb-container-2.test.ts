import mongoose from "mongoose";
import { MongoDBContainer2, StartedMongoDBContainer2 } from "./mongodb-container-2";

describe("MongodbContainer", { timeout: 240_000 }, () => {
  test.for([
    ["mongo:5.0", "true"],
    ["mongo:8.0", "true"],
    ["mongo:5.0", "false"],
    ["mongo:8.0", "false"],
  ])("should connect to %s (credentials: %s)", async ([image, creds]) => {
    const mongodbContainer = await getContainer(image, creds === "true");
    await runTest(mongodbContainer);
  });
});

async function getContainer(image: string, auth: boolean) {
  if (auth) return new MongoDBContainer2(image).withUsername("mongo_user").withPassword("mongo_password").start();
  return new MongoDBContainer2(image).start();
}

async function runTest(mongodbContainer: StartedMongoDBContainer2) {
  const mongo = await mongoose.connect(mongodbContainer.getConnectionString(), { directConnection: true });
  expect(mongo.connection.readyState).toBe(1);
  const result = await mongo.connection.collection("testcontainers").insertOne({ title: "testcontainers" });
  const id = result.insertedId.toString();
  expect(id).not.toBeNull();
  expect(id).not.toBe("");
  const rsStatus = await mongo.connection.db?.admin().replSetGetStatus();
  expect(rsStatus).toBeDefined();
  expect(rsStatus?.set).toBe("rs0");
  await mongo.disconnect();
  await mongodbContainer.stop();
}
