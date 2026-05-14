import { ContainerInspectInfo } from "dockerode";
import { mapInspectResult } from "./map-inspect-result";

const inspectResult = (health?: { Status: string }): ContainerInspectInfo =>
  ({
    Name: "container",
    Config: {
      Hostname: "hostname",
      Labels: {},
    },
    State: {
      Status: "running",
      Running: true,
      StartedAt: "2026-05-14T10:00:00.000Z",
      FinishedAt: "0001-01-01T00:00:00.000Z",
      Health: health,
    },
    NetworkSettings: {
      Ports: {},
      Networks: {},
    },
  }) as unknown as ContainerInspectInfo;

describe("mapInspectResult", () => {
  it("should map missing health status to none", () => {
    expect(mapInspectResult(inspectResult()).healthCheckStatus).toBe("none");
  });

  it("should map empty health status to none", () => {
    expect(mapInspectResult(inspectResult({ Status: "" })).healthCheckStatus).toBe("none");
  });

  it("should map health status", () => {
    expect(mapInspectResult(inspectResult({ Status: "healthy" })).healthCheckStatus).toBe("healthy");
  });
});
