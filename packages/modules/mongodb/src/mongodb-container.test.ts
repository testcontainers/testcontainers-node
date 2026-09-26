import mongoose from "mongoose";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { MongoDBContainer } from "./mongodb-container";

const IMAGE = getImage(__dirname);

describe("MongoDBContainer", { timeout: 240_000 }, () => {
  it.each([
    IMAGE,
    "mongo:6.0.25",
    "mongo:4.4.29",
    "mongo:8.2.12@sha256:e0ce8c35124d4a9f9785532d1f268f39e9728ffa1cb38f46fa482436424c4bd3",
  ])("should work with %s", async (image) => {
    // connectMongo {
    await using container = await new MongoDBContainer(image).start();

    const db = mongoose.createConnection(container.getConnectionString(), { directConnection: true });

    const obj = { value: 1 };
    const collection = db.collection("test");
    await collection.insertOne(obj);

    const result = await collection.findOne({ value: 1 });
    expect(result).toEqual(obj);

    await db.close();
    // }
  });

  it("should connect with credentials", async () => {
    // connectWithCredentials {
    await using container = await new MongoDBContainer(IMAGE)
      .withUsername("customUsername")
      .withPassword("customPassword")
      .start();
    // }

    const db = mongoose.createConnection(container.getConnectionString(), { directConnection: true });

    const result = await db.collection("test").insertOne({ title: "test" });
    const resultId = result.insertedId.toString();
    expect(resultId).toBeTruthy();

    const rsStatus = await db.db?.admin().replSetGetStatus();
    expect(rsStatus?.set).toBe("rs0");

    await db.close();
  });
});
