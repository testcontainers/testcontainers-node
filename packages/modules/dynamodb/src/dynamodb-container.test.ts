import {
  CreateTableCommand,
  DynamoDBClient,
  GetItemCommand,
  ListTablesCommand,
  PutItemCommand,
  waitUntilTableExists,
} from "@aws-sdk/client-dynamodb";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { DynamoDBContainer } from "./dynamodb-container";

const IMAGE = getImage(__dirname);

async function createTestTable(client: DynamoDBClient): Promise<{
  addUser: (userId: number, name: string) => Promise<void>;
  getUser: (userId: number) => Promise<string | null>;
}> {
  const command = new CreateTableCommand({
    TableName: "users",
    BillingMode: "PAY_PER_REQUEST",
    AttributeDefinitions: [
      {
        AttributeName: "userId",
        AttributeType: "N",
      },
    ],
    KeySchema: [
      {
        AttributeName: "userId",
        KeyType: "HASH",
      },
    ],
  });

  await client.send(command);
  await waitUntilTableExists({ client, maxWaitTime: 30 }, { TableName: "users" });

  return {
    addUser: async (userId, name) => {
      const putCommand = new PutItemCommand({
        TableName: "users",
        Item: {
          userId: { N: userId.toString() },
          name: { S: name },
        },
      });
      await client.send(putCommand);
    },
    getUser: async (userId) => {
      const getCommand = new GetItemCommand({
        TableName: "users",
        Key: {
          userId: { N: userId.toString() },
        },
        ConsistentRead: true,
      });
      const result = await client.send(getCommand);
      return result.Item?.name?.S ?? null;
    },
  };
}

describe("DynamoDBContainer", { timeout: 180_000 }, () => {
  it("connects with endpoint", async () => {
    // connectEndpoint {
    await using container = await new DynamoDBContainer(IMAGE).start();
    const client = new DynamoDBClient({
      region: "us-east-1",
      credentials: {
        // use any credentials
        accessKeyId: "AKIAIOSFODNN7EXAMPLE",
        secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
      },
      endpoint: container.getEndpoint(),
    });

    const command = new ListTablesCommand({});
    const result = await client.send(command);

    expect(result.TableNames).toStrictEqual([]);
    // }
  });

  it("stores data", async () => {
    await using container = await new DynamoDBContainer(IMAGE).start();
    const client = new DynamoDBClient({
      region: "us-east-1",
      credentials: {
        // use any credentials
        accessKeyId: "AKIAIOSFODNN7EXAMPLE",
        secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
      },
      endpoint: container.getEndpoint(),
    });

    const { addUser, getUser } = await createTestTable(client);
    await addUser(1, "Bob");
    await addUser(2, "Alice");

    const userA = await getUser(1);
    const userB = await getUser(2);
    expect(userA).toBe("Bob");
    expect(userB).toBe("Alice");
  });

  it("separates data by client by default", async () => {
    await using container = await new DynamoDBContainer(IMAGE).start();

    // Uses dummy credentials from the documentation
    const clientA = new DynamoDBClient({
      region: "eu-central-1",
      endpoint: container.getEndpoint(),
      credentials: {
        accessKeyId: "AKIAIOSFODNN7EXAMPLE",
        secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
      },
    });

    // Uses slightly different credentials to simulate another
    // AWS account
    const clientB = new DynamoDBClient({
      region: "eu-central-1",
      endpoint: container.getEndpoint(),
      credentials: {
        accessKeyId: "AKIAIOSFODNN7EXAMPL2",
        secretAccessKey: "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",
      },
    });

    await createTestTable(clientA);

    const resultA = await clientA.send(new ListTablesCommand());
    const resultB = await clientB.send(new ListTablesCommand());

    // Since clientA created the table, only clientA should see it
    expect(resultA.TableNames).toStrictEqual(["users"]);
    expect(resultB.TableNames).toStrictEqual([]);
  });

  it("uses a shared table when requested", async () => {
    // sharedDB {
    await using container = await new DynamoDBContainer(IMAGE).withSharedDB().start();

    // Both clients will see the same data eventhough the
    // ACCESS_KEY_ID differ
    const clientA = new DynamoDBClient({
      region: "us-east-1",
      endpoint: container.getEndpoint(),
      credentials: {
        accessKeyId: "AKIAIOSFODNN7EXAMPLE",
        secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
      },
    });

    const clientB = new DynamoDBClient({
      region: "us-east-1",
      endpoint: container.getEndpoint(),
      credentials: {
        accessKeyId: "AKIAIOSFODNN7EXAMPL2",
        secretAccessKey: "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",
      },
    });
    // }

    await createTestTable(clientA);

    const resultA = await clientA.send(new ListTablesCommand());
    const resultB = await clientB.send(new ListTablesCommand());

    // Eventhough clientA created the table, both should see it due to
    // the shared table design
    expect(resultA.TableNames).toStrictEqual(["users"]);
    expect(resultB.TableNames).toStrictEqual(["users"]);
  });

  it("persists data when dbPath is set", async () => {
    // persistWithDbPath {
    await using container = await new DynamoDBContainer(IMAGE).withDbPath(".").start();
    const client = new DynamoDBClient({
      region: "us-east-1",
      credentials: {
        // use any credentials
        accessKeyId: "AKIAIOSFODNN7EXAMPLE",
        secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
      },
      endpoint: container.getEndpoint(),
    });
    // }

    const { addUser } = await createTestTable(client);
    await addUser(1, "Bob");

    await container.restart();

    // restarting will change the mapped port so we need a new client
    const clientAfterRestart = new DynamoDBClient({
      region: "us-east-1",
      credentials: {
        // use any credentials
        accessKeyId: "AKIAIOSFODNN7EXAMPLE",
        secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
      },
      endpoint: container.getEndpoint(),
    });

    // The table should still be there including its content
    const command = new GetItemCommand({
      TableName: "users",
      Key: { userId: { N: "1" } },
      ConsistentRead: true,
    });
    const response = await clientAfterRestart.send(command);
    expect(response.Item).toStrictEqual({
      userId: { N: "1" },
      name: { S: "Bob" },
    });
  });

  it("stores data in memory when no dbPath set", async () => {
    await using container = await new DynamoDBContainer(IMAGE).start();
    const client = new DynamoDBClient({
      region: "us-east-1",
      credentials: {
        // use any credentials
        accessKeyId: "AKIAIOSFODNN7EXAMPLE",
        secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
      },
      endpoint: container.getEndpoint(),
    });

    const { addUser } = await createTestTable(client);
    await addUser(1, "Bob");

    await container.restart();

    // restarting will change the mapped port so we need a new client
    const clientAfterRestart = new DynamoDBClient({
      region: "us-east-1",
      credentials: {
        // use any credentials
        accessKeyId: "AKIAIOSFODNN7EXAMPLE",
        secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
      },
      endpoint: container.getEndpoint(),
    });

    // We should not be able to see the table anymore
    const result = await clientAfterRestart.send(new ListTablesCommand());
    expect(result.TableNames).toStrictEqual([]);
  });

  it("allows to disable telemetry", async () => {
    /* Unfortunately there is no way to validate this right now, but at
     * least we know it does not pass something invalid to the container
     */

    // disabledTelemetry {
    const container = new DynamoDBContainer(IMAGE).withDisableTelemetry();
    await using startedContainer = await container.start();
    // }

    // @ts-expect-error - accessing private property for testing
    expect(container.createOpts.Cmd).toEqual(["-jar", "DynamoDBLocal.jar", "-inMemory", "-disableTelemetry"]);

    const client = new DynamoDBClient({
      region: "us-east-1",
      credentials: {
        // use any credentials
        accessKeyId: "AKIAIOSFODNN7EXAMPLE",
        secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
      },
      endpoint: startedContainer.getEndpoint(),
    });

    const command = new ListTablesCommand({});
    const result = await client.send(command);

    expect(result.TableNames).toStrictEqual([]);
  });
});
