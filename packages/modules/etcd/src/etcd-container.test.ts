import { Etcd3 } from "etcd3";
import { setTimeout } from "node:timers/promises";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { EtcdContainer } from "./etcd-container";

const IMAGE = getImage(__dirname);

describe("etcd", () => {
  // readWrite {
  it("should connect and perform read/write operations", async () => {
    await using container = await new EtcdContainer(IMAGE).start();

    const client = new Etcd3({
      hosts: container.getClientEndpoint(),
    });

    const key = "foo";
    const value = "bar";
    await client.put(key).value(value);

    const result = await client.get(key).string();
    expect(result).toEqual(value);
  });
  // }

  // subscribe {
  it("should subscribe to key changes", async () => {
    const subscriber = vi.fn();

    await using container = await new EtcdContainer(IMAGE).start();

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
  });
  // }
});
