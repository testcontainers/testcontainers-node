# InfluxDB

## Install

```bash
npm install @testcontainers/influxdb --save-dev
```

## Examples

The InfluxDB 2.x examples use the following libraries:

- [@influxdata/influxdb-client](https://www.npmjs.com/package/@influxdata/influxdb-client)

        npm install @influxdata/influxdb-client

`InfluxDBContainer` supports both InfluxDB 2.x and the legacy 1.x line. The major version is derived from the image tag, so substitute `IMAGE` with a `2.x` tag (the default flavour) or a `1.x` tag from the [container registry](https://hub.docker.com/_/influxdb).

### Write and query points (InfluxDB 2.x)

<!--codeinclude-->
[](../../packages/modules/influxdb/src/influxdb-container.test.ts) inside_block:influxdb2WriteAndQuery
<!--/codeinclude-->

### Write and query points (InfluxDB 1.x)

<!--codeinclude-->
[](../../packages/modules/influxdb/src/influxdb-container.test.ts) inside_block:influxdb1WriteAndQuery
<!--/codeinclude-->
