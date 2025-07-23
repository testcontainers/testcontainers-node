import mongoose from "mongoose";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { MongoDBContainer } from "./mongodb-container";

const IMAGE = getImage(__dirname);

describe("MongoDBContainer", { timeout: 240_000 }, () => {
  it.each([IMAGE, "mongo:6.0.25", "mongo:4.4.29"])("should work with %s", async (image) => {
    // connect {
    await using mongodbContainer = await new MongoDBContainer(image).start();

    // directConnection: true is required as the testcontainer is created as a MongoDB Replica Set.
    const db = mongoose.createConnection(mongodbContainer.getConnectionString(), { directConnection: true });
    const fooCollection = db.collection("foo");
    const obj = { value: 1 };

    const session = await db.startSession();
    await session.withTransaction(async () => {
      await fooCollection.insertOne(obj);
    });

    const result = await fooCollection.findOne({ value: 1 });
    expect(result).toEqual(obj);

    await db.close();
    // }
  });

  it("should connect with credentials", async () => {
    await using mongodbContainer = await new MongoDBContainer(IMAGE)
      .withUsername("mongo_user")
      .withPassword("mongo_password")
      .start();

    const db = mongoose.createConnection(mongodbContainer.getConnectionString(), { directConnection: true });

    const result = await db.collection("testcontainers").insertOne({ title: "testcontainers" });
    const id = result.insertedId.toString();
    expect(id).not.toBeNull();
    expect(id).not.toBe("");
    const rsStatus = await db.db?.admin().replSetGetStatus();
    expect(rsStatus).toBeDefined();
    expect(rsStatus?.set).toBe("rs0");

    await db.close();
  });
});
