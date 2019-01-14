import { Port } from "./port";
export interface PortClient {
    getPort(): Promise<Port>;
}
export declare class RandomPortClient implements PortClient {
    getPort(): Promise<Port>;
}
export declare class FixedPortClient implements PortClient {
    private readonly ports;
    private portIndex;
    constructor(ports: Port[]);
    getPort(): Promise<Port>;
}
