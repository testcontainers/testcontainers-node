import { CredentialProvider } from "./credential-provider";
import { ChildProcess, exec, spawn } from "child_process";
import { DockerConfig } from "./types";
import { Readable, Writable } from "stream";
import EventEmitter from "events";

jest.mock("child_process");
const mockExec = jest.mocked(exec, { shallow: true });
const mockSpawn = jest.mocked(spawn, { shallow: true });

describe("CredentialProvider", () => {
  let credentialProvider: CredentialProvider;
  let dockerConfig: DockerConfig;

  beforeEach(() => {
    credentialProvider = new TestCredentialProvider("name", "credentialProviderName");
    dockerConfig = {};
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

    const credentials = await credentialProvider.getAuthConfig("registry", dockerConfig);

    expect(credentials).toEqual({
      registryAddress: "registry",
      username: "username",
      password: "secret",
    });
  });

  it("should return auth config when registry is a substring of registry in credentials", async () => {
    mockExecReturns(JSON.stringify({ "registry.example.com": "username" }));
    mockSpawnReturns(
      0,
      JSON.stringify({
        ServerURL: "registry.example.com",
        Username: "username",
        Secret: "secret",
      })
    );

    expect(await credentialProvider.getAuthConfig("registry", dockerConfig)).toEqual({
      registryAddress: "registry.example.com",
      username: "username",
      password: "secret",
    });
  });

  it("should return undefined when no auth config found for registry", async () => {
    mockExecReturns(JSON.stringify({ registry2: "username" }));

    const credentials = await credentialProvider.getAuthConfig("registry1", dockerConfig);

    expect(credentials).toBeUndefined();
  });

  it("should return undefined when provider name not provided", async () => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const credentialProvider = new TestCredentialProvider("name", undefined!);

    expect(await credentialProvider.getAuthConfig("registry", dockerConfig)).toBeUndefined();
  });

  it("should throw when list credentials fails", async () => {
    mockExecThrows();

    await expect(() => credentialProvider.getAuthConfig("registry", dockerConfig)).rejects.toThrow(
      "An error occurred listing credentials"
    );
  });

  it("should throw when list credentials output cannot be parsed", async () => {
    mockExecReturns("CANNOT_PARSE");

    await expect(() => credentialProvider.getAuthConfig("registry", dockerConfig)).rejects.toThrow(
      "Unexpected response from Docker credential provider LIST command"
    );
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

    await expect(() => credentialProvider.getAuthConfig("registry", dockerConfig)).rejects.toThrow(
      "An error occurred getting a credential"
    );
  });

  it("should throw when get credentials output cannot be parsed", async () => {
    mockExecReturns(JSON.stringify({ registry: "username" }));
    mockSpawnReturns(0, "CANNOT_PARSE");

    await expect(() => credentialProvider.getAuthConfig("registry", dockerConfig)).rejects.toThrow(
      "Unexpected response from Docker credential provider GET command"
    );
  });
});

function mockExecReturns(stdout: string) {
  mockExec.mockImplementationOnce((command, callback) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return callback(null, stdout);
  });
}

function mockExecThrows() {
  mockExec.mockImplementationOnce((command, callback) => {
    // @ts-ignore
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
  constructor(private readonly name: string, private readonly credentialProviderName: string) {
    super();
  }

  getCredentialProviderName(): string | undefined {
    return this.credentialProviderName;
  }

  getName(): string {
    return this.name;
  }
}
