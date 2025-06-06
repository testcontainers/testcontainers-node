import { ContainerInspectInfo } from "dockerode";
import { InspectResult } from "../types";
import { mapInspectResult } from "../utils/map-inspect-result";
import { inspectContainerUntilPortsExposed } from "./inspect-container-util-ports-exposed";

function mockExposed(): { inspectResult: ContainerInspectInfo; mappedInspectResult: InspectResult } {
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
      Ports: { "8080/tcp": [{ HostIp: "0.0.0.0", HostPort: "45000" }] },
      Networks: {},
    },
  } as unknown as ContainerInspectInfo;

  return { inspectResult, mappedInspectResult: mapInspectResult(inspectResult) };
}

function mockNotExposed(): { inspectResult: ContainerInspectInfo; mappedInspectResult: InspectResult } {
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
      Ports: { "8080/tcp": [] },
      Networks: {},
    },
  } as unknown as ContainerInspectInfo;

  return { inspectResult, mappedInspectResult: mapInspectResult(inspectResult) };
}

test("returns the inspect results when all ports are exposed", async () => {
  const data = mockExposed();
  const inspectFn = vi.fn().mockResolvedValueOnce(data.inspectResult);

  const result = await inspectContainerUntilPortsExposed(inspectFn, [8080], "container-id");

  expect(result).toEqual(data);
});

test("retries the inspect if ports are not yet exposed", async () => {
  const data1 = mockNotExposed();
  const data2 = mockExposed();
  const inspectFn = vi
    .fn()
    .mockResolvedValueOnce(data1.inspectResult)
    .mockResolvedValueOnce(data1.inspectResult)
    .mockResolvedValueOnce(data2.inspectResult);

  const result = await inspectContainerUntilPortsExposed(inspectFn, [8080], "container-id");

  expect(result).toEqual(data2);
  expect(inspectFn).toHaveBeenCalledTimes(3);
});

test("throws an error when ports are not exposed within timeout", async () => {
  const data = mockNotExposed();
  const inspectFn = vi.fn().mockResolvedValue(data.inspectResult);

  await expect(inspectContainerUntilPortsExposed(inspectFn, [8080], "container-id", 0)).rejects.toThrow(
    "Container did not expose all ports after starting"
  );
});
