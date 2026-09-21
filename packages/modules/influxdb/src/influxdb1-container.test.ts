import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { InfluxDB1Container } from "./index";

const IMAGE = getImage(__dirname, 1);

describe("InfluxDB1Container", { timeout: 240_000 }, () => {
  it("should write and query with the default authenticated user", async () => {
    await using container = await new InfluxDB1Container(IMAGE).start();
    const authorization = `Basic ${Buffer.from(`${container.getUsername()}:${container.getPassword()}`).toString("base64")}`;
    const database = encodeURIComponent(container.getDatabase());

    const unauthenticated = await fetch(`${container.getUrl()}/query?q=SHOW%20DATABASES`);
    expect(unauthenticated.status).toBe(401);

    const writeResponse = await fetch(`${container.getUrl()}/write?db=${database}`, {
      method: "POST",
      headers: { Authorization: authorization },
      body: "cpu_load,host=server01 value=0.64",
    });
    expect(writeResponse.status).toBe(204);

    const query = encodeURIComponent("SELECT host, value FROM cpu_load");
    const queryResponse = await fetch(`${container.getUrl()}/query?db=${database}&q=${query}`, {
      headers: { Authorization: authorization },
    });
    expect(queryResponse.status).toBe(200);
    expect(await queryResponse.json()).toEqual({
      results: [
        {
          statement_id: 0,
          series: [
            { name: "cpu_load", columns: ["time", "host", "value"], values: [[expect.any(String), "server01", 0.64]] },
          ],
        },
      ],
    });
  });

  it("should write and query without authentication when disabled", async () => {
    await using container = await new InfluxDB1Container(IMAGE).withDatabase("testdb").withAuthEnabled(false).start();
    const writeResponse = await fetch(`${container.getUrl()}/write?db=testdb`, {
      method: "POST",
      body: "cpu_load,host=server01 value=0.64",
    });
    expect(writeResponse.status).toBe(204);

    const query = encodeURIComponent("SELECT host, value FROM cpu_load");
    const queryResponse = await fetch(`${container.getUrl()}/query?db=testdb&q=${query}`);
    expect(queryResponse.status).toBe(200);
    expect(await queryResponse.json()).toEqual({
      results: [
        {
          statement_id: 0,
          series: [
            { name: "cpu_load", columns: ["time", "host", "value"], values: [[expect.any(String), "server01", 0.64]] },
          ],
        },
      ],
    });
  });

  it.each([false, true])("should expose usable administrator credentials (custom: %s)", async (custom) => {
    const configuration = new InfluxDB1Container(IMAGE);
    if (custom) {
      configuration.withAdminUsername("custom-admin").withAdminPassword("custom-admin-password");
    }
    await using container = await configuration.start();
    expect(container.getAdminUsername()).toBe(custom ? "custom-admin" : "admin");
    expect(container.getAdminPassword()).toBe(custom ? "custom-admin-password" : "admin-password");
    const authorization = `Basic ${Buffer.from(`${container.getAdminUsername()}:${container.getAdminPassword()}`).toString("base64")}`;
    const createResponse = await fetch(`${container.getUrl()}/query`, {
      method: "POST",
      headers: { Authorization: authorization },
      body: new URLSearchParams({ q: "CREATE DATABASE administrative_test" }),
    });
    expect(createResponse.status).toBe(200);
    expect(await createResponse.json()).toEqual({ results: [{ statement_id: 0 }] });

    const databasesResponse = await fetch(`${container.getUrl()}/query?q=SHOW%20DATABASES`, {
      headers: { Authorization: authorization },
    });
    expect(databasesResponse.status).toBe(200);
    expect(await databasesResponse.json()).toEqual({
      results: [
        {
          statement_id: 0,
          series: [
            {
              name: "databases",
              columns: ["name"],
              values: expect.arrayContaining([["administrative_test"]]),
            },
          ],
        },
      ],
    });
  });

  it("should write and query with a custom database and user", async () => {
    await using container = await new InfluxDB1Container(IMAGE)
      .withDatabase("customdb")
      .withUsername("custom-user")
      .withPassword("custom-password")
      .start();

    const authorization = `Basic ${Buffer.from(`${container.getUsername()}:${container.getPassword()}`).toString("base64")}`;
    const writeResponse = await fetch(`${container.getUrl()}/write?db=${encodeURIComponent(container.getDatabase())}`, {
      method: "POST",
      headers: { Authorization: authorization },
      body: "cpu_load,host=server01 value=0.64",
    });
    expect(writeResponse.status).toBe(204);

    const query = encodeURIComponent("SELECT host, value FROM cpu_load");
    const queryResponse = await fetch(`${container.getUrl()}/query?db=customdb&q=${query}`, {
      headers: { Authorization: `Basic ${Buffer.from("custom-user:custom-password").toString("base64")}` },
    });
    expect(queryResponse.status).toBe(200);
    expect(await queryResponse.json()).toEqual({
      results: [
        {
          statement_id: 0,
          series: [
            {
              name: "cpu_load",
              columns: ["time", "host", "value"],
              values: [[expect.any(String), "server01", 0.64]],
            },
          ],
        },
      ],
    });
  });
});
