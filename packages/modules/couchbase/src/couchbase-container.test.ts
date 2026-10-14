import couchbase, { type Bucket, type Cluster } from "couchbase";
import getPort from "get-port";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { BucketDefinition } from "./bucket-definition";
import { CouchbaseContainer } from "./couchbase-container";
import { CouchbaseService } from "./couchbase-service";
import PORTS from "./ports";

const COMMUNITY_IMAGES = ["couchbase/server:community-7.6.2", getImage(__dirname, 1)];
const ENTERPRISE_IMAGES = ["couchbase/server:enterprise-7.6.12", getImage(__dirname, 0)];

describe.each(COMMUNITY_IMAGES)("CouchbaseContainer (%s)", { concurrent: false, timeout: 180_000 }, (image) => {
  it.concurrent("should connect and query", () => expectStoredDocument(image));

  it.concurrent("should flush bucket if flushEnabled and check any document exists", () =>
    expectFlushRemovesDocument(image));

  it.concurrent("should throw error if analytics service enabled with community version", async () => {
    const container = new CouchbaseContainer(image).withEnabledServices(
      CouchbaseService.KV,
      CouchbaseService.ANALYTICS
    );

    await expect(() => container.start()).rejects.toThrowError(
      "The Analytics Service is only supported with the Enterprise version"
    );
  });

  it.concurrent("should throw error if eventing service enabled with community version", async () => {
    const container = new CouchbaseContainer(image).withEnabledServices(CouchbaseService.KV, CouchbaseService.EVENTING);

    await expect(() => container.start()).rejects.toThrowError(
      "The Eventing Service is only supported with the Enterprise version"
    );
  });

  it.concurrent("should create and use a bucket with KV service only", async () => {
    const bucketDefinition = new BucketDefinition("kvbucket").withPrimaryIndex(false);
    await using container = await new CouchbaseContainer(image)
      .withEnabledServices(CouchbaseService.KV)
      .withBucket(bucketDefinition)
      .start();

    const cluster = await couchbase.Cluster.connect(container.getConnectionString(), {
      username: container.getUsername(),
      password: container.getPassword(),
    });

    const bucket = cluster.bucket(bucketDefinition.getName());
    await bucket.waitUntilReady(10_000, {
      serviceTypes: [couchbase.ServiceType.KeyValue],
    });

    const coll = bucket.defaultCollection();
    await coll.upsert("testdoc", { foo: "bar" });
    expect((await coll.get("testdoc")).content).toEqual({ foo: "bar" });

    await cluster.close();
  });

  it.concurrent("should connect without a bucket", async () => {
    await using container = await new CouchbaseContainer(image).withEnabledServices(CouchbaseService.KV).start();

    const cluster = await couchbase.Cluster.connect(container.getConnectionString(), {
      username: container.getUsername(),
      password: container.getPassword(),
    });

    const result = await cluster.ping({ serviceTypes: [couchbase.ServiceType.KeyValue] });

    expect(result.services[couchbase.ServiceType.KeyValue]?.[0].state).toBe(couchbase.PingState.Ok);

    await cluster.close();
  });

  it.concurrent("should fail when setup exceeds the startup timeout", async () => {
    const container = new CouchbaseContainer(image).withEnabledServices(CouchbaseService.KV).withStartupTimeout(2_000);

    await expect(() => container.start()).rejects.toThrowError(/URL \/pools not accessible after \d+ms/);
  });

  it.concurrent("should preserve fixed host port binding", async () => {
    const hostPort = await getPort();
    await using container = await new CouchbaseContainer(image)
      .withEnabledServices(CouchbaseService.KV)
      .withExposedPorts({ container: PORTS.MGMT_PORT, host: hostPort })
      .start();

    expect(container.getMappedPort(PORTS.MGMT_PORT)).toBe(hostPort);
  });
});

describe.each(ENTERPRISE_IMAGES)("CouchbaseContainer (%s)", { concurrent: false, timeout: 180_000 }, (image) => {
  it.concurrent("should connect and query", () => expectStoredDocument(image));

  it.concurrent("should flush bucket if flushEnabled and check any document exists", () =>
    expectFlushRemovesDocument(image));

  it.concurrent("should start with analytics service enabled", async () => {
    await using container = await new CouchbaseContainer(image)
      .withEnabledServices(CouchbaseService.KV, CouchbaseService.ANALYTICS)
      .start();

    expect(container.getConnectionString()).toContain("couchbase://");
  });
});

async function expectStoredDocument(image: string): Promise<void> {
  // connectAndQuery {
  const bucketDefinition = new BucketDefinition("mybucket");
  await using container = await new CouchbaseContainer(image).withBucket(bucketDefinition).start();

  const cluster = await couchbase.Cluster.connect(container.getConnectionString(), {
    username: container.getUsername(),
    password: container.getPassword(),
  });

  const bucket = cluster.bucket(bucketDefinition.getName());
  await bucket.waitUntilReady(10_000, {
    serviceTypes: [couchbase.ServiceType.KeyValue],
  });

  const coll = bucket.defaultCollection();
  await coll.upsert("testdoc", { foo: "bar" });
  const result = await coll.get("testdoc");

  expect(result.content).toEqual({ foo: "bar" });

  await cluster.close();
  // }
}

async function expectFlushRemovesDocument(image: string): Promise<void> {
  const bucketDefinition = new BucketDefinition("mybucket").withFlushEnabled(true);
  const container = new CouchbaseContainer(image).withBucket(bucketDefinition);

  await using startedTestContainer = await container.start();
  const cluster = await couchbase.Cluster.connect(startedTestContainer.getConnectionString(), {
    username: startedTestContainer.getUsername(),
    password: startedTestContainer.getPassword(),
  });

  const bucket = cluster.bucket(bucketDefinition.getName());
  await bucket.waitUntilReady(10_000, {
    serviceTypes: [couchbase.ServiceType.KeyValue],
  });

  const coll = bucket.defaultCollection();

  await coll.upsert("testdoc", { foo: "bar" });

  const existResult = await flushBucketAndCheckExists(cluster, bucket, "testdoc");

  expect(existResult.exists).toBe(false);
  await cluster.close();
}

async function flushBucketAndCheckExists(
  cluster: Cluster,
  bucket: Bucket,
  key: string
): Promise<couchbase.ExistsResult> {
  const coll = bucket.defaultCollection();

  await cluster.buckets().flushBucket(bucket.name);
  return coll.exists(key);
}
