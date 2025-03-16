import { CosmosClient } from "@azure/cosmos";
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
  it("should be able to create a database using https", async () => {
    const container = await new AzureCosmosDbEmulatorContainer().withProtocol("https").start();
    const cosmosClient = new CosmosClient({
      endpoint: container.getEndpoint(),
      key: container.getKey(),
      agent: new https.Agent({
        rejectUnauthorized: false,
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
});
