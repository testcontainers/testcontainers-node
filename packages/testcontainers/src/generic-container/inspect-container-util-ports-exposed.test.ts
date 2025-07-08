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

test("correctly handles protocol parameter when specified as string", async () => {
  const data = mockInspectResult({ "8080/udp": [{ HostIp: "0.0.0.0", HostPort: "45000" }] });
  const inspectFn = vi.fn().mockResolvedValueOnce(data.inspectResult);

  const result = await inspectContainerUntilPortsExposed(inspectFn, ["8080/udp"], "container-id");

  expect(result).toEqual(data);
});

test("correctly handles protocol parameter when specified in object format", async () => {
  const data = mockInspectResult({ "8080/udp": [{ HostIp: "0.0.0.0", HostPort: "45000" }] });
  const inspectFn = vi.fn().mockResolvedValueOnce(data.inspectResult);

  const result = await inspectContainerUntilPortsExposed(
    inspectFn,
    [{ container: 8080, host: 45000, protocol: "udp" }],
    "container-id"
  );

  expect(result).toEqual(data);
});

test("uses tcp as default protocol when not specified", async () => {
  const data = mockInspectResult({ "8080/tcp": [{ HostIp: "0.0.0.0", HostPort: "45000" }] });
  const inspectFn = vi.fn().mockResolvedValueOnce(data.inspectResult);

  const result = await inspectContainerUntilPortsExposed(inspectFn, [8080], "container-id");

  expect(result).toEqual(data);
});

test("handles multiple ports with different protocols", async () => {
  const ports = {
    "8080/tcp": [{ HostIp: "0.0.0.0", HostPort: "45000" }],
    "9090/udp": [{ HostIp: "0.0.0.0", HostPort: "46000" }],
  };
  const data = mockInspectResult(ports);
  const inspectFn = vi.fn().mockResolvedValueOnce(data.inspectResult);

  const result = await inspectContainerUntilPortsExposed(inspectFn, [8080, "9090/udp"], "container-id");

  expect(result).toEqual(data);
});

test("fails when protocol doesn't match exposed port", async () => {
  // Container exposes TCP port but we're looking for UDP
  const data = mockInspectResult({ "8080/tcp": [{ HostIp: "0.0.0.0", HostPort: "45000" }] });
  const inspectFn = vi.fn().mockResolvedValue(data.inspectResult);

  await expect(inspectContainerUntilPortsExposed(inspectFn, ["8080/udp"], "container-id", 0)).rejects.toThrow(
    "Container did not expose all ports after starting"
  );
});

test("ignores ports with wrong protocol", async () => {
  const ports = {
    "8080/tcp": [{ HostIp: "0.0.0.0", HostPort: "45000" }],
    "8080/udp": [{ HostIp: "0.0.0.0", HostPort: "46000" }],
  };
  const data = mockInspectResult(ports);
  const inspectFn = vi.fn().mockResolvedValueOnce(data.inspectResult);

  // Should only match the UDP port
  const result = await inspectContainerUntilPortsExposed(inspectFn, ["8080/udp"], "container-id");

  expect(result).toEqual(data);
});

test("handles mixed protocol specifications in different formats", async () => {
  const ports = {
    "8080/tcp": [{ HostIp: "0.0.0.0", HostPort: "45000" }],
    "9090/udp": [{ HostIp: "0.0.0.0", HostPort: "46000" }],
    "7070/tcp": [{ HostIp: "0.0.0.0", HostPort: "47000" }],
  };
  const data = mockInspectResult(ports);
  const inspectFn = vi.fn().mockResolvedValueOnce(data.inspectResult);

  const result = await inspectContainerUntilPortsExposed(
    inspectFn,
    [
      8080, // number (default tcp)
      "9090/udp", // string with protocol
      { container: 7070, host: 47000 }, // object (default tcp)
    ],
    "container-id"
  );

  expect(result).toEqual(data);
});

test("retry with gradually exposed ports of different protocols", async () => {
  // First call: No ports exposed
  const data1 = mockInspectResult({});

  // Second call: Only TCP port exposed
  const data2 = mockInspectResult({ "8080/tcp": [{ HostIp: "0.0.0.0", HostPort: "45000" }] });

  // Third call: Both TCP and UDP ports exposed
  const data3 = mockInspectResult({
    "8080/tcp": [{ HostIp: "0.0.0.0", HostPort: "45000" }],
    "8080/udp": [{ HostIp: "0.0.0.0", HostPort: "46000" }],
  });

  const inspectFn = vi
    .fn()
    .mockResolvedValueOnce(data1.inspectResult)
    .mockResolvedValueOnce(data2.inspectResult)
    .mockResolvedValueOnce(data3.inspectResult);

  const result = await inspectContainerUntilPortsExposed(
    inspectFn,
    [8080, "8080/udp"], // Need both TCP and UDP ports
    "container-id"
  );

  expect(result).toEqual(data3);
  expect(inspectFn).toHaveBeenCalledTimes(3);
});
