import { Port } from "./port";
import { PortClient, RandomPortClient } from "./port-client";

export class PortBinder {
  constructor(private readonly portClient: PortClient = new RandomPortClient()) {}

  public async bind(ports: Port[]): Promise<BoundPorts> {
    const boundPorts = new BoundPorts();

    for (const port of ports) {
      boundPorts.setBinding(port, await this.portClient.getPort());
    }

    return boundPorts;
  }
}

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
}
