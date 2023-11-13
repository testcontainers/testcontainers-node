import { DynamoDBContainer, StartedDynamoDBContainer } from "./dynamodb-container";
import {
  CreateTableCommand,
  CreateTableInput,
  DynamoDBClient,
  GetItemCommand,
  ListTablesCommand,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";

import { testTable } from "./tables";

describe("DynamoDBContainer", () => {
  jest.setTimeout(120000);

  let container: StartedDynamoDBContainer;
  let dynamoClient: DynamoDBClient;

  beforeAll(async () => {
    container = await new DynamoDBContainer().start();
    dynamoClient = new DynamoDBClient(container.getConfig());
  });

  afterAll(async () => {
    container.stop();
  });

  it("should return the local config successfully", () => {
    expect(container.getConfig()).toStrictEqual({
      region: "us-east-1",
      endpoint: container.getConnectionString(),
    });
  });

  it("should create the container successfully", async () => {
    expect(container).toBeInstanceOf(StartedDynamoDBContainer);

    const logs = await container.logs();

    await new Promise((res) => {
      logs.once("data", (chunk) => {
        expect(chunk).toMatch(/.*?Initializing DynamoDB/i);
        res(null);
      });
    });

    expect.assertions(2);
  });

  it("should be able to connect and interact with dynamo successfully", async () => {
    await dynamoClient.send(new CreateTableCommand(testTable as CreateTableInput));

    const tables = await dynamoClient.send(new ListTablesCommand({}));

    expect(tables.TableNames).toStrictEqual(["TestTable"]);

    function commandScaffold<T>(keyName: string): T {
      return {
        TableName: testTable.TableName,
        [keyName]: {
          pk: { S: "PartitionKey" },
          sk: { S: "SortKey" },
        },
      } as T;
    }
    await dynamoClient.send(new PutItemCommand(commandScaffold("Item")));

    const items = await dynamoClient.send(
      new GetItemCommand({
        TableName: testTable.TableName,
        Key: {
          pk: { S: "PartitionKey" },
          sk: { S: "SortKey" },
        },
      })
    );

    expect(items.Item).toStrictEqual({
      pk: { S: "PartitionKey" },
      sk: { S: "SortKey" },
    });
  });
});
