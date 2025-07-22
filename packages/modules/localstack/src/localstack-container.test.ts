import { CreateBucketCommand, HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";
import { GenericContainer, LABEL_TESTCONTAINERS_SESSION_ID, log, Network, StartedTestContainer } from "testcontainers";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { LOCALSTACK_PORT, LocalstackContainer } from "./localstack-container";

const IMAGE = getImage(__dirname);

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

describe("LocalStackContainer", { timeout: 180_000 }, () => {
  // createS3Bucket {
  it("should create a S3 bucket", async () => {
    await using container = await new LocalstackContainer(IMAGE).start();

    const client = new S3Client({
      endpoint: container.getConnectionUri(),
      forcePathStyle: true,
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
  });
  // }

  it("should use custom network", async () => {
    await using network = await new Network().start();
    await using _ = await new LocalstackContainer(IMAGE)
      .withNetwork(network)
      .withNetworkAliases("notthis", "localstack") // the last alias is used for HOSTNAME_EXTERNAL
      .withEnvironment({ SQS_ENDPOINT_STRATEGY: "path" })
      .start();

    await using awsCliInDockerNetwork = await new GenericContainer("amazon/aws-cli:2.7.27")
      .withNetwork(network)
      .withEntrypoint(["bash"])
      .withCommand(["-c", "sleep infinity"])
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
  });

  it("should not override LOCALSTACK_HOST assignment", async () => {
    await using container = await new LocalstackContainer(IMAGE)
      .withEnvironment({ LOCALSTACK_HOST: "myhost" })
      .withNetworkAliases("myalias")
      .start();

    const { output, exitCode } = await container.exec(["printenv", "LOCALSTACK_HOST"]);
    expect(exitCode).toBe(0);
    expect(output).toContain("myhost");
  });

  it("should override LOCALSTACK_HOST with last network alias", async () => {
    await using container = await new LocalstackContainer(IMAGE).withNetworkAliases("other", "myalias").start();

    const { output, exitCode } = await container.exec(["printenv", "LOCALSTACK_HOST"]);
    expect(exitCode).toBe(0);
    expect(output).toContain("myalias");
  });

  it("should assign LOCALSTACK_HOST to localhost", async () => {
    await using container = await new LocalstackContainer(IMAGE).start();

    const { output, exitCode } = await container.exec(["printenv", "LOCALSTACK_HOST"]);
    expect(exitCode).toBe(0);
    expect(output).toContain("localhost");
  });

  it("should add LAMBDA_DOCKER_FLAGS with sessionId label", async () => {
    await using container = await new LocalstackContainer(IMAGE).start();
    const sessionId = container.getLabels()[LABEL_TESTCONTAINERS_SESSION_ID];

    const { output, exitCode } = await container.exec(["printenv", "LAMBDA_DOCKER_FLAGS"]);
    expect(exitCode).toBe(0);
    expect(output).toContain(`${LABEL_TESTCONTAINERS_SESSION_ID}=${sessionId}`);
  });

  it("should concatenate sessionId label to LAMBDA_DOCKER_FLAGS", async () => {
    await using container = await new LocalstackContainer(IMAGE)
      .withEnvironment({
        LAMBDA_DOCKER_FLAGS: `-l mylabel=myvalue`,
      })
      .start();
    const sessionId = container.getLabels()[LABEL_TESTCONTAINERS_SESSION_ID];

    const { output, exitCode } = await container.exec(["printenv", "LAMBDA_DOCKER_FLAGS"]);

    expect(exitCode).toBe(0);
    expect(output).toContain(`${LABEL_TESTCONTAINERS_SESSION_ID}=${sessionId}`);
    expect(output).toContain(`mylabel=myvalue`);
  });
});
