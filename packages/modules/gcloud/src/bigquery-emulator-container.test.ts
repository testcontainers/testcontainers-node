import { BigQuery, TableSchema } from "@google-cloud/bigquery";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { BigQueryEmulatorContainer } from "./bigquery-emulator-container";

const IMAGE = getImage(__dirname, 2);

describe("BigQueryEmulatorContainer", { timeout: 240_000 }, () => {
  it("should work using default version", async () => {
    // bigqueryExample {
    await using container = await new BigQueryEmulatorContainer(IMAGE).start();

    const bigQuery = new BigQuery({
      projectId: container.getProjectId(),
      apiEndpoint: container.getEmulatorEndpoint(),
    });

    const dataset = "test-dataset";
    const table = "test-table";
    const schema: TableSchema = { fields: [{ name: "message", type: "STRING" }] };

    await bigQuery.dataset(dataset).create();
    await bigQuery.dataset(dataset).table(table).create({ schema: schema });
    await bigQuery
      .dataset(dataset)
      .table(table)
      .insert([{ message: "Hello, BigQuery!" }]);

    const [rows] = await bigQuery.dataset(dataset).table(table).getRows();

    expect(rows).toEqual([{ message: "Hello, BigQuery!" }]);
    // }
  });
});
