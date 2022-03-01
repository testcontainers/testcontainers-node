import { getContainerPort, Port, PortWithOptionalBinding } from "./port";
import { InspectResult } from "./docker/functions/container/inspect-container";

export class BoundPorts {
  private readonly ports = new Map<Port, Port>();

  public getBinding(port: Port): Port {
    const binding = this.ports.get(port);

    if (!binding) {
      throw new Error(`No port binding found for :${port}`);
    }

    return binding;
  }

  public setBinding(key: Port, value: Port): void {
    this.ports.set(key, value);
  }

  public iterator(): Iterable<[Port, Port]> {
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

  public static fromInspectResult(inspectResult: InspectResult): BoundPorts {
    const boundPorts = new BoundPorts();

    Object.entries(inspectResult.ports).forEach(([internalPort, hostPort]) =>
      boundPorts.setBinding(parseInt(internalPort), hostPort)
    );

    return boundPorts;
  }
}
