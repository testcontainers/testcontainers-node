import { InspectResult } from "./container";
import { Port } from "./port";

export class ContainerState {
  constructor(private readonly inspectResult: InspectResult) {}

  public getHostPorts(): Port[] {
    return this.inspectResult.hostPorts;
  }

  public getInternalPorts(): Port[] {
    return this.inspectResult.internalPorts;
  }
}
