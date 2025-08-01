import { ContainerInspectInfo } from "dockerode";
import { inspectContainerUntilPortsExposed } from "./inspect-container-util-ports-exposed";

function mockInspectResult(
  portBindings: ContainerInspectInfo["HostConfig"]["PortBindings"],
  ports: ContainerInspectInfo["NetworkSettings"]["Ports"]
): ContainerInspectInfo {
  return {
    HostConfig: {
      PortBindings: portBindings,
    },
    NetworkSettings: {
      Ports: ports,
    },
  } as ContainerInspectInfo;
}

describe.sequential("inspectContainerUntilPortsExposed", () => {
  it("returns the inspect result when all ports are exposed", async () => {
    const data = mockInspectResult(
      { "8080/tcp": [], "8081/udp": [] },
      { "8080/tcp": [{ HostIp: "0.0.0.0", HostPort: "45000" }], "8081/udp": [{ HostIp: "0.0.0.0", HostPort: "45001" }] }
    );
    const inspectFn = vi.fn().mockResolvedValueOnce(data);

    const result = await inspectContainerUntilPortsExposed(inspectFn, "container-id");

    expect(result).toEqual(data);
  });

  it("returns the inspect result when no ports are exposed", async () => {
    const data = mockInspectResult({}, {});
    const inspectFn = vi.fn().mockResolvedValueOnce(data);

    const result = await inspectContainerUntilPortsExposed(inspectFn, "container-id");

    expect(result).toEqual(data);
  });

  it("returns the inspect result if host config port bindings are null", async () => {
    const data = mockInspectResult(null, {});
    const inspectFn = vi.fn().mockResolvedValueOnce(data);

    const result = await inspectContainerUntilPortsExposed(inspectFn, "container-id");

    expect(result).toEqual(data);
  });

  it("retries the inspect if ports are not yet exposed", async () => {
    const data1 = mockInspectResult({ "8080/tcp": [] }, { "8080/tcp": [] });
    const data2 = mockInspectResult({ "8080/tcp": [] }, { "8080/tcp": [{ HostIp: "0.0.0.0", HostPort: "45000" }] });
    const inspectFn = vi.fn().mockResolvedValueOnce(data1).mockResolvedValueOnce(data1).mockResolvedValueOnce(data2);

    const result = await inspectContainerUntilPortsExposed(inspectFn, "container-id");

    expect(result).toEqual(data2);
    expect(inspectFn).toHaveBeenCalledTimes(3);
  });

  it("throws an error when host ports are not exposed within timeout", async () => {
    const data = mockInspectResult({ "8080/tcp": [] }, { "8080/tcp": [] });
    const inspectFn = vi.fn().mockResolvedValue(data);

    await expect(inspectContainerUntilPortsExposed(inspectFn, "container-id", 0)).rejects.toThrow(
      "Timed out after 0ms while waiting for container ports to be bound to the host"
    );
  });

  it("throws an error when container ports not exposed within timeout", async () => {
    const data = mockInspectResult({ "8080/tcp": [] }, {});
    const inspectFn = vi.fn().mockResolvedValue(data);

    await expect(inspectContainerUntilPortsExposed(inspectFn, "container-id", 0)).rejects.toThrow(
      "Timed out after 0ms while waiting for container ports to be bound to the host"
    );
  });
});
