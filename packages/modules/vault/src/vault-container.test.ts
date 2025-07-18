import vault from "node-vault";
import { StartedVaultContainer, VaultContainer } from "./vault-container";

const VAULT_TOKEN = "my-root-token";

describe("VaultContainer", { timeout: 180_000 }, () => {
  let container: StartedVaultContainer;

  afterEach(async () => {
    await container?.stop();
  });

  // inside_block:readWrite {
  it("should start Vault and allow reading/writing secrets", async () => {
    container = await new VaultContainer().withVaultToken(VAULT_TOKEN).start();

    const client = vault({
      apiVersion: "v1",
      endpoint: container.getAddress(),
      token: container.getRootToken(),
    });

    await client.write("secret/data/hello", {
      data: {
        message: "world",
        other: "vault",
      },
    });

    const result = await client.read("secret/data/hello");
    const data = result?.data?.data;

    expect(data.message).toBe("world");
    expect(data.other).toBe("vault");
  });
  // }

  // inside_block:initCommands {
  it("should execute init commands using vault CLI", async () => {
    container = await new VaultContainer()
      .withVaultToken(VAULT_TOKEN)
      .withInitCommands("secrets enable transit", "write -f transit/keys/my-key")
      .start();

    const result = await container.exec(["vault", "read", "-format=json", "transit/keys/my-key"]);

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("my-key");
  });
  // }
});
