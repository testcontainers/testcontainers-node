import { Port } from "./port";
import { PortBindings } from "./port-bindings";
export declare class ContainerState {
    private readonly portBindings;
    constructor(portBindings: PortBindings);
    getHostPorts(): Port[];
}
