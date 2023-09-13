import { LocalstackContainer } from "./localstack-container";
import { HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";
import { CreateBucketCommand } from "@aws-sdk/client-s3";

describe("LocalStackContainer", () => {
  jest.setTimeout(180_000);

  it("should create a S3 bucket", async () => {
    const container = await new LocalstackContainer().start();

    const client = new S3Client({
      endpoint: container.getConnectionUri(),
      region: "us-east-1",
      credentials: {
        secretAccessKey: "test",
        accessKeyId: "test",
      },
    });
    const input = {
      Bucket: "testcontainers",
    };
    const command = new CreateBucketCommand(input);
    const createBucketResponse = await client.send(command);
    expect(createBucketResponse.$metadata.httpStatusCode).toEqual(200);

    const headBucketResponse = await client.send(new HeadBucketCommand(input));
    expect(headBucketResponse.$metadata.httpStatusCode).toEqual(200);

    await container.stop();
  });
});
