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

function createClient(endpoint: string, accessKeyId: string = "AKIAIOSFODNN7EXAMPLE"): DynamoDBClient {
  const client = new DynamoDBClient({
    region: "us-east-1",
    credentials: {
      accessKeyId,
      secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    },
    endpoint,
  });
  return client;
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
    const client = createClient(container.getEndpoint());

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

    const clientA = createClient(container.getEndpoint(), "AKIAIOSFODNN7EXAMPL1");
    const clientB = createClient(container.getEndpoint(), "AKIAIOSFODNN7EXAMPL2");

    await createTestTable(clientA);

    const resultA = await clientA.send(new ListTablesCommand());
    const resultB = await clientB.send(new ListTablesCommand());

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

    expect(resultA.TableNames).toStrictEqual(["users"]);
    expect(resultB.TableNames).toStrictEqual(["users"]);
  });
});
