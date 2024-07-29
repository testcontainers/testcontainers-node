import { CloudStorageEmulatorContainer, StartedCloudStorageEmulatorContainer } from "./cloudstorage-emulator-container";
import { Storage } from "@google-cloud/storage";

describe("CloudStorageEmulatorContainer", () => {
  jest.setTimeout(240_000);

  it("should work using default version", async () => {
    const cloudstorageEmulatorContainer = await new CloudStorageEmulatorContainer().start();

    await checkCloudStorage(cloudstorageEmulatorContainer);

    await cloudstorageEmulatorContainer.stop();
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
