import * as minio from "minio";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { MinioContainer } from "./minio-container";

const IMAGE = getImage(__dirname);

describe("MinioContainer", { timeout: 240_000 }, () => {
  it("should connect and upload a file", async () => {
    // connectWithDefaultCredentials {
    await using container = await new MinioContainer(IMAGE).start();

    const client = new minio.Client({
      endPoint: container.getHost(),
      port: container.getPort(),
      useSSL: false,
      accessKey: "minioadmin",
      secretKey: "minioadmin",
    });

    const testFile = `${__dirname}/dummy-file.txt`;
    await client.makeBucket("test-bucket");
    await client.fPutObject("test-bucket", "minio-test-file.txt", testFile);

    const objectExists = await client
      .statObject("test-bucket", "minio-test-file.txt")
      .then(() => true)
      .catch(() => false);

    expect(objectExists).toBeTruthy();
    // }
  });

  it("should work with custom credentials", async () => {
    // connectWithCustomCredentials {
    await using container = await new MinioContainer(IMAGE)
      .withUsername("AzureDiamond")
      .withPassword("hunter2!")
      .start();

    const client = new minio.Client({
      endPoint: container.getHost(),
      port: container.getPort(),
      useSSL: false,
      accessKey: "AzureDiamond",
      secretKey: "hunter2!",
    });

    await client.makeBucket("test-bucket");

    const bucketExits = await client.bucketExists("test-bucket");
    expect(bucketExits).toBeTruthy();
    // }
  });
});
