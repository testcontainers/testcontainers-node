import { Etcd3 } from "etcd3";
import { promisify } from "node:util";
import { EtcdContainer, StartedEtcdContainer } from "./etcd-container";

const sleep = promisify(setTimeout);

describe("etcd", () => {
  it("should construct a container", async () => {
    const container = await new EtcdContainer().start();
    expect(container).toBeInstanceOf(StartedEtcdContainer);
    container.stop();
  });

  // readWrite {
  it("should connect and perform read/write operations", async () => {
    const container = await new EtcdContainer().start();
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
    const container = await new EtcdContainer().start();
    const client = new Etcd3({
      hosts: container.getClientEndpoint(),
    });
    const key = "foo";
    const value = "bar";
    const watcher = await client.watch().key(key).create();
    watcher.on("put", subscriber);
    await client.put(key).value(value);
    await sleep(1000);
    expect(subscriber).toHaveBeenCalled();
    await watcher.cancel();
    await container.stop();
  });
  // }
});
