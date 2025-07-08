import { ContainerInspectInfo } from "dockerode";
import { mapInspectResult } from "../utils/map-inspect-result";
import { inspectContainerUntilPortsExposed } from "./inspect-container-util-ports-exposed";

function mockInspectResult(ports: ContainerInspectInfo["NetworkSettings"]["Ports"]) {
  const date = new Date();

  const inspectResult: ContainerInspectInfo = {
    Name: "container-id",
    Config: {
      Hostname: "hostname",
      Labels: {},
    },
    State: {
      Health: {
        Status: "healthy",
      },
      Status: "running",
      Running: true,
      StartedAt: date.toISOString(),
      FinishedAt: date.toISOString(),
    },
    NetworkSettings: {
      Ports: ports,
      Networks: {},
    },
  } as unknown as ContainerInspectInfo;

  return { inspectResult, mappedInspectResult: mapInspectResult(inspectResult) };
}

test.concurrent("returns the inspect results when all ports are exposed", async () => {
  const data = mockInspectResult({ "8080/tcp": [{ HostIp: "0.0.0.0", HostPort: "45000" }] });
  const inspectFn = vi.fn().mockResolvedValueOnce(data.inspectResult);

  const result = await inspectContainerUntilPortsExposed(inspectFn, [8080], "container-id");

  expect(result).toEqual(data);
});

test.concurrent("retries the inspect if ports are not yet exposed", async () => {
  const data1 = mockInspectResult({ "8080/tcp": [] });
  const data2 = mockInspectResult({ "8080/tcp": [{ HostIp: "0.0.0.0", HostPort: "45000" }] });
  const inspectFn = vi
    .fn()
    .mockResolvedValueOnce(data1.inspectResult)
    .mockResolvedValueOnce(data1.inspectResult)
    .mockResolvedValueOnce(data2.inspectResult);

  const result = await inspectContainerUntilPortsExposed(inspectFn, [8080], "container-id");

  expect(result).toEqual(data2);
  expect(inspectFn).toHaveBeenCalledTimes(3);
});

test.concurrent("throws an error when host ports are not exposed within timeout", async () => {
  const data = mockInspectResult({ "8080/tcp": [] });
  const inspectFn = vi.fn().mockResolvedValue(data.inspectResult);

  await expect(inspectContainerUntilPortsExposed(inspectFn, [8080], "container-id", 0)).rejects.toThrow(
    "Container did not expose all ports after starting"
  );
});

test.concurrent("throws an error when container ports not exposed within timeout", async () => {
  const data = mockInspectResult({});
  const inspectFn = vi.fn().mockResolvedValue(data.inspectResult);

  await expect(inspectContainerUntilPortsExposed(inspectFn, [8080], "container-id", 0)).rejects.toThrow(
    "Container did not expose all ports after starting"
  );
});
