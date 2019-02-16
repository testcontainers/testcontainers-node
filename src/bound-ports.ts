import { Port } from "./port";

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
