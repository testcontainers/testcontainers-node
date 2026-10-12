import mongoose from "mongoose";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { MongoDBContainer } from "./mongodb-container";

const IMAGE = getImage(__dirname);
const OLDEST_IMAGE = "mongo:7.0.43";

describe.each([IMAGE, OLDEST_IMAGE])("MongoDBContainer (%s)", { timeout: 240_000 }, (image) => {
  it("should connect", async () => {
    // connectMongo {
    await using container = await new MongoDBContainer(image).start();

    const db = await mongoose.createConnection(container.getConnectionString(), { directConnection: true }).asPromise();

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
    await using container = await new MongoDBContainer(image)
      .withUsername("customUsername")
      .withPassword("customPassword")
      .start();
    // }

    const db = await mongoose.createConnection(container.getConnectionString(), { directConnection: true }).asPromise();

    const result = await db.collection("test").insertOne({ title: "test" });
    const resultId = result.insertedId.toString();
    expect(resultId).toBeTruthy();

    const rsStatus = await db.db?.admin().replSetGetStatus();
    expect(rsStatus?.set).toBe("rs0");

    await db.close();
  });
});

describe("MongoDBContainer", { timeout: 240_000 }, () => {
  it.each(["mongo:8.0.32", "mongo:8.3.11"])("should connect with %s", async (image) => {
    await using container = await new MongoDBContainer(image).start();

    const db = await mongoose.createConnection(container.getConnectionString(), { directConnection: true }).asPromise();

    const obj = { value: 1 };
    const collection = db.collection("test");
    await collection.insertOne(obj);

    const result = await collection.findOne({ value: 1 });
    expect(result).toEqual(obj);

    await db.close();
  });
});
