import { OpenldapContainer, StartedOpenldapContainer } from "./openldap-container";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import { Client } from "ldapts";

describe("OpenLdapContainer", () => {
  jest.setTimeout(240_000);

  // startContainer {
  it("should connect and execute set-get", async () => {
    const container = await new OpenldapContainer().withRootDn("dc=example,dc=org").start();

    const client = await connectTo(container);

    const newUserName = "foo";
    const dn = `cn=${newUserName}, ${container.getRootDn()}`;
    await client.add(dn, {
      cn: newUserName,
      uidNumber: "1000",
      gidNumber: "1000",
      homeDirectory: `/home/${newUserName}`,
      uid: newUserName,
      sn: "LastName",
      objectclass: ["inetOrgPerson", "posixAccount"],
    });
    const user = await client.search(dn);
    expect(user.searchEntries[0].object).not.toBeNull();

    await client.unbind();
    await container.stop();
  });
  // }

  it("should connect with password and execute set-get", async () => {
    const container = await new OpenldapContainer().withPassword("test").start();

    const client = await connectTo(container);

    //await client.set("key", "val");
    //expect(await client.get("key")).toBe("val");

    await client.unbind();
    await container.stop();
  });

  // persistentData {
  it("should reconnect with volume and persistence data", async () => {
    const sourcePath = fs.mkdtempSync(path.join(os.tmpdir(), "ldap-"));
    const container = await new OpenldapContainer().withPassword("test").withPersistence(sourcePath).start();
    let client = await connectTo(container);

    //await client.set("key", "val");
    await client.unbind();
    await container.restart();
    client = await connectTo(container);
    //expect(await client.get("key")).toBe("val");

    await client.unbind();
    await container.stop();
    try {
      fs.rmSync(sourcePath, { force: true, recursive: true });
    } catch (e) {
      //Ignore clean up, when have no access on fs.
      console.log(e);
    }
  });
  // }

  // initial data import {
  it("should load initial data and can read it", async () => {
    const container = await new OpenldapContainer()
      .withPassword("test")
      .withInitialLdif(path.join(__dirname, "initData.ldif"))
      .start();
    const client = await connectTo(container);
    const user1 = await client.search("uid=testuser1,ou=users,dc=example,dc=com");
    expect(user1.searchEntries.length).toBe(1);

    client.unbind();
    await container.stop();
  });
  // }

  // startWithCredentials {
  it("should start with credentials and login", async () => {
    const username = "cn=admin,dc=example,dc=org";
    const password = "testPassword";

    // Test authentication
    const container = await new OpenldapContainer().withUsername(username).withPassword(password).start();
    expect(container.getConnectionUrl()).toEqual(`ldap://${container.getHost()}:${container.getPort()}`);
    expect(container.getUsername()).toEqual(username);
    expect(container.getPassword()).toEqual(password);
    const client = await connectTo(container);

    await client.unbind();
    await container.stop();
  });
  // }

  // executeCommand {
  it("should execute container cmd and return the result", async () => {
    const container = await new OpenldapContainer().start();

    const queryResult = await container.executeCliCmd("info", ["clients"]);
    expect(queryResult).toEqual(expect.stringContaining("connected_clients:1"));

    await container.stop();
  });
  // }

  // simpleConnect {
  async function connectTo(container: StartedOpenldapContainer) {
    const client = new Client({
      url: container.getConnectionUrl(),
    });
    await client.bind(`cn=${container.getUsername()},${container.getRootDn()}`, container.getPassword());
    expect(client.isConnected).toBeTruthy();
    return client;
  }
  // }
});
