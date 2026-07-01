import mongoose from "mongoose";
import { IntervalRetry } from "../../../testcontainers/src/common";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { MongoDBAtlasLocalContainer } from "./mongodb-atlas-local-container";

const IMAGE = getImage(__dirname, 1);
const ATLAS_SEARCH_INDEX = {
  mappings: {
    dynamic: false,
    fields: {
      test: {
        type: "string",
      },
      test2: {
        type: "number",
        representation: "int64",
        indexDoubles: false,
      },
      test3: {
        type: "boolean",
      },
    },
  },
};

describe("MongoDBAtlasLocalContainer", { timeout: 240_000 }, () => {
  it("should provide a connection string", async () => {
    // connectAtlasLocal {
    await using container = await new MongoDBAtlasLocalContainer(IMAGE).start();
    // }

    expect(container.getConnectionString()).toBe(`mongodb://${container.getHost()}:${container.getMappedPort(27017)}/`);
  });

  it("should provide a database connection string", async () => {
    // connectAtlasLocalDatabase {
    await using container = await new MongoDBAtlasLocalContainer(IMAGE).start();
    // }

    expect(container.getDatabaseConnectionString()).toBe(
      `mongodb://${container.getHost()}:${container.getMappedPort(27017)}/test`
    );
  });

  it("should provide connection strings with credentials", async () => {
    // connectAtlasLocalWithCredentials {
    await using container = await new MongoDBAtlasLocalContainer(IMAGE)
      .withUsername("customUsername")
      .withPassword("customPassword")
      .start();
    // }

    expect(container.getConnectionString()).toBe(
      `mongodb://customUsername:customPassword@${container.getHost()}:${container.getMappedPort(27017)}/?authSource=admin`
    );
    expect(container.getDatabaseConnectionString()).toBe(
      `mongodb://customUsername:customPassword@${container.getHost()}:${container.getMappedPort(27017)}/test?authSource=admin`
    );
  });

  it("should connect to mongodb atlas local", async () => {
    await using container = await new MongoDBAtlasLocalContainer(IMAGE).start();

    const db = mongoose.createConnection(container.getConnectionString(), { directConnection: true });

    const obj = { value: 1 };
    const collection = db.collection("test");
    await collection.insertOne(obj);

    const result = await collection.findOne({ value: 1 });
    expect(result).toEqual(obj);

    await db.close();
  });

  it("should connect to mongodb atlas local with credentials", async () => {
    await using container = await new MongoDBAtlasLocalContainer(IMAGE)
      .withUsername("customUsername")
      .withPassword("customPassword")
      .start();

    const db = mongoose.createConnection(container.getDatabaseConnectionString(), { directConnection: true });

    const obj = { value: 1 };
    const collection = db.collection("test");
    await collection.insertOne(obj);

    const result = await collection.findOne({ value: 1 });
    expect(result).toEqual(obj);

    await db.close();
  });

  it("should create an atlas search index and search it", async () => {
    // createAtlasIndexAndSearchIt {
    await using atlasLocalContainer = await new MongoDBAtlasLocalContainer(IMAGE).start();

    const db = mongoose.createConnection(atlasLocalContainer.getConnectionString(), {
      dbName: "test",
      directConnection: true,
    });

    try {
      const collection = db.collection("test");

      await db.createCollection("test");

      await collection.createSearchIndex({
        name: "AtlasSearchIndex",
        definition: ATLAS_SEARCH_INDEX,
      });

      await new IntervalRetry<string | undefined, Error>(10).retryUntil(
        async () => {
          const searchIndexes = await collection.listSearchIndexes("AtlasSearchIndex").toArray();
          return (searchIndexes[0] as { status?: string } | undefined)?.status;
        },
        (status) => status?.toUpperCase() === "READY",
        () => new Error("Atlas Search index did not become ready in time"),
        5_000
      );

      await collection.insertOne({ test: "tests", test2: 123, test3: true });

      const found = await new IntervalRetry<Record<string, unknown> | null, Error>(10).retryUntil(
        async () =>
          collection
            .aggregate([
              {
                $search: {
                  index: "AtlasSearchIndex",
                  text: {
                    query: "test",
                    path: "test",
                    fuzzy: {},
                  },
                },
              },
            ])
            .next(),
        (result) => result !== null,
        () => new Error("Atlas Search did not return a result in time"),
        5_000
      );

      if (found instanceof Error) {
        throw found;
      }

      expect(found).toMatchObject({ test: "tests", test2: 123, test3: true });
    } finally {
      await db.close();
    }
    // }
  });
});
