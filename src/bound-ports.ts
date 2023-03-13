import { getContainerPort, PortWithOptionalBinding, resolveHostPortBinding } from "./port";
import { InspectResult } from "./docker/functions/container/inspect-container";
import { HostIps } from "./docker/lookup-host-ips";

export class BoundPorts {
  private readonly ports = new Map<number, number>();

  public getBinding(port: number): number {
    const binding = this.ports.get(port);

    if (!binding) {
      throw new Error(`No port binding found for :${port}`);
    }

    return binding;
  }

  public getFirstBinding(): number {
    const firstBinding = this.ports.values().next().value;

    if (!firstBinding) {
      throw new Error("No port bindings found");
    } else {
      return firstBinding;
    }
  }

  public setBinding(key: number, value: number): void {
    this.ports.set(key, value);
  }

  public iterator(): Iterable<[number, number]> {
    return this.ports;
  }

  public filter(ports: PortWithOptionalBinding[]): BoundPorts {
    const boundPorts = new BoundPorts();

    const containerPorts = ports.map((port) => getContainerPort(port));

    for (const [internalPort, hostPort] of this.iterator()) {
      if (containerPorts.includes(internalPort)) {
        boundPorts.setBinding(internalPort, hostPort);
      }
    }

    return boundPorts;
  }

  public static fromInspectResult(hostIps: HostIps, inspectResult: InspectResult): BoundPorts {
    const boundPorts = new BoundPorts();

    Object.entries(inspectResult.ports).forEach(([containerPort, hostBindings]) => {
      const hostPort = resolveHostPortBinding(hostIps, hostBindings);
      boundPorts.setBinding(parseInt(containerPort), hostPort);
    });

    return boundPorts;
  }
}
