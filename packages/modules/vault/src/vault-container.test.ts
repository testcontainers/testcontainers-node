import { Client } from "@litehex/node-vault";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { VaultContainer } from "./vault-container";

const VAULT_TOKEN = "my-root-token";
const IMAGE = getImage(__dirname);

describe("VaultContainer", { timeout: 180_000 }, () => {
  it("should start Vault and allow reading/writing secrets", async () => {
    // inside_block:readWrite {
    await using container = await new VaultContainer(IMAGE).withVaultToken(VAULT_TOKEN).start();

    const client = new Client({
      endpoint: container.getAddress(),
      token: container.getRootToken(),
    });

    const writeResult = await client.kv2.write({
      mountPath: "secret",
      path: "hello",
      data: {
        message: "world",
        other: "vault",
      },
    });
    expect(writeResult.error).toBeUndefined();

    const readResult = await client.kv2.read({
      mountPath: "secret",
      path: "hello",
    });

    if (readResult.error) {
      throw readResult.error;
    }

    const data = readResult.data.data.data;

    expect(data.message).toBe("world");
    expect(data.other).toBe("vault");
    // }
  });

  it("should execute init commands using vault CLI", async () => {
    // inside_block:initCommands {
    await using container = await new VaultContainer(IMAGE)
      .withVaultToken(VAULT_TOKEN)
      .withInitCommands("secrets enable transit", "write -f transit/keys/my-key")
      .start();

    const result = await container.exec(["vault", "read", "-format=json", "transit/keys/my-key"]);

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("my-key");
    // }
  });
});
