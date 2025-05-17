import { Etcd3 } from "etcd3";
import { EtcdContainer } from "./etcd-container";

describe("etcd", () => {
  it("should construct a container", async () => {
    await new EtcdContainer().start();
  });

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
  });
});
