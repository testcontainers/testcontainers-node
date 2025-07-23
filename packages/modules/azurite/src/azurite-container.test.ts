import { TableClient, TableEntity } from "@azure/data-tables";
import { BlobServiceClient, StorageSharedKeyCredential } from "@azure/storage-blob";
import { QueueServiceClient } from "@azure/storage-queue";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { AzuriteContainer } from "./azurite-container";

const IMAGE = getImage(__dirname);

describe("Azurite", { timeout: 240_000 }, () => {
  it("should upload and download blob with default credentials", async () => {
    // uploadAndDownloadBlob {
    await using container = await new AzuriteContainer(IMAGE).start();

    const connectionString = container.getConnectionString();
    const serviceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = serviceClient.getContainerClient("test");
    await containerClient.createIfNotExists();

    const blobName = "hello.txt";
    const content = "Hello world!";
    await containerClient.uploadBlockBlob(blobName, content, Buffer.byteLength(content));

    const blobClient = containerClient.getBlockBlobClient(blobName);
    const downloadBuffer = await blobClient.downloadToBuffer();
    expect(downloadBuffer.toString()).toBe(content);
    // }
  });

  it("should add to queue with default credentials", async () => {
    // sendAndReceiveQueue {
    await using container = await new AzuriteContainer(IMAGE).start();

    const connectionString = container.getConnectionString();
    const serviceClient = QueueServiceClient.fromConnectionString(connectionString);
    const queueName = "test-queue";
    await serviceClient.createQueue(queueName);

    const messageText = "Hello world!";
    const queueClient = serviceClient.getQueueClient(queueName);
    await queueClient.sendMessage(messageText);

    const messages = await queueClient.receiveMessages();
    expect(messages.receivedMessageItems).toMatchObject([{ messageText }]);
    // }
  });

  it("should add to table with default credentials", async () => {
    // createAndInsertOnTable {
    await using container = await new AzuriteContainer(IMAGE).start();

    const connectionString = container.getConnectionString();
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

    const nextEntity = await tableClient.listEntities().next();
    expect(nextEntity.value).toEqual(expect.objectContaining(entity));
    // }
  });

  it("should be able to specify accountName and accountKey", async () => {
    // customCredentials {
    const accountName = "test-account";
    const accountKey = Buffer.from("test-key").toString("base64");

    await using container = await new AzuriteContainer(IMAGE)
      .withAccountName(accountName)
      .withAccountKey(accountKey)
      .start();

    const credentials = new StorageSharedKeyCredential(accountName, accountKey);
    const serviceClient = new BlobServiceClient(container.getBlobEndpoint(), credentials);
    // }

    const blobContainerName = "test";
    const containerClient = serviceClient.getContainerClient(blobContainerName);
    await containerClient.createIfNotExists();

    const blobContainer = await serviceClient.listContainers().next();
    expect(blobContainer.value).toBeTruthy();
    expect(blobContainer.value.name).toBe(blobContainerName);
  });

  it("should be able to specify custom ports", async () => {
    // customPorts {
    const blobPort = 13000;
    const queuePort = 14000;
    const tablePort = 15000;

    await using container = await new AzuriteContainer(IMAGE)
      .withBlobPort({ container: 10001, host: blobPort })
      .withQueuePort({ container: 10002, host: queuePort })
      .withTablePort({ container: 10003, host: tablePort })
      .start();

    expect(container.getBlobPort()).toBe(blobPort);
    expect(container.getQueuePort()).toBe(queuePort);
    expect(container.getTablePort()).toBe(tablePort);
    // }

    const connectionString = container.getConnectionString();
    expect(connectionString).toContain("13000");
    expect(connectionString).toContain("14000");
    expect(connectionString).toContain("15000");

    const serviceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = serviceClient.getContainerClient("test");
    await containerClient.createIfNotExists();
  });

  it("should be able to use in-memory persistence", async () => {
    // inMemoryPersistence {
    await using container = await new AzuriteContainer(IMAGE).withInMemoryPersistence().start();

    const blobName = "hello.txt";

    {
      const connectionString = container.getConnectionString();
      const serviceClient = BlobServiceClient.fromConnectionString(connectionString);
      const containerClient = serviceClient.getContainerClient("test");
      await containerClient.createIfNotExists();
      const content = "Hello world!";
      await containerClient.uploadBlockBlob(blobName, content, Buffer.byteLength(content));
      const blobClient = containerClient.getBlockBlobClient(blobName);
      const blobExists = await blobClient.exists();
      expect(blobExists).toBeTruthy();
    }

    await container.restart();

    {
      const connectionString = container.getConnectionString();
      const serviceClient = BlobServiceClient.fromConnectionString(connectionString);
      const containerClient = serviceClient.getContainerClient("test");
      const blobClient = containerClient.getBlockBlobClient(blobName);
      const blobExistsAfterRestart = await blobClient.exists();
      expect(blobExistsAfterRestart).toBeFalsy();
    }
    // }
  });
});
