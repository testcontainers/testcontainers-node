import { Storage } from "@google-cloud/storage";
import { setupServer } from "msw/node";
import { ReadableStream } from "node:stream/web";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { CloudStorageEmulatorContainer } from "./cloudstorage-emulator-container";

const IMAGE = getImage(__dirname, 1);

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

describe.sequential("CloudStorageEmulatorContainer", { timeout: 240_000 }, () => {
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

  it("should work using default version", async () => {
    // cloudstorageExample {
    await using container = await new CloudStorageEmulatorContainer(IMAGE).start();

    const storage = new Storage({
      projectId: "test-project",
      apiEndpoint: container.getExternalUrl(),
    });

    await storage.createBucket("test-bucket");
    const [buckets] = await storage.getBuckets();

    expect(buckets[0].name).toBe("test-bucket");
    // }
  });

  it("should use the provided external URL", async () => {
    await using container = await new CloudStorageEmulatorContainer(IMAGE)
      .withExternalURL("http://cdn.company.local")
      .start();

    expect(container).toBeDefined();
    expect(container.getExternalUrl()).toBe("http://cdn.company.local");
  });

  it("should be able update the external URL of running instance", async () => {
    await using container = await new CloudStorageEmulatorContainer(IMAGE)
      .withExternalURL("http://cdn.company.local")
      .start();

    expect(container).toBeDefined();
    expect(container.getExternalUrl()).toBe("http://cdn.company.local");

    const executedRequests: Request[] = [];

    // Observe the outgoing request to change the configuration
    server.events.on("request:start", ({ request }) => {
      if (request.url.includes("/_internal/config")) {
        const clonedRequest = request.clone();
        executedRequests.push(clonedRequest);
      }
    });

    await container.updateExternalUrl("http://files.company.local");

    expect(executedRequests).toHaveLength(1);

    const [requestInfo] = executedRequests;

    const expectedRequestUrl = container.getEmulatorEndpoint() + "/_internal/config";
    expect(requestInfo.url).toContain(expectedRequestUrl);
    expect(requestInfo.method).toBe("PUT");

    const requestBody = await getRequestBodyFromReadableStream(requestInfo.body as ReadableStream<Uint8Array>);
    expect(requestBody).toBeDefined();
    const requestBodyAsJson = JSON.parse(requestBody);
    expect(requestBodyAsJson).toEqual(expect.objectContaining({ externalUrl: "http://files.company.local" }));

    expect(container.getExternalUrl()).toBe("http://files.company.local");
  });

  it("should use emulator endpoint as default external URL", async () => {
    let configUpdated = false;

    server.events.on("request:start", ({ request }) => {
      if (request.url.includes("/_internal/config")) configUpdated = true;
    });

    await using container = await new CloudStorageEmulatorContainer(IMAGE).start();

    expect(configUpdated).toBe(true);
    expect(container.getExternalUrl()).toBe(container.getEmulatorEndpoint());
    expect((await fetch(`${container.getExternalUrl()}/_internal/healthcheck`)).status).toBe(200);
  });

  it("should allow skipping updating the external URL automatically", async () => {
    let configUpdated = false;

    server.events.on("request:start", ({ request }) => {
      if (request.url.includes("/_internal/config")) configUpdated = true;
    });

    await using container = await new CloudStorageEmulatorContainer(IMAGE).withAutoUpdateExternalUrl(false).start();

    expect(configUpdated).toBe(false);
    expect(container.getExternalUrl()).toBe(undefined);
    expect((await fetch(`${container.getEmulatorEndpoint()}/_internal/healthcheck`)).status).toBe(200);
  });
});
