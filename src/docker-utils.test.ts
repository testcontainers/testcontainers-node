/* eslint-disable @typescript-eslint/no-unused-vars */

import Dockerode from "dockerode";
import { existsSync } from "fs";
import { DockerodeUtils } from "./docker-utils";
import { runInContainer } from "./run-in-container";

jest.mock("fs");
const mockedExistsSync = existsSync as jest.Mock;

jest.mock("./run-in-container");
const mockedRunInContainer = runInContainer as jest.Mock;

describe("DockerUtils", () => {
  describe("getHost", () => {
    beforeEach(() => {
      delete process.env["TESTCONTAINERS_HOST_OVERRIDE"];
    });

    it("should return the host from the modem", async () => {
      const utils = new DockerodeUtils({ modem: { host: "modemHost" } } as Dockerode);

      const host = await utils.getHost();

      expect(host).toBe("modemHost");
    });

    it("should return the TESTCONTAINERS_HOST_OVERRIDE if it is set", async () => {
      const utils = new DockerodeUtils({ modem: {} } as Dockerode);
      process.env["TESTCONTAINERS_HOST_OVERRIDE"] = "testcontainersHostOverride";

      const host = await utils.getHost();

      expect(host).toBe("testcontainersHostOverride");
    });

    it("should return localhost if not running within a container", async () => {
      const utils = new DockerodeUtils({ modem: {} } as Dockerode);
      mockedExistsSync.mockReturnValueOnce(false);

      const host = await utils.getHost();

      expect(host).toBe("localhost");
    });

    it("should return localhost if running in container and no network IPAM", async () => {
      const fakeInspect = {};
      const fakeNetwork = { inspect: () => Promise.resolve(fakeInspect) } as Dockerode.Network;
      const utils = new DockerodeUtils({ modem: {}, getNetwork: (networkName: string) => fakeNetwork } as Dockerode);
      mockedExistsSync.mockReturnValueOnce(true);

      const host = await utils.getHost();

      expect(host).toBe("localhost");
    });

    it("should return localhost if running in container and no network IPAM config", async () => {
      const fakeInspect = { IPAM: {} };
      const fakeNetwork = { inspect: () => Promise.resolve(fakeInspect) } as Dockerode.Network;
      const utils = new DockerodeUtils({ modem: {}, getNetwork: (networkName: string) => fakeNetwork } as Dockerode);
      mockedExistsSync.mockReturnValueOnce(true);

      const host = await utils.getHost();

      expect(host).toBe("localhost");
    });

    it("should return gateway from IPAM if running in container with IPAM", async () => {
      const fakeInspect = { IPAM: { Config: [{ Gateway: "ipamGateway" }] } };
      const fakeNetwork = { inspect: () => Promise.resolve(fakeInspect) } as Dockerode.Network;
      const utils = new DockerodeUtils({ modem: {}, getNetwork: (networkName: string) => fakeNetwork } as Dockerode);
      mockedExistsSync.mockReturnValueOnce(true);

      const host = await utils.getHost();

      expect(host).toBe("ipamGateway");
    });

    it("should return gateway from container", async () => {
      const fakeInspect = { IPAM: { Config: [] } };
      const fakeNetwork = { inspect: () => Promise.resolve(fakeInspect) } as Dockerode.Network;
      const utils = new DockerodeUtils({ modem: {}, getNetwork: (networkName: string) => fakeNetwork } as Dockerode);
      mockedExistsSync.mockReturnValueOnce(true);
      mockedRunInContainer.mockReturnValueOnce(Promise.resolve("gatewayFromContainer"));

      const host = await utils.getHost();

      expect(host).toBe("gatewayFromContainer");
    });

    it("should return localhost if cannot get gateway from container", async () => {
      const fakeInspect = { IPAM: { Config: [] } };
      const fakeNetwork = { inspect: () => Promise.resolve(fakeInspect) } as Dockerode.Network;
      const utils = new DockerodeUtils({ modem: {}, getNetwork: (networkName: string) => fakeNetwork } as Dockerode);
      mockedExistsSync.mockReturnValueOnce(true);
      mockedRunInContainer.mockReturnValueOnce(Promise.resolve(undefined));

      const host = await utils.getHost();

      expect(host).toBe("localhost");
    });
  });
});
