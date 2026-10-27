import mongoose from "mongoose";
import { poll } from "testcontainers";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { MongoDBAtlasLocalContainer } from "./mongodb-atlas-local-container";

const IMAGES = ["mongodb/mongodb-atlas-local:7.0.43", getImage(__dirname, 1)];
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

describe.each(IMAGES)("MongoDBAtlasLocalContainer (%s)", { concurrent: false, timeout: 240_000 }, (image) => {
  it.concurrent("should provide a connection string", async () => {
    // connectAtlasLocal {
    await using container = await new MongoDBAtlasLocalContainer(image).start();
    // }

    expect(container.getConnectionString()).toBe(`mongodb://${container.getHost()}:${container.getMappedPort(27017)}/`);
  });

  it.concurrent("should provide a database connection string", async () => {
    // connectAtlasLocalDatabase {
    await using container = await new MongoDBAtlasLocalContainer(image).start();
    // }

    expect(container.getDatabaseConnectionString()).toBe(
      `mongodb://${container.getHost()}:${container.getMappedPort(27017)}/test`
    );
  });

  it.concurrent("should provide connection strings with credentials", async () => {
    // connectAtlasLocalWithCredentials {
    await using container = await new MongoDBAtlasLocalContainer(image)
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

  it.concurrent("should connect to mongodb atlas local", async () => {
    await using container = await new MongoDBAtlasLocalContainer(image).start();

    const db = await mongoose.createConnection(container.getConnectionString(), { directConnection: true }).asPromise();

    const obj = { value: 1 };
    const collection = db.collection("test");
    await collection.insertOne(obj);

    const result = await collection.findOne({ value: 1 });
    expect(result).toEqual(obj);

    await db.close();
  });

  it.concurrent("should connect to mongodb atlas local with credentials", async () => {
    await using container = await new MongoDBAtlasLocalContainer(image)
      .withUsername("customUsername")
      .withPassword("customPassword")
      .start();

    const db = await mongoose
      .createConnection(container.getDatabaseConnectionString(), { directConnection: true })
      .asPromise();

    const obj = { value: 1 };
    const collection = db.collection("test");
    await collection.insertOne(obj);

    const result = await collection.findOne({ value: 1 });
    expect(result).toEqual(obj);

    await db.close();
  });

  it.concurrent("should create an atlas search index and search it", async () => {
    // createAtlasIndexAndSearchIt {
    await using atlasLocalContainer = await new MongoDBAtlasLocalContainer(image).start();

    const db = await mongoose
      .createConnection(atlasLocalContainer.getConnectionString(), {
        dbName: "test",
        directConnection: true,
      })
      .asPromise();

    try {
      const collection = db.collection("test");

      await db.createCollection("test");

      await collection.createSearchIndex({
        name: "AtlasSearchIndex",
        definition: ATLAS_SEARCH_INDEX,
      });

      await poll(
        async () => {
          const searchIndexes = await collection.listSearchIndexes("AtlasSearchIndex").toArray();
          return (searchIndexes[0] as { status?: string } | undefined)?.status;
        },
        {
          until: (status) => status?.toUpperCase() === "READY",
          intervalMs: 10,
          timeoutMs: 5_000,
          timeoutMessage: "Atlas Search index did not become ready in time",
        }
      );

      await collection.insertOne({ test: "tests", test2: 123, test3: true });

      const found = await poll(
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
        {
          until: (result) => result !== null,
          intervalMs: 10,
          timeoutMs: 5_000,
          timeoutMessage: "Atlas Search did not return a result in time",
        }
      );

      expect(found).toMatchObject({ test: "tests", test2: 123, test3: true });
    } finally {
      await db.close();
    }
    // }
  });
});
