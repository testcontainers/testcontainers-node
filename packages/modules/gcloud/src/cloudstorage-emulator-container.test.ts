import { Storage } from "@google-cloud/storage";
import { setupServer } from "msw/node";
import { ReadableStream } from "node:stream/web";
import { CloudStorageEmulatorContainer, StartedCloudStorageEmulatorContainer } from "./cloudstorage-emulator-container";

async function getRequestBodyFromReadableStream(stream: ReadableStream<Uint8Array>): Promise<string> {
  const decoder = new TextDecoder();
  const reader = stream.getReader();
  let fullString = "";

  try {
    while (true) {
      const { value, done } = await reader.read();

      if (done) break;

      if (value) {
        fullString += decoder.decode(value, { stream: true });
      }
    }

    fullString += decoder.decode();
  } finally {
    reader.releaseLock();
  }

  return fullString;
}

describe("CloudStorageEmulatorContainer", { timeout: 240_000 }, () => {
  const server = setupServer();

  beforeAll(() => {
    server.listen({
      onUnhandledRequest: "bypass",
    });
  });

  beforeEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  // cloud-storage {
  it("should work using default version", async () => {
    const cloudstorageEmulatorContainer = await new CloudStorageEmulatorContainer().start();

    await checkCloudStorage(cloudstorageEmulatorContainer);

    await cloudstorageEmulatorContainer.stop();
  });
  // }

  it("should use the provided external URL", async () => {
    const cloudstorageEmulatorContainer = await new CloudStorageEmulatorContainer()
      .withExternalURL("http://cdn.company.local")
      .start();

    expect(cloudstorageEmulatorContainer).toBeDefined();
    expect(cloudstorageEmulatorContainer.getExternalUrl()).toBe("http://cdn.company.local");

    await cloudstorageEmulatorContainer.stop();
  });

  it("should be able update the external URL of running instance", async () => {
    const cloudstorageEmulatorContainer = await new CloudStorageEmulatorContainer()
      .withExternalURL("http://cdn.company.local")
      .start();

    expect(cloudstorageEmulatorContainer).toBeDefined();
    expect(cloudstorageEmulatorContainer.getExternalUrl()).toBe("http://cdn.company.local");

    const executedRequests: Request[] = [];

    // Observe the outgoing request to change the configuration
    server.events.on("request:start", ({ request }) => {
      if (request.url.includes("/_internal/config")) {
        const clonedRequest = request.clone();
        executedRequests.push(clonedRequest);
      }
    });

    await cloudstorageEmulatorContainer.updateExternalUrl("http://files.company.local");

    expect(executedRequests).toHaveLength(1);

    const [requestInfo] = executedRequests;

    const expectedRequestUrl = cloudstorageEmulatorContainer.getEmulatorEndpoint() + "/_internal/config";
    expect(requestInfo.url).toContain(expectedRequestUrl);
    expect(requestInfo.method).toBe("PUT");

    const requestBody = await getRequestBodyFromReadableStream(requestInfo.body as ReadableStream<Uint8Array>);
    expect(requestBody).toBeDefined();
    const requestBodyAsJson = JSON.parse(requestBody);
    expect(requestBodyAsJson).toEqual(expect.objectContaining({ externalUrl: "http://files.company.local" }));

    expect(cloudstorageEmulatorContainer.getExternalUrl()).toBe("http://files.company.local");

    await cloudstorageEmulatorContainer.stop();
  });

  it("should use emulator endpoint as default external URL", async () => {
    let configUpdated = false;

    server.events.on("request:start", ({ request }) => {
      if (request.url.includes("/_internal/config")) configUpdated = true;
    });

    const container = await new CloudStorageEmulatorContainer().start();

    expect(configUpdated).toBe(true);
    expect(container.getExternalUrl()).toBe(container.getEmulatorEndpoint());
    expect((await fetch(`${container.getExternalUrl()}/_internal/healthcheck`)).status).toBe(200);

    await container.stop();
  });

  it("should allow skipping updating the external URL automatically", async () => {
    let configUpdated = false;

    server.events.on("request:start", ({ request }) => {
      if (request.url.includes("/_internal/config")) configUpdated = true;
    });

    const container = await new CloudStorageEmulatorContainer().withAutoUpdateExternalUrl(false).start();

    expect(configUpdated).toBe(false);
    expect(container.getExternalUrl()).toBe(undefined);
    expect((await fetch(`${container.getEmulatorEndpoint()}/_internal/healthcheck`)).status).toBe(200);

    await container.stop();
  });

  async function checkCloudStorage(cloudstorageEmulatorContainer: StartedCloudStorageEmulatorContainer) {
    expect(cloudstorageEmulatorContainer).toBeDefined();

    const cloudStorageClient = new Storage({
      projectId: "test-project",
      apiEndpoint: cloudstorageEmulatorContainer.getExternalUrl(),
    });
    expect(cloudStorageClient).toBeDefined();

    const createdBucket = await cloudStorageClient.createBucket("test-bucket");
    expect(createdBucket).toBeDefined();

    const [buckets] = await cloudStorageClient.getBuckets();
    expect(buckets).toBeDefined();
    expect(buckets).toHaveLength(1);
    const [firstBucket] = buckets;
    expect(firstBucket.name).toBe("test-bucket");
  }
});
