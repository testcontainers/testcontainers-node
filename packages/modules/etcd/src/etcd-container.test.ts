import { Etcd3 } from "etcd3";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { EtcdContainer } from "./etcd-container";

const IMAGE = getImage(__dirname);

describe("etcd", { timeout: 180_000 }, () => {
  it("should connect and perform read/write operations", async () => {
    // readWrite {
    await using container = await new EtcdContainer(IMAGE).start();

    const client = new Etcd3({
      hosts: container.getClientEndpoint(),
    });

    const key = "foo";
    const value = "bar";
    await client.put(key).value(value);

    const result = await client.get(key).string();
    expect(result).toEqual(value);
    // }
  });

  it("should subscribe to key changes", async () => {
    // etcdSubscribe {
    await using container = await new EtcdContainer(IMAGE).start();

    const client = new Etcd3({
      hosts: container.getClientEndpoint(),
    });

    const key = "foo";
    const value = "bar";
    const watcher = await client.watch().key(key).create();
    const subscriber = vi.fn();
    watcher.on("put", subscriber);
    await client.put(key).value(value);

    await vi.waitFor(() => expect(subscriber).toHaveBeenCalled(), 1_000);
    await watcher.cancel();
    // }
  });
});
