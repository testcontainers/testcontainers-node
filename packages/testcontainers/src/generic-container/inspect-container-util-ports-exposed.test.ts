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
    const data = mockInspectResult({ "8080/tcp": [] }, { "8080/tcp": [{ HostIp: "0.0.0.0", HostPort: "45000" }] });
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

  it("retries the inspect if ports are not yet exposed", async () => {
    const data1 = mockInspectResult({ "8080/tcp": [] }, { "8080/tcp": [] });
    const data2 = mockInspectResult({ "8080/tcp": [] }, { "8080/tcp": [{ HostIp: "0.0.0.0", HostPort: "45000" }] });
    const inspectFn = vi.fn().mockResolvedValueOnce(data1).mockResolvedValueOnce(data1).mockResolvedValueOnce(data2);

    const result = await inspectContainerUntilPortsExposed(inspectFn, "container-id");

    expect(result).toEqual(data2);
    expect(inspectFn).toHaveBeenCalledTimes(3);
  });

  it("retries the inspect if port bindings are undefined", async () => {
    const data1 = mockInspectResult(undefined, { "8080/tcp": [{ HostIp: "0.0.0.0", HostPort: "45000" }] });
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
      "Container did not expose all ports after starting"
    );
  });

  it("throws an error when container ports not exposed within timeout", async () => {
    const data = mockInspectResult({ "8080/tcp": [] }, {});
    const inspectFn = vi.fn().mockResolvedValue(data);

    await expect(inspectContainerUntilPortsExposed(inspectFn, "container-id", 0)).rejects.toThrow(
      "Container did not expose all ports after starting"
    );
  });
});
