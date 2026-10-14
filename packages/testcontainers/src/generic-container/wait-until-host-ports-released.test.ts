import { BoundPorts } from "../utils/bound-ports";
import { waitUntilHostPortsReleased } from "./wait-until-host-ports-released";

describe("waitUntilHostPortsReleased", { concurrent: false }, () => {
  it("returns without checking when no ports are bound", async () => {
    const isBound = vi.fn();

    await waitUntilHostPortsReleased({ isBound }, boundPorts({}), "container-id");

    expect(isBound).not.toHaveBeenCalled();
  });

  it("returns when the host port is not bound", async () => {
    const isBound = vi.fn().mockResolvedValueOnce(false);

    await waitUntilHostPortsReleased({ isBound }, boundPorts({ "8080/tcp": 45000 }), "container-id");

    expect(isBound).toHaveBeenCalledExactlyOnceWith(45000);
  });

  it("keeps checking until the host port is released", async () => {
    const isBound = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    await waitUntilHostPortsReleased({ isBound }, boundPorts({ "8080/tcp": 45000 }), "container-id");

    expect(isBound).toHaveBeenCalledTimes(3);
  });

  it("waits for every TCP host port", async () => {
    const stillBound = new Map([
      [45000, 0],
      [45001, 2],
    ]);
    const isBound = vi.fn(async (hostPort: number) => {
      const remaining = stillBound.get(hostPort) ?? 0;
      stillBound.set(hostPort, remaining - 1);
      return remaining > 0;
    });

    await waitUntilHostPortsReleased({ isBound }, boundPorts({ "8080/tcp": 45000, "8081/tcp": 45001 }), "container-id");

    expect(isBound.mock.calls.filter(([hostPort]) => hostPort === 45000)).toHaveLength(1);
    expect(isBound.mock.calls.filter(([hostPort]) => hostPort === 45001)).toHaveLength(3);
  });

  it("does not check UDP host ports", async () => {
    const isBound = vi.fn().mockResolvedValue(false);

    await waitUntilHostPortsReleased({ isBound }, boundPorts({ "8080/tcp": 45000, "8081/udp": 45001 }), "container-id");

    expect(isBound).toHaveBeenCalledExactlyOnceWith(45000);
  });

  it("throws an error when a host port is not released within timeout", async () => {
    const isBound = vi.fn().mockResolvedValue(true);

    await expect(
      waitUntilHostPortsReleased({ isBound }, boundPorts({ "8080/tcp": 45000 }), "container-id", 0)
    ).rejects.toThrow("Timed out after 0ms while waiting for host port 45000 to be released");
  });
});

function boundPorts(ports: Record<string, number>): BoundPorts {
  const result = new BoundPorts();
  for (const [containerPort, hostPort] of Object.entries(ports)) {
    result.setBinding(containerPort, hostPort);
  }
  return result;
}
