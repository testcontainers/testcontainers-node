import { getContainerPort, PortWithOptionalBinding, resolveHostPortBinding } from "./port";
import { InspectResult } from "./docker/functions/container/inspect-container";
import { HostIps } from "./docker/lookup-host-ips";
import { ContainerRuntimeClient } from "@testcontainers/container-runtime";

export class BoundPorts {
  private readonly ports = new Map<number, number>();

  constructor(private readonly client: ContainerRuntimeClient) {}

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

  public filter(client: ContainerRuntimeClient, ports: PortWithOptionalBinding[]): BoundPorts {
    const boundPorts = new BoundPorts(client);

    const containerPorts = ports.map((port) => getContainerPort(port));

    for (const [internalPort, hostPort] of this.iterator()) {
      if (containerPorts.includes(internalPort)) {
        boundPorts.setBinding(internalPort, hostPort);
      }
    }

    return boundPorts;
  }

  public static fromInspectResult(
    client: ContainerRuntimeClient,
    hostIps: HostIps,
    inspectResult: InspectResult
  ): BoundPorts {
    const boundPorts = new BoundPorts(client);

    Object.entries(inspectResult.ports).forEach(([containerPort, hostBindings]) => {
      const hostPort = resolveHostPortBinding(hostIps, hostBindings);
      boundPorts.setBinding(parseInt(containerPort), hostPort);
    });

    return boundPorts;
  }
}
