import nano from "nano";
import { expect } from "vitest";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { CouchDBContainer } from "./couchdb-container";

const IMAGE = getImage(__dirname);

type User = {
  username: string;
  email: string;
};

describe("CouchDBContainer", { timeout: 240_000 }, () => {
  it("should write and read a collection", async () => {
    // startContainer {
    await using container = await new CouchDBContainer(IMAGE).start();

    const client = nano({
      url: container.getUrl(),
    });
    await client.db.create("users");
    const db = client.use<User>("users");

    const document = await db.insert({
      username: "j-doe",
      email: "j-doe@mail.local",
    });

    expect(await db.get(document.id)).toEqual({
      _id: document.id,
      _rev: document.rev,
      username: "j-doe",
      email: "j-doe@mail.local",
    });
    // }
  });

  it("should use custom credentials", async function () {
    // customCredentials {
    await using container = await new CouchDBContainer(IMAGE).withUsername("admin").withPassword("foo").start();

    const client = nano({
      url: container.getUrl(),
    });
    await client.db.create("users");
    const db = client.use<User>("users");

    const document = await db.insert({
      username: "j-doe",
      email: "j-doe@mail.local",
    });

    expect(container.getUrl()).toBe(`http://admin:foo@${container.getHost()}:${container.getPort()}`);
    expect(await db.get(document.id)).toEqual({
      _id: document.id,
      _rev: document.rev,
      username: "j-doe",
      email: "j-doe@mail.local",
    });
    // }
  });
});
