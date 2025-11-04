import { CreateBucketCommand, HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { S3MockContainer } from "./s3mock-container";

const IMAGE = getImage(__dirname);

describe("S3MockContainer", { timeout: 180_000 }, () => {
  it("should create a S3 bucket", async () => {
    // s3mockCreateS3Bucket {
    await using container = await new S3MockContainer(IMAGE).start();

    const client = new S3Client({
      endpoint: container.getHttpConnectionUrl(),
      forcePathStyle: true,
      region: "auto",
      credentials: {
        secretAccessKey: container.getSecretAccessKey(),
        accessKeyId: container.getAccessKeyId(),
      },
    });

    const input = { Bucket: "testcontainers" };
    const command = new CreateBucketCommand(input);

    expect((await client.send(command)).$metadata.httpStatusCode).toEqual(200);
    expect((await client.send(new HeadBucketCommand(input))).$metadata.httpStatusCode).toEqual(200);
    // }
  });
});
