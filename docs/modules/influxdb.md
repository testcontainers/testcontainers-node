# InfluxDB

## Install

```bash
npm install @testcontainers/influxdb --save-dev
```

## Examples

Use `InfluxDB1Container` with an InfluxDB OSS 1.x image and `InfluxDB2Container` with an InfluxDB OSS 2.x image. The class selects the configuration; image tags are not parsed. Specify a matching version explicitly, such as `influxdb:1.13` or `influxdb:2.9`. InfluxDB 3 is not supported by these classes.

Choose an image from the [container registry](https://hub.docker.com/_/influxdb) and substitute `IMAGE`.

### Write and query points (InfluxDB 1.x)

<!--codeinclude-->
[](../../packages/modules/influxdb/src/influxdb1-container.test.ts) inside_block:writeAndQueryInfluxDB1
<!--/codeinclude-->

By default, authentication is enabled. The container creates the database `test`, grants the user `test-user` (password `test-password`) access to it, and creates the administrator `admin` (password `admin-password`).

Use `withDatabase()`, `withUsername()`, and `withPassword()` to customize the application connection. Use `withAdminUsername()` and `withAdminPassword()` to customize the administrator; `getAdminUsername()` and `getAdminPassword()` expose those credentials for administrative queries. `withAuthEnabled(false)` disables authentication.

### Write and query points (InfluxDB 2.x)

This example uses the official [@influxdata/influxdb-client](https://www.npmjs.com/package/@influxdata/influxdb-client):

```bash
npm install @influxdata/influxdb-client
```

<!--codeinclude-->
[](../../packages/modules/influxdb/src/influxdb2-container.test.ts) inside_block:writeAndQueryInfluxDB2
<!--/codeinclude-->

By default, the container creates the user `test-user` with password `test-password`, organization `test-org`, bucket `test-bucket`, and admin token `test-token`. `getAdminToken()` always returns a string.

Customize these values with `withUsername()`, `withPassword()`, `withOrganization()`, `withBucket()`, and `withAdminToken()`. Use `withRetention("24h")` to configure bucket retention. Passwords shorter than eight characters are rejected by `start()` before a container is created.
