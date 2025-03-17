import { ChildProcess } from "child_process";
import EventEmitter from "events";
import { Readable, Writable } from "stream";
import { CredentialProvider } from "./credential-provider";
import { ContainerRuntimeConfig } from "./types";

const mockExec = vi.fn();
const mockSpawn = vi.fn();
vi.mock("child_process", () => ({
  exec: (...args: unknown[]) => mockExec(...args),
  spawn: (...args: unknown[]) => mockSpawn(...args),
}));

describe("CredentialProvider", () => {
  let credentialProvider: CredentialProvider;
  let containerRuntimeConfig: ContainerRuntimeConfig;

  beforeEach(() => {
    credentialProvider = new TestCredentialProvider("name", "credentialProviderName");
    containerRuntimeConfig = {};
  });

  it("should return the auth config for a registry", async () => {
    mockExecReturns(JSON.stringify({ registry: "username" }));
    mockSpawnReturns(
      0,
      JSON.stringify({
        ServerURL: "registry",
        Username: "username",
        Secret: "secret",
      })
    );

    const credentials = await credentialProvider.getAuthConfig("registry", containerRuntimeConfig);

    expect(credentials).toEqual({
      registryAddress: "registry",
      username: "username",
      password: "secret",
    });
  });

  it("should not return auth config for registry which is a partial match", async () => {
    mockExecReturns(JSON.stringify({ "https://registry.example.com": "username" }));
    mockSpawnReturns(
      0,
      JSON.stringify({
        ServerURL: "https://registry.example.com",
        Username: "username",
        Secret: "secret",
      })
    );

    expect(
      await credentialProvider.getAuthConfig("https://registry.example.co", containerRuntimeConfig)
    ).toBeUndefined();
  });

  it("should default to the registry url when the server url is not returned", async () => {
    mockExecReturns(JSON.stringify({ "https://registry.example.com": "username" }));
    mockSpawnReturns(
      0,
      JSON.stringify({
        Username: "username",
        Secret: "secret",
      })
    );

    expect(await credentialProvider.getAuthConfig("https://registry.example.com", containerRuntimeConfig)).toEqual({
      registryAddress: "https://registry.example.com",
      username: "username",
      password: "secret",
    });
  });

  it("should return undefined when no auth config found for registry", async () => {
    mockExecReturns(JSON.stringify({ registry2: "username" }));

    const credentials = await credentialProvider.getAuthConfig("registry1", containerRuntimeConfig);

    expect(credentials).toBeUndefined();
  });

  it("should return undefined when provider name not provided", async () => {
    const credentialProvider = new TestCredentialProvider("name", undefined!);

    expect(await credentialProvider.getAuthConfig("registry", containerRuntimeConfig)).toBeUndefined();
  });

  it("should throw when list credentials fails", async () => {
    mockExecThrows();

    await expect(() => credentialProvider.getAuthConfig("registry", containerRuntimeConfig)).rejects.toThrow(
      "An error occurred listing credentials"
    );
  });

  it("should throw when list credentials output cannot be parsed", async () => {
    mockExecReturns("CANNOT_PARSE");

    await expect(() => credentialProvider.getAuthConfig("registry", containerRuntimeConfig)).rejects.toThrow(
      "Unexpected response from Docker credential provider LIST command"
    );
  });

  it("should not throw when list credentials command is not implemented", async () => {
    mockExec.mockImplementationOnce((command, callback) => {
      return callback(new Error(), null, "list is unimplemented\n");
    });

    const credentials = await credentialProvider.getAuthConfig("registry", containerRuntimeConfig);

    expect(credentials).toBeUndefined();
  });

  it("should throw when get credentials fails", async () => {
    mockExecReturns(JSON.stringify({ registry: "username" }));
    mockSpawnReturns(
      1,
      JSON.stringify({
        ServerURL: "registry",
        Username: "username",
        Secret: "secret",
      })
    );

    await expect(() => credentialProvider.getAuthConfig("registry", containerRuntimeConfig)).rejects.toThrow(
      "An error occurred getting a credential"
    );
  });

  it("should throw when get credentials output cannot be parsed", async () => {
    mockExecReturns(JSON.stringify({ registry: "username" }));
    mockSpawnReturns(0, "CANNOT_PARSE");

    await expect(() => credentialProvider.getAuthConfig("registry", containerRuntimeConfig)).rejects.toThrow(
      "Unexpected response from Docker credential provider GET command"
    );
  });
});

function mockExecReturns(stdout: string) {
  mockExec.mockImplementationOnce((command, callback) => {
    return callback(null, stdout);
  });
}

function mockExecThrows() {
  mockExec.mockImplementationOnce((command, callback) => {
    return callback("An error occurred");
  });
}

function mockSpawnReturns(exitCode: number, stdout: string) {
  const sink = new EventEmitter() as ChildProcess;

  sink.stdout = new Readable({
    read() {
      // no-op
    },
  });

  sink.stdin = new Writable({
    write() {
      sink.stdout?.emit("data", stdout);
      sink.emit("close", exitCode);
    },
  });

  mockSpawn.mockReturnValueOnce(sink);
}

class TestCredentialProvider extends CredentialProvider {
  constructor(
    private readonly name: string,
    private readonly credentialProviderName: string
  ) {
    super();
  }

  getCredentialProviderName(): string | undefined {
    return this.credentialProviderName;
  }

  getName(): string {
    return this.name;
  }
}
