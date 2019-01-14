import { Port } from "./port";
import { PortBindings } from "./port-bindings";

export class ContainerState {
  constructor(private readonly portBindings: PortBindings) {}

  public getHostPorts(): Port[] {
    return this.portBindings.getHostPorts();
  }
}
