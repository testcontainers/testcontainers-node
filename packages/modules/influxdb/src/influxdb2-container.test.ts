import { InfluxDB, Point } from "@influxdata/influxdb-client";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { InfluxDB2Container } from "./index";

const IMAGE = getImage(__dirname);

describe("InfluxDB2Container", { timeout: 240_000 }, () => {
  it.each(["", "1234567"])("should reject a password shorter than eight characters (%j)", async (password) => {
    await expect(new InfluxDB2Container(IMAGE).withPassword(password).start()).rejects.toThrow(
      "InfluxDB 2.x password must be at least 8 characters long"
    );
  });

  it("should write and query with the default admin token", async () => {
    await using container = await new InfluxDB2Container(IMAGE).start();
    const influxDB = new InfluxDB({ url: container.getUrl(), token: container.getAdminToken() });
    const writeApi = influxDB.getWriteApi(container.getOrganization(), container.getBucket());
    writeApi.writePoint(new Point("temperature").tag("location", "room1").floatField("value", 23.5));
    await writeApi.close();

    const rows = await influxDB
      .getQueryApi(container.getOrganization())
      .collectRows<{ _value: number; location: string }>(
        `from(bucket: "${container.getBucket()}") |> range(start: -1h) |> filter(fn: (r) => r._measurement == "temperature")`
      );
    expect(rows).toEqual([expect.objectContaining({ _value: 23.5, location: "room1" })]);
  });

  it("should apply custom credentials, organization, bucket, token, and retention", async () => {
    await using container = await new InfluxDB2Container(IMAGE)
      .withUsername("custom-user")
      .withPassword("12345678")
      .withOrganization("custom-org")
      .withBucket("custom-bucket")
      .withRetention("24h")
      .withAdminToken("custom-token")
      .start();

    expect(container.getUsername()).toBe("custom-user");
    expect(container.getPassword()).toBe("12345678");
    const signIn = await fetch(`${container.getUrl()}/api/v2/signin`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${container.getUsername()}:${container.getPassword()}`).toString("base64")}`,
      },
    });
    expect(signIn.status).toBe(204);

    const influxDB = new InfluxDB({ url: container.getUrl(), token: container.getAdminToken() });
    const writeApi = influxDB.getWriteApi(container.getOrganization(), container.getBucket());
    writeApi.writePoint(new Point("temperature").tag("location", "room1").floatField("value", 23.5));
    await writeApi.close();

    const rows = await influxDB
      .getQueryApi("custom-org")
      .collectRows<{ _value: number; location: string }>(
        'from(bucket: "custom-bucket") |> range(start: -1h) |> filter(fn: (r) => r._measurement == "temperature")'
      );
    expect(rows).toEqual([expect.objectContaining({ _value: 23.5, location: "room1" })]);

    const buckets = await fetch(`${container.getUrl()}/api/v2/buckets?name=custom-bucket`, {
      headers: { Authorization: "Token custom-token" },
    });
    expect(buckets.status).toBe(200);
    expect(await buckets.json()).toEqual(
      expect.objectContaining({
        buckets: [
          expect.objectContaining({
            name: "custom-bucket",
            retentionRules: [expect.objectContaining({ everySeconds: 86400 })],
          }),
        ],
      })
    );
  });
});
