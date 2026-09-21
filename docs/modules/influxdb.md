# InfluxDB

## Install

```bash
npm install @testcontainers/influxdb --save-dev
```

## Examples

Use `InfluxDB1Container` with an InfluxDB OSS 1.x image and `InfluxDB2Container` with an InfluxDB OSS 2.x image from the [container registry](https://hub.docker.com/_/influxdb). The class selects the configuration; image tags are not parsed. Specify a matching version explicitly, such as `influxdb:1.13` or `influxdb:2.9`. InfluxDB 3 is not supported by these classes.

The InfluxDB 2.x example uses the official [@influxdata/influxdb-client](https://www.npmjs.com/package/@influxdata/influxdb-client):

```bash
npm install @influxdata/influxdb-client
```

### Write and query points (InfluxDB 2.x)

```ts
import { InfluxDB, Point } from "@influxdata/influxdb-client";
import { InfluxDB2Container } from "@testcontainers/influxdb";
import { expect } from "vitest";

await using container = await new InfluxDB2Container("influxdb:2.9").start();
const client = new InfluxDB({ url: container.getUrl(), token: container.getAdminToken() });
const writeApi = client.getWriteApi(container.getOrganization(), container.getBucket());
writeApi.writePoint(new Point("temperature").tag("location", "room1").floatField("value", 23.5));
await writeApi.close();

const rows = await client
  .getQueryApi(container.getOrganization())
  .collectRows<{ _value: number; location: string }>(
    `from(bucket: "${container.getBucket()}") |> range(start: -1h) |> filter(fn: (r) => r._measurement == "temperature")`
  );
expect(rows).toEqual([expect.objectContaining({ _value: 23.5, location: "room1" })]);
```

By default, the container creates the user `test-user` with password `test-password`, organization `test-org`, bucket `test-bucket`, and admin token `test-token`. `getAdminToken()` always returns a string.

Customize these values with `withUsername()`, `withPassword()`, `withOrganization()`, `withBucket()`, and `withAdminToken()`. Use `withRetention("24h")` to configure bucket retention. Passwords shorter than eight characters are rejected by `start()` before a container is created.

### Write and query points (InfluxDB 1.x)

```ts
import { InfluxDB1Container } from "@testcontainers/influxdb";
import { Buffer } from "node:buffer";
import { expect } from "vitest";

await using container = await new InfluxDB1Container("influxdb:1.13").start();
const authorization = `Basic ${Buffer.from(`${container.getUsername()}:${container.getPassword()}`).toString("base64")}`;
const database = encodeURIComponent(container.getDatabase());

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
```

By default, authentication is enabled. The container creates the database `test`, grants the user `test-user` (password `test-password`) access to it, and creates the administrator `admin` (password `admin-password`).

Use `withDatabase()`, `withUsername()`, and `withPassword()` to customize the application connection. Use `withAdminUsername()` and `withAdminPassword()` to customize the administrator; `getAdminUsername()` and `getAdminPassword()` expose those credentials for administrative queries. `withAuthEnabled(false)` disables authentication.
