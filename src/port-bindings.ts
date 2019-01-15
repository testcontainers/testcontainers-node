import { Port } from "./port";
import { PortClient, RandomPortClient } from "./port-client";

export class PortBinder {
  constructor(private readonly portClient: PortClient = new RandomPortClient()) {}

  public async bind(ports: Port[]): Promise<PortBindings> {
    const portBindings = new PortBindings();

    for (const port of ports) {
      portBindings.setBinding(port, await this.portClient.getPort());
    }

    return portBindings;
  }
}

export class PortBindings {
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

  public getHostPorts(): Port[] {
    return Array.from(this.ports.values());
  }

  public getInternalPorts(): Port[] {
    return Array.from(this.ports.keys());
  }

  public iterator(): Iterable<[Port, Port]> {
    return this.ports;
  }
}
