import couchbase, { Bucket, Cluster } from "couchbase";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { BucketDefinition } from "./bucket-definition";
import { CouchbaseContainer } from "./couchbase-container";
import { CouchbaseService } from "./couchbase-service";

const ENTERPRISE_IMAGE = getImage(__dirname, 0);
const COMMUNITY_IMAGE = getImage(__dirname, 1);

describe("CouchbaseContainer", { timeout: 180_000 }, () => {
  const flushBucketAndCheckExists = async (
    cluster: Cluster,
    bucket: Bucket,
    key: string
  ): Promise<couchbase.ExistsResult> => {
    const coll = bucket.defaultCollection();

    await cluster.buckets().flushBucket(bucket.name);
    return coll.exists(key);
  };

  it.each([ENTERPRISE_IMAGE, COMMUNITY_IMAGE])("should connect and query using %s image", async (image) => {
    // connectAndQuery {
    const bucketDefinition = new BucketDefinition("mybucket");
    await using container = await new CouchbaseContainer(image).withBucket(bucketDefinition).start();

    const cluster = await couchbase.Cluster.connect(container.getConnectionString(), {
      username: container.getUsername(),
      password: container.getPassword(),
    });

    const bucket = cluster.bucket(bucketDefinition.getName());

    const coll = bucket.defaultCollection();
    await coll.upsert("testdoc", { foo: "bar" });
    const result = await coll.get("testdoc");

    expect(result.content).toEqual({ foo: "bar" });

    await cluster.close();
    // }
  });

  it.each([ENTERPRISE_IMAGE, COMMUNITY_IMAGE])(
    "should flush bucket if flushEnabled and check any document exists with %s image",
    async (image) => {
      const bucketDefinition = new BucketDefinition("mybucket").withFlushEnabled(true);
      const container = new CouchbaseContainer(image).withBucket(bucketDefinition);

      await using startedTestContainer = await container.start();
      const cluster = await couchbase.Cluster.connect(startedTestContainer.getConnectionString(), {
        username: startedTestContainer.getUsername(),
        password: startedTestContainer.getPassword(),
      });

      const bucket = cluster.bucket(bucketDefinition.getName());
      const coll = bucket.defaultCollection();

      await coll.upsert("testdoc", { foo: "bar" });

      const existResult = await flushBucketAndCheckExists(cluster, bucket, "testdoc");

      expect(existResult.exists).toBe(false);
      await cluster.close();
    }
  );

  it("should throw error if analytics service enabled with community version", async () => {
    const container = new CouchbaseContainer(COMMUNITY_IMAGE).withEnabledServices(
      CouchbaseService.KV,
      CouchbaseService.ANALYTICS
    );

    await expect(() => container.start()).rejects.toThrowError(
      "The Analytics Service is only supported with the Enterprise version"
    );
  });

  it("should throw error if eventing service enabled with community version", async () => {
    const container = new CouchbaseContainer(COMMUNITY_IMAGE).withEnabledServices(
      CouchbaseService.KV,
      CouchbaseService.EVENTING
    );

    await expect(() => container.start()).rejects.toThrowError(
      "The Eventing Service is only supported with the Enterprise version"
    );
  });
});
