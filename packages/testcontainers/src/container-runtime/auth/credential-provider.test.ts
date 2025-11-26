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

describe.sequential("CredentialProvider", () => {
  let credentialProvider: CredentialProvider;
  let containerRuntimeConfig: ContainerRuntimeConfig;

  beforeEach(() => {
    credentialProvider = new TestCredentialProvider("name", "credentialProviderName");
    containerRuntimeConfig = {};
  });

  it("should return the auth config for a registry", async () => {
    mockSpawnEmitsData(
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

  it("should return the auth config for a registry using an identity token", async () => {
    mockSpawnEmitsData(
      0,
      JSON.stringify({
        ServerURL: "registry",
        Username: "<token>",
        Secret: "dGVzdAo=",
      })
    );

    const credentials = await credentialProvider.getAuthConfig("registry", containerRuntimeConfig);

    expect(credentials).toEqual({
      registryAddress: "registry",
      identityToken: "dGVzdAo=",
    });
  });

  it("should default to the registry url when the server url is not returned", async () => {
    mockSpawnEmitsData(
      0,
      JSON.stringify({
        Username: "username",
        Secret: "secret",
      })
    );

    expect(await credentialProvider.getAuthConfig("registry.example.com", containerRuntimeConfig)).toEqual({
      registryAddress: "registry.example.com",
      username: "username",
      password: "secret",
    });
  });

  it("should return undefined when provider name not provided", async () => {
    const credentialProvider = new TestCredentialProvider("name", undefined);

    expect(await credentialProvider.getAuthConfig("registry", containerRuntimeConfig)).toBeUndefined();
  });

  it("should return undefined when get credentials fails because we lookup optimistically", async () => {
    mockSpawnEmitsData(
      1,
      JSON.stringify({
        ServerURL: "registry",
        Username: "username",
        Secret: "secret",
      })
    );

    expect(await credentialProvider.getAuthConfig("registry", containerRuntimeConfig)).toBeUndefined();
  });

  it("should throw when credential provider emits error", async () => {
    mockSpawnEmitsError("ERROR");

    await expect(() => credentialProvider.getAuthConfig("registry", containerRuntimeConfig)).rejects.toThrow(
      "Error from Docker credential provider: Error: ERROR"
    );
  });

  it("should throw when get credentials output cannot be parsed", async () => {
    mockSpawnEmitsData(0, "CANNOT_PARSE");

    await expect(() => credentialProvider.getAuthConfig("registry", containerRuntimeConfig)).rejects.toThrow(
      "Unexpected response from Docker credential provider GET command"
    );
  });
});

function mockSpawnEmitsData(exitCode: number, stdout: string) {
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

function mockSpawnEmitsError(message: string) {
  const sink = new EventEmitter() as ChildProcess;

  sink.kill = () => true;
  sink.stdout = new Readable({ read() {} });
  sink.stdin = new Writable({
    write(_chunk, _enc, cb) {
      sink.emit("error", new Error(message));
      cb?.();
    },
  });

  mockSpawn.mockReturnValueOnce(sink);
}

class TestCredentialProvider extends CredentialProvider {
  constructor(
    private readonly name: string,
    private readonly credentialProviderName: string | undefined
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
