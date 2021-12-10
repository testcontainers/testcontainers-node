/* eslint-disable @typescript-eslint/no-unused-vars */

import Dockerode from "dockerode";
import { existsSync } from "fs";
import { promise as ping } from "ping";
import { getDockerHost } from "./get-docker-host";
import { runInContainer } from "./functions/run-in-container";

jest.mock("fs");
const mockedExistsSync = existsSync as jest.Mock;

jest.mock("ping");
const mockedProbe = ping.probe as jest.Mock;

jest.mock("./functions/run-in-container");
const mockedRunInContainer = runInContainer as jest.Mock;

describe("getDockerHost", () => {
  beforeEach(() => {
    delete process.env["DOCKER_HOST"];
    delete process.env["TESTCONTAINERS_HOST_OVERRIDE"];
  });

  it("should skip a strategy if the probe fails", async () => {
    process.env.DOCKER_HOST = "tcp://dockerHost:1000";
    mockedProbe.mockReturnValueOnce({ alive: false }).mockReturnValueOnce({ alive: true });

    const host = await getDockerHost({ modem: { host: "tcp://modemHost:1000" } } as Dockerode);

    expect(host).toBe("modemHost");
  });

  describe("probe succeeds", () => {
    beforeEach(() => {
      mockedProbe.mockReturnValueOnce({ alive: true });
    });

    it("should return the host from DOCKER_HOST", async () => {
      process.env.DOCKER_HOST = "tcp://dockerHost:1000";
      const fakeDockerode = {} as Dockerode;

      const host = await getDockerHost(fakeDockerode);

      expect(host).toBe("dockerHost");
    });

    it("should return the host from the modem", async () => {
      const fakeDockerode = { modem: { host: "tcp://modemHost:1000" } } as Dockerode;

      const host = await getDockerHost(fakeDockerode);

      expect(host).toBe("modemHost");
    });

    it("should return the TESTCONTAINERS_HOST_OVERRIDE if it is set", async () => {
      process.env["TESTCONTAINERS_HOST_OVERRIDE"] = "tcp://testcontainersHostOverride:1000";
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
      const fakeInspect = { IPAM: { Config: [{ Gateway: "tcp://ipamGateway:1000" }] } };
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
      mockedRunInContainer.mockReturnValueOnce(Promise.resolve("tcp://gatewayFromContainer:1000"));
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
});
