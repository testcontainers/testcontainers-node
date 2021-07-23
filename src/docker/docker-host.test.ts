/* eslint-disable @typescript-eslint/no-unused-vars */

import Dockerode from "dockerode";
import { existsSync } from "fs";
import { getDockerHost } from "./docker-host";
import { runInContainer } from "./functions/run-in-container";

jest.mock("fs");
const mockedExistsSync = existsSync as jest.Mock;

jest.mock("./functions/run-in-container");
const mockedRunInContainer = runInContainer as jest.Mock;

describe("getDockerHost", () => {
  beforeEach(() => {
    delete process.env["TESTCONTAINERS_HOST_OVERRIDE"];
  });

  it("should return the host from the modem", async () => {
    const fakeDockerode = { modem: { host: "modemHost" } } as Dockerode;

    const host = await getDockerHost(fakeDockerode);

    expect(host).toBe("modemHost");
  });

  it("should return the TESTCONTAINERS_HOST_OVERRIDE if it is set", async () => {
    process.env["TESTCONTAINERS_HOST_OVERRIDE"] = "testcontainersHostOverride";
    const fakeDockerode = { modem: {} } as Dockerode;

    const host = await getDockerHost(fakeDockerode);

    expect(host).toBe("testcontainersHostOverride");
  });

  it("should return localhost if not running within a container", async () => {
    mockedExistsSync.mockReturnValueOnce(false);
    const fakeDockerode = { modem: {} } as Dockerode;

    const host = await getDockerHost(fakeDockerode);

    expect(host).toBe("localhost");
  });

  it("should return localhost if running in container and no network IPAM", async () => {
    const fakeInspect = {};
    const fakeNetwork = { inspect: () => Promise.resolve(fakeInspect) } as Dockerode.Network;
    mockedExistsSync.mockReturnValueOnce(true);
    const fakeDockerode = { modem: {}, getNetwork: (networkName: string) => fakeNetwork } as Dockerode;

    const host = await getDockerHost(fakeDockerode);

    expect(host).toBe("localhost");
  });

  it("should return localhost if running in container and no network IPAM config", async () => {
    const fakeInspect = { IPAM: {} };
    const fakeNetwork = { inspect: () => Promise.resolve(fakeInspect) } as Dockerode.Network;
    mockedExistsSync.mockReturnValueOnce(true);
    const fakeDockerode = { modem: {}, getNetwork: (networkName: string) => fakeNetwork } as Dockerode;

    const host = await getDockerHost(fakeDockerode);

    expect(host).toBe("localhost");
  });

  it("should return gateway from IPAM if running in container with IPAM", async () => {
    const fakeInspect = { IPAM: { Config: [{ Gateway: "ipamGateway" }] } };
    const fakeNetwork = { inspect: () => Promise.resolve(fakeInspect) } as Dockerode.Network;
    mockedExistsSync.mockReturnValueOnce(true);
    const fakeDockerode = { modem: {}, getNetwork: (networkName: string) => fakeNetwork } as Dockerode;

    const host = await getDockerHost(fakeDockerode);

    expect(host).toBe("ipamGateway");
  });

  it("should return gateway from container", async () => {
    const fakeInspect = { IPAM: { Config: [] } };
    const fakeNetwork = { inspect: () => Promise.resolve(fakeInspect) } as Dockerode.Network;
    mockedExistsSync.mockReturnValueOnce(true);
    mockedRunInContainer.mockReturnValueOnce(Promise.resolve("gatewayFromContainer"));
    const fakeDockerode = { modem: {}, getNetwork: (networkName: string) => fakeNetwork } as Dockerode;

    const host = await getDockerHost(fakeDockerode);

    expect(host).toBe("gatewayFromContainer");
  });

  it("should return localhost if cannot get gateway from container", async () => {
    const fakeInspect = { IPAM: { Config: [] } };
    const fakeNetwork = { inspect: () => Promise.resolve(fakeInspect) } as Dockerode.Network;
    mockedExistsSync.mockReturnValueOnce(true);
    mockedRunInContainer.mockReturnValueOnce(Promise.resolve(undefined));
    const fakeDockerode = { modem: {}, getNetwork: (networkName: string) => fakeNetwork } as Dockerode;

    const host = await getDockerHost(fakeDockerode);

    expect(host).toBe("localhost");
  });
});
