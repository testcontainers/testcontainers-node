import { Etcd3 } from "etcd3";
import { setTimeout } from "node:timers/promises";
import { EtcdContainer, StartedEtcdContainer } from "./etcd-container";

const IMAGE = "quay.io/coreos/etcd:v3.6.0";

describe("etcd", () => {
  it("should construct a container", { timeout: 30_000 }, async () => {
    const container = await new EtcdContainer(IMAGE).start();
    expect(container).toBeInstanceOf(StartedEtcdContainer);
    container.stop();
  });

  // readWrite {
  it("should connect and perform read/write operations", async () => {
    const container = await new EtcdContainer(IMAGE).start();
    const client = new Etcd3({
      hosts: container.getClientEndpoint(),
    });
    const key = "foo";
    const value = "bar";

    await client.put(key).value(value);
    const result = await client.get(key).string();
    expect(result).toEqual(value);

    await container.stop();
  });
  // }

  // subscribe {
  it("should subscribe to key changes", async () => {
    const subscriber = vi.fn();
    const container = await new EtcdContainer(IMAGE).start();
    const client = new Etcd3({
      hosts: container.getClientEndpoint(),
    });
    const key = "foo";
    const value = "bar";
    const watcher = await client.watch().key(key).create();
    watcher.on("put", subscriber);
    await client.put(key).value(value);
    await setTimeout(1_000);
    expect(subscriber).toHaveBeenCalled();
    await watcher.cancel();
    await container.stop();
  });
  // }
});
