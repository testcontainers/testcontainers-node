import { ContainerInspectInfo, ImageInspectInfo } from "dockerode";
import { getHealthCheckStatusFromInspect, hasDisabledHealthCheckConfig, hasHealthCheckConfig } from "./health-check";

describe("health check utils", () => {
  it("should detect Docker health check config", () => {
    const inspectResult = {
      Config: {
        Healthcheck: {
          Test: ["CMD-SHELL", "test -f /tmp/ready"],
        },
      },
    } as unknown as ContainerInspectInfo;

    expect(hasHealthCheckConfig(inspectResult)).toBe(true);
  });

  it("should detect Podman image health check config", () => {
    const inspectResult = {
      Healthcheck: {
        Test: ["CMD-SHELL", "test -f /tmp/ready"],
      },
    } as unknown as ImageInspectInfo;

    expect(hasHealthCheckConfig(inspectResult)).toBe(true);
  });

  it("should ignore disabled health check config", () => {
    const inspectResult = {
      Config: {
        Healthcheck: {
          Test: ["NONE"],
        },
      },
    } as unknown as ContainerInspectInfo;

    expect(hasHealthCheckConfig(inspectResult)).toBe(false);
    expect(hasDisabledHealthCheckConfig(inspectResult)).toBe(true);
  });

  it("should detect Docker health check status", () => {
    const inspectResult = {
      State: {
        Health: {
          Status: "healthy",
        },
      },
    } as unknown as ContainerInspectInfo;

    expect(getHealthCheckStatusFromInspect(inspectResult)).toBe("healthy");
  });

  it("should detect Podman health check status", () => {
    const inspectResult = {
      State: {
        Healthcheck: {
          Status: "starting",
        },
      },
    } as unknown as ContainerInspectInfo;

    expect(getHealthCheckStatusFromInspect(inspectResult)).toBe("starting");
  });
});
