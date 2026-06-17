import { TableClient, TableEntity } from "@azure/data-tables";
import { BlobServiceClient, StorageSharedKeyCredential } from "@azure/storage-blob";
import { QueueServiceClient } from "@azure/storage-queue";
import fs from "node:fs";
import path from "node:path";
import { getRandomPort } from "testcontainers";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { AzuriteContainer } from "./azurite-container";
import { createOAuthToken, createTokenCredential, getTlsPipelineOptions } from "./azurite-test-utils";

const IMAGE = getImage(__dirname);
const TEST_CERT = fs.readFileSync(path.resolve(__dirname, "..", "test-certs", "azurite-test-cert.pem"), "utf8");
const TEST_KEY = fs.readFileSync(path.resolve(__dirname, "..", "test-certs", "azurite-test-key.pem"), "utf8");

describe("AzuriteContainer", { timeout: 240_000 }, () => {
  it("should upload and download blob with default credentials", async () => {
    // uploadAndDownloadBlob {
    await using container = await new AzuriteContainer(IMAGE).withSkipApiVersionCheck().start();

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
    await using container = await new AzuriteContainer(IMAGE).withSkipApiVersionCheck().start();

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
    await using container = await new AzuriteContainer(IMAGE).withSkipApiVersionCheck().start();

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
      .withSkipApiVersionCheck()
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
    const blobPort = await getRandomPort();
    const queuePort = await getRandomPort();
    const tablePort = await getRandomPort();

    await using container = await new AzuriteContainer(IMAGE)
      .withSkipApiVersionCheck()
      .withBlobPort({ container: 11000, host: blobPort })
      .withQueuePort({ container: 11001, host: queuePort })
      .withTablePort({ container: 11002, host: tablePort })
      .start();

    expect(container.getBlobPort()).toBe(blobPort);
    expect(container.getQueuePort()).toBe(queuePort);
    expect(container.getTablePort()).toBe(tablePort);
    // }

    const connectionString = container.getConnectionString();
    expect(connectionString).toContain(`:${blobPort}/`);
    expect(connectionString).toContain(`:${queuePort}/`);
    expect(connectionString).toContain(`:${tablePort}/`);

    // Exercise each service because Azurite configures their listener ports independently.
    const serviceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = serviceClient.getContainerClient("test");
    await containerClient.createIfNotExists();

    const queueServiceClient = QueueServiceClient.fromConnectionString(connectionString);
    await queueServiceClient.createQueue("test-queue");

    const tableClient = TableClient.fromConnectionString(connectionString, "testTable", {
      allowInsecureConnection: true,
    });
    await tableClient.createTable();
  });

  it("should be able to enable HTTPS with PEM certificate and key", async () => {
    // httpsWithPem {
    await using container = await new AzuriteContainer(IMAGE)
      .withSkipApiVersionCheck()
      .withSsl(TEST_CERT, TEST_KEY)
      .start();

    const connectionString = container.getConnectionString();
    expect(connectionString).toContain("DefaultEndpointsProtocol=https");
    expect(connectionString).toContain("BlobEndpoint=https://");
    expect(connectionString).toContain("QueueEndpoint=https://");
    expect(connectionString).toContain("TableEndpoint=https://");

    const serviceClient = BlobServiceClient.fromConnectionString(connectionString, getTlsPipelineOptions(TEST_CERT));
    const containerClient = serviceClient.getContainerClient("test");
    await containerClient.createIfNotExists();

    const containerItem = await serviceClient.listContainers().next();
    expect(containerItem.value?.name).toBe("test");
    // }
  });

  it("should be able to enable OAuth basic authentication", async () => {
    // withOAuth {
    await using container = await new AzuriteContainer(IMAGE)
      .withSkipApiVersionCheck()
      .withSsl(TEST_CERT, TEST_KEY)
      .withOAuth()
      .start();

    const validServiceClient = new BlobServiceClient(
      container.getBlobEndpoint(),
      createTokenCredential(createOAuthToken("https://storage.azure.com")),
      getTlsPipelineOptions(TEST_CERT)
    );
    const validContainerClient = validServiceClient.getContainerClient(`oauth-valid-${Date.now()}`);
    await validContainerClient.create();
    await validContainerClient.delete();

    const invalidServiceClient = new BlobServiceClient(
      container.getBlobEndpoint(),
      createTokenCredential(createOAuthToken("https://invalidaccount.blob.core.windows.net")),
      getTlsPipelineOptions(TEST_CERT)
    );
    const invalidContainerClient = invalidServiceClient.getContainerClient(`oauth-invalid-${Date.now()}`);
    await expect(invalidContainerClient.create()).rejects.toThrow("Server failed to authenticate the request");
    // }
  });

  it("should require HTTPS when enabling OAuth", async () => {
    await expect(new AzuriteContainer(IMAGE).withOAuth().start()).rejects.toThrow(
      "OAuth requires HTTPS endpoint. Configure SSL first with withSsl() or withSslPfx()."
    );
  });

  it("should be able to use in-memory persistence", async () => {
    // inMemoryPersistence {
    await using container = await new AzuriteContainer(IMAGE)
      .withSkipApiVersionCheck()
      .withInMemoryPersistence()
      .start();

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
