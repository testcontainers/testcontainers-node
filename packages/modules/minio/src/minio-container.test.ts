import * as minio from "minio";
import { MinioContainer } from "./minio-container";

const IMAGE = "minio/minio:RELEASE.2024-12-13T22-19-12Z";

describe("MinIO", { timeout: 240_000 }, () => {
  // connectWithDefaultCredentials {
  it("should connect and upload a file", async () => {
    const container = await new MinioContainer(IMAGE).start();

    const minioClient = new minio.Client({
      endPoint: container.getHost(),
      port: container.getPort(),
      useSSL: false,
      accessKey: "minioadmin",
      secretKey: "minioadmin",
    });

    // Upload dummy test file.
    const testFile = `${__dirname}/dummy-file.txt`;

    await minioClient.makeBucket("test-bucket");
    await minioClient.fPutObject("test-bucket", "minio-test-file.txt", testFile);

    // Verify upload
    const objectExists = await minioClient
      .statObject("test-bucket", "minio-test-file.txt")
      .then(() => true)
      .catch(() => false);

    expect(objectExists).toBeTruthy();

    await container.stop();
  });
  // }

  // connectWithCustomCredentials {
  it("should work with custom credentials", async () => {
    const container = await new MinioContainer(IMAGE).withUsername("AzureDiamond").withPassword("hunter2!").start();

    const minioClient = new minio.Client({
      endPoint: container.getHost(),
      port: container.getPort(),
      useSSL: false,
      accessKey: "AzureDiamond",
      secretKey: "hunter2!",
    });

    // Create a bucket.
    await minioClient.makeBucket("test-bucket");

    // Verify bucket.
    const bucketExits = await minioClient.bucketExists("test-bucket");

    expect(bucketExits).toBeTruthy();

    await container.stop();
  });
  // }
});
