import { LOCALSTACK_PORT, LocalstackContainer } from "./localstack-container";
import { HeadBucketCommand, S3Client, CreateBucketCommand } from "@aws-sdk/client-s3";
import { GenericContainer, log, Network, StartedTestContainer } from "testcontainers";

const runAwsCliAgainstDockerNetworkContainer = async (
  command: string,
  awsCliInDockerNetwork: StartedTestContainer
): Promise<string> => {
  const commandParts = `/usr/local/bin/aws --region eu-west-1 ${command} --endpoint-url http://localstack:${LOCALSTACK_PORT} --no-verify-ssl`;
  const execResult = await awsCliInDockerNetwork.exec(commandParts);
  expect(execResult.exitCode).toEqual(0);
  log.info(execResult.output);
  return execResult.output;
};

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

  it("should use custom network", async () => {
    const network = await new Network().start();
    const container = await new LocalstackContainer()
      .withNetwork(network)
      .withNetworkAliases("notthis", "localstack") // the last alias is used for HOSTNAME_EXTERNAL
      .start();

    const awsCliInDockerNetwork = await new GenericContainer("amazon/aws-cli:2.7.27")
      .withNetwork(network)
      .withEntrypoint(["tail"])
      .withCommand(["-f", "/dev/null"])
      .withEnvironment({
        AWS_ACCESS_KEY_ID: "test",
        AWS_SECRET_ACCESS_KEY: "test",
        AWS_REGION: "us-east-1",
      })
      .start();

    const response = await runAwsCliAgainstDockerNetworkContainer(
      "sqs create-queue --queue-name baz",
      awsCliInDockerNetwork
    );
    expect(response).toContain(`http://localstack:${LOCALSTACK_PORT}`);
    await container.stop();
    await awsCliInDockerNetwork.stop();
  });
});
