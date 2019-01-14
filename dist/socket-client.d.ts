import { Port } from "./port";
export interface SocketClient {
    getPort(): Promise<Port>;
}
export declare class RandomSocketClient implements SocketClient {
    getPort(): Promise<Port>;
}
export declare class FixedSocketClient implements SocketClient {
    private readonly ports;
    private portIndex;
    constructor(ports: Port[]);
    getPort(): Promise<Port>;
}
