import { Port } from "./port";
import { PortClient } from "./port-client";
export declare class PortBinder {
    private readonly portClient;
    constructor(portClient?: PortClient);
    bind(ports: Port[]): Promise<PortBindings>;
}
export declare class PortBindings {
    private readonly ports;
    getBinding(port: Port): Port;
    setBinding(key: Port, value: Port): void;
    getHostPorts(): Port[];
    getInternalPorts(): Port[];
    iterator(): Iterable<[Port, Port]>;
}
