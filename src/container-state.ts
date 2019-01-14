import { PortBindings } from "./port-bindings";

export class ContainerState {
    constructor(private readonly portBindings: PortBindings) {}
}
