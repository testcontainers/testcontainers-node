import { InfluxDB, Point } from "@influxdata/influxdb-client";
import { expect } from "vitest";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { InfluxDBContainer } from "./influxdb-container";

const INFLUXDB2_IMAGE = getImage(__dirname, 0);
const INFLUXDB1_IMAGE = getImage(__dirname, 1);

describe("InfluxDBContainer", { timeout: 240_000 }, () => {
  describe("InfluxDB 2.x", () => {
    it("should start and expose the connection details", async () => {
      await using container = await new InfluxDBContainer(INFLUXDB2_IMAGE).start();

      expect(container.isInfluxDB2()).toBe(true);
      expect(container.getPort()).toBeGreaterThan(0);
      expect(container.getUrl()).toEqual(`http://${container.getHost()}:${container.getPort()}`);
      expect(container.getOrganization()).toBe("test-org");
      expect(container.getBucket()).toBe("test-bucket");

      const ping = await fetch(`${container.getUrl()}/ping`);
      expect(ping.status).toBe(204);
    });

    it("should write and query points with the official client", async () => {
      // influxdb2WriteAndQuery {
      await using container = await new InfluxDBContainer(INFLUXDB2_IMAGE).withAdminToken("my-secret-token").start();

      const influxDB = new InfluxDB({ url: container.getUrl(), token: container.getAdminToken() });

      const writeApi = influxDB.getWriteApi(container.getOrganization(), container.getBucket());
      writeApi.writePoint(new Point("temperature").tag("location", "room1").floatField("value", 23.5));
      await writeApi.close();

      const queryApi = influxDB.getQueryApi(container.getOrganization());
      const rows = await queryApi.collectRows<{ _value: number }>(
        `from(bucket: "${container.getBucket()}") |> range(start: -1h) |> filter(fn: (r) => r._measurement == "temperature")`
      );

      expect(rows.length).toBeGreaterThan(0);
      expect(rows[0]._value).toBe(23.5);
      // }
    });

    it("should apply custom configuration", async () => {
      await using container = await new InfluxDBContainer(INFLUXDB2_IMAGE)
        .withUsername("custom-user")
        .withPassword("custom-password")
        .withOrganization("custom-org")
        .withBucket("custom-bucket")
        .withRetention("24h")
        .withAdminToken("custom-token")
        .start();

      expect(container.getUsername()).toBe("custom-user");
      expect(container.getPassword()).toBe("custom-password");
      expect(container.getOrganization()).toBe("custom-org");
      expect(container.getBucket()).toBe("custom-bucket");
      expect(container.getAdminToken()).toBe("custom-token");
    });
  });

  describe("InfluxDB 1.x", () => {
    it("should start a 1.x database and write/query over HTTP", async () => {
      // influxdb1WriteAndQuery {
      await using container = await new InfluxDBContainer(INFLUXDB1_IMAGE)
        .withDatabase("testdb")
        .withAuthEnabled(false)
        .start();

      expect(container.isInfluxDB2()).toBe(false);
      expect(container.getDatabase()).toBe("testdb");

      const writeResponse = await fetch(`${container.getUrl()}/write?db=${container.getDatabase()}`, {
        method: "POST",
        body: "cpu_load,host=server01 value=0.64",
      });
      expect(writeResponse.status).toBe(204);

      const query = encodeURIComponent("SELECT * FROM cpu_load");
      const queryResponse = await fetch(`${container.getUrl()}/query?db=${container.getDatabase()}&q=${query}`);
      expect(queryResponse.status).toBe(200);

      const body = (await queryResponse.json()) as { results: unknown[] };
      expect(body.results).toBeDefined();
      // }
    });
  });
});
