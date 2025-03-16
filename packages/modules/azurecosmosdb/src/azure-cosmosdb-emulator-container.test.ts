import { CosmosClient, PartitionKeyKind } from "@azure/cosmos";
import * as https from "node:https";
import { expect } from "vitest";
import { AzureCosmosDbEmulatorContainer } from "./azure-cosmosdb-emulator-container";

describe("AzureCosmosDbEmulatorContainer", { timeout: 180_000 }, async () => {
  it("should set https protocol", async () => {
    const container = await new AzureCosmosDbEmulatorContainer().withProtocol("https").start();
    const connectionUri = container.getConnectionUri();
    expect(connectionUri).toContain("AccountEndpoint=https://");
    await container.stop();
  });
  it("should set http protocol if no protocol is specified", async () => {
    const container = await new AzureCosmosDbEmulatorContainer().start();
    const connectionUri = container.getConnectionUri();
    expect(connectionUri).toContain("AccountEndpoint=http://");
    await container.stop();
  });

  // httpCreateDB {
  it("should be able to create a database using http", async () => {
    const container = await new AzureCosmosDbEmulatorContainer().withProtocol("http").start();
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

    await container.stop();
  });
  // }

  // httpsCreateDB {
  it("should be able to create a database using https", async () => {
    const container = await new AzureCosmosDbEmulatorContainer().withProtocol("https").start();
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

    await container.stop();
  });
  // }

  // createAndRead {
  it("should be able to create a container and store and retrieve items", async () => {
    const container = await new AzureCosmosDbEmulatorContainer().withProtocol("http").start();
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

    await container.stop();
  });
  // }
});
