import { BigQuery, TableSchema } from "@google-cloud/bigquery";
import { getImage } from "../../testcontainers/src/utils/test-helper";
import { BigQueryEmulatorContainer, StartedBigQueryEmulatorContainer } from "./bigquery-emulator-container";

const IMAGE = getImage(__dirname, 2);

describe("BigQueryEmulatorContainer", { timeout: 240_000 }, () => {
  it("should work using default version", async () => {
    await using bigQueryEmulatorContainer = await new BigQueryEmulatorContainer(IMAGE).start();

    await checkBigQuery(bigQueryEmulatorContainer);
  });

  async function checkBigQuery(bigQueryEmulatorContainer: StartedBigQueryEmulatorContainer) {
    expect(bigQueryEmulatorContainer).toBeDefined();
    const testDataset = "test-dataset";
    const testTable = "test-table";
    const testSchema: TableSchema = { fields: [{ name: "message", type: "STRING" }] };
    const config = {
      projectId: bigQueryEmulatorContainer.getProjectId(),
      apiEndpoint: bigQueryEmulatorContainer.getEmulatorEndpoint(),
    };
    const bigQuery = new BigQuery(config);

    await bigQuery.dataset(testDataset).create();
    await bigQuery.dataset(testDataset).table(testTable).create({ schema: testSchema });
    await bigQuery
      .dataset(testDataset)
      .table(testTable)
      .insert([{ message: "Hello, BigQuery!" }]);

    const [rows] = await bigQuery.dataset(testDataset).table(testTable).getRows();

    expect(rows).toEqual([{ message: "Hello, BigQuery!" }]);
  }
});
