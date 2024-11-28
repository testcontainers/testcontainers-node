import { BlobServiceClient, StorageSharedKeyCredential } from "@azure/storage-blob";
import { QueueServiceClient } from "@azure/storage-queue";
import { TableClient, TableEntity } from "@azure/data-tables";
import { AzuriteContainer } from "./azurite-container";

describe("Azurite", () => {
  jest.setTimeout(240_000);

  // uploadAndDownloadBlob {
  it("should upload and download blob with default credentials", async () => {
    const container = await new AzuriteContainer().start();

    const connectionString = container.getConnectionString();
    expect(connectionString).toBeTruthy();

    const serviceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = serviceClient.getContainerClient("test");
    await containerClient.createIfNotExists();
    const blobName = "hello.txt";
    const content = "Hello world!";
    await containerClient.uploadBlockBlob(blobName, content, Buffer.byteLength(content));

    const blobClient = containerClient.getBlockBlobClient(blobName);
    const downloadResponse = await blobClient.download(0, undefined);

    const readable = downloadResponse.readableStreamBody as NodeJS.ReadableStream;
    expect(readable).toBeTruthy();

    readable.setEncoding("utf8");
    let data = "";
    for await (const chunk of readable) {
      data += chunk;
    }

    expect(data).toBe(content);

    await container.stop();
  });
  // }

  // sendAndReceiveQueue {
  it("should add to queue with default credentials", async () => {
    const container = await new AzuriteContainer().start();

    const connectionString = container.getConnectionString();
    expect(connectionString).toBeTruthy();

    const serviceClient = QueueServiceClient.fromConnectionString(connectionString);
    const queueName = "test-queue";
    await serviceClient.createQueue(queueName);

    const queueClient = serviceClient.getQueueClient(queueName);

    const message = "Hello world!";
    await queueClient.sendMessage(message);

    const messages = await queueClient.receiveMessages();
    expect(messages.receivedMessageItems).toHaveLength(1);
    expect(messages.receivedMessageItems[0].messageText).toBe(message);

    await container.stop();
  });
  // }

  // createAndInsertOnTable {
  it("should add to table with default credentials", async () => {
    const container = await new AzuriteContainer().start();

    const connectionString = container.getConnectionString();
    expect(connectionString).toBeTruthy();

    const tableName = "person";
    const tableClient = TableClient.fromConnectionString(connectionString, tableName, {
      allowInsecureConnection: true,
    });
    await tableClient.createTable();

    const entity: TableEntity<{ name: string }> = {
      partitionKey: "p1",
      rowKey: "r1",
      name: "John Doe",
    };
    await tableClient.createEntity(entity);

    const e1 = await tableClient.listEntities().next();
    expect(e1.value).toBeTruthy();
    expect(e1.value.name).toBe(entity.name);

    await container.stop();
  });
  // }

  // customCredentials {
  it("should be able to specify accountName and accountKey", async () => {
    const accountName = "test-account";
    // Account key must be base64 encoded
    const accountKey = Buffer.from("test-key").toString("base64");

    const container = await new AzuriteContainer().withAccountName(accountName).withAccountKey(accountKey).start();

    const credentials = new StorageSharedKeyCredential(accountName, accountKey);
    const serviceClient = new BlobServiceClient(container.getBlobEndpoint(), credentials);

    const blobContainerName = "test";
    const containerClient = serviceClient.getContainerClient(blobContainerName);
    await containerClient.createIfNotExists();

    const blobContainer = await serviceClient.listContainers().next();
    expect(blobContainer.value).toBeTruthy();
    expect(blobContainer.value.name).toBe(blobContainerName);

    await container.stop();
  });
  // }

  // inMemoryPersistence {
  it("should be able to use in-memory persistence", async () => {
    const container = await new AzuriteContainer().withInMemoryPersistence().start();

    const connectionString = container.getConnectionString();
    expect(connectionString).toBeTruthy();

    const serviceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = serviceClient.getContainerClient("test");
    await containerClient.createIfNotExists();
    const blobName = "hello.txt";
    const content = "Hello world!";
    await containerClient.uploadBlockBlob(blobName, content, Buffer.byteLength(content));

    const blobClient = containerClient.getBlockBlobClient(blobName);
    const blobExists = await blobClient.exists();
    expect(blobExists).toBeTruthy();

    await container.restart();

    const blobExistsAfterRestart = await blobClient.exists();
    expect(blobExistsAfterRestart).toBeFalsy();
  });
  // }
});
