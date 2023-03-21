import { resolveHost } from "./resolve-host";
import { existsSync } from "fs";
import { runInContainer } from "./functions/run-in-container";
import Dockerode from "dockerode";

jest.mock("fs");
jest.mock("dockerode");
jest.mock("./functions/run-in-container");

const mockDockerode = jest.mocked(Dockerode);
const mockExistsSync = jest.mocked(existsSync);
const mockRunInContainer = jest.mocked(runInContainer);

test("should return TESTCONTAINERS_HOST_OVERRIDE from environment", async () => {
  const host = await resolveHost(new Dockerode(), "", "", { TESTCONTAINERS_HOST_OVERRIDE: "tcp://docker:2375" });
  expect(host).toEqual("tcp://docker:2375");
});

test("should return hostname for TCP protocols", async () => {
  for (const uri of ["tcp://docker:2375", "http://docker:2375", "https://docker:2375"]) {
    const host = await resolveHost(new Dockerode(), "", uri, {});
    expect(host).toEqual("docker");
  }
});

test("should return localhost for unix and npipe protocols when not running in a container", async () => {
  mockExistsSync.mockReturnValue(false);

  for (const uri of ["unix://docker:2375", "npipe://docker:2375"]) {
    const host = await resolveHost(new Dockerode(), "", uri, {});
    expect(host).toEqual("localhost");
  }
});

test("should return host from gateway when running in a container", async () => {
  mockExistsSync.mockReturnValue(true);
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  mockDockerode.mockImplementation(() => ({
    getNetwork: () => ({
      inspect: () =>
        Promise.resolve({
          IPAM: {
            Config: [{ Gateway: "172.0.0.1" }],
          },
        }),
    }),
  }));

  for (const uri of ["unix://docker:2375", "npipe://docker:2375"]) {
    const host = await resolveHost(new Dockerode(), "", uri, {});
    expect(host).toEqual("172.0.0.1");
  }
});

test("should return host from default gateway when running in a container", async () => {
  mockExistsSync.mockReturnValue(true);
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  mockDockerode.mockImplementation(() => ({
    getNetwork: () => ({
      inspect: () => Promise.resolve({}),
    }),
  }));
  mockRunInContainer.mockReturnValue(Promise.resolve("172.0.0.2"));

  for (const uri of ["unix://docker:2375", "npipe://docker:2375"]) {
    const host = await resolveHost(new Dockerode(), "", uri, {});
    expect(host).toEqual("172.0.0.2");
  }
});

test("should return localhost if unable to find gateway", async () => {
  mockExistsSync.mockReturnValue(true);
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  mockDockerode.mockImplementation(() => ({
    getNetwork: () => ({
      inspect: () => Promise.resolve({}),
    }),
  }));
  mockRunInContainer.mockReturnValue(Promise.resolve(undefined));

  for (const uri of ["unix://docker:2375", "npipe://docker:2375"]) {
    const host = await resolveHost(new Dockerode(), "", uri, {});
    expect(host).toEqual("localhost");
  }
});

test("should throw for unsupported protocol", async () => {
  await expect(() => resolveHost(new Dockerode(), "", "invalid://unknown", {})).rejects.toThrowError(
    "Unsupported protocol: invalid"
  );
});
