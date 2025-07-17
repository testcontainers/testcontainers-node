import { CosmosClient, PartitionKeyKind } from "@azure/cosmos";
import https from "node:https";
import { getImage } from "testcontainers/src/utils/test-helper";
import { AzureCosmosDbEmulatorContainer } from "./azure-cosmosdb-emulator-container";

const IMAGE = getImage(__dirname);

describe("AzureCosmosDbEmulatorContainer", { timeout: 180_000 }, async () => {
  it("should set https protocol", async () => {
    await using container = await new AzureCosmosDbEmulatorContainer(IMAGE).withProtocol("https").start();
    const connectionUri = container.getConnectionUri();
    expect(connectionUri).toContain("AccountEndpoint=https://");
  });

  it("should set http protocol if no protocol is specified", async () => {
    await using container = await new AzureCosmosDbEmulatorContainer(IMAGE).start();
    const connectionUri = container.getConnectionUri();
    expect(connectionUri).toContain("AccountEndpoint=http://");
  });

  // httpCreateDB {
  it("should be able to create a database using http", async () => {
    await using container = await new AzureCosmosDbEmulatorContainer(IMAGE).withProtocol("http").start();
    const cosmosClient = new CosmosClient({
      endpoint: container.getEndpoint(),
      key: container.getKey(),
    });

    const dbName = "testdb";
    const createResponse = await cosmosClient.databases.createIfNotExists({
      id: dbName,
    });
    expect(createResponse.statusCode).toBe(201);

    const db = await cosmosClient.database(dbName).read();
    expect(db.database.id).toBe(dbName);
  });
  // }

  // httpsCreateDB {
  it("should be able to create a database using https", async () => {
    await using container = await new AzureCosmosDbEmulatorContainer(IMAGE).withProtocol("https").start();
    const cosmosClient = new CosmosClient({
      endpoint: container.getEndpoint(),
      key: container.getKey(),
      agent: new https.Agent({
        rejectUnauthorized: false, //allows insecure TLS; import * as https from "node:https";
      }),
    });

    const dbName = "testdb";
    const createResponse = await cosmosClient.databases.createIfNotExists({
      id: dbName,
    });
    expect(createResponse.statusCode).toBe(201);

    const db = await cosmosClient.database(dbName).read();
    expect(db.database.id).toBe(dbName);
  });
  // }

  // createAndRead {
  it("should be able to create a container and store and retrieve items", async () => {
    await using container = await new AzureCosmosDbEmulatorContainer(IMAGE).withProtocol("http").start();
    const cosmosClient = new CosmosClient({
      endpoint: container.getEndpoint(),
      key: container.getKey(),
    });

    const dbName = "testdb";
    await cosmosClient.databases.createIfNotExists({
      id: dbName,
    });
    const dbClient = cosmosClient.database(dbName);

    const containerName = "testcontainer";
    await dbClient.containers.createIfNotExists({
      id: containerName,
      partitionKey: {
        kind: PartitionKeyKind.Hash,
        paths: ["/foo"],
      },
    });

    const containerClient = dbClient.container(containerName);
    const createResponse = await containerClient.items.create({
      foo: "bar",
    });

    const readItem = await containerClient.item(createResponse.item.id, "bar").read();
    expect(readItem.resource.foo).toEqual("bar");
  });
  // }
});
