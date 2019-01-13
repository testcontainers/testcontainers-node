export interface SocketClient {
    getPort(): Promise<number>;
}
export declare class RandomSocketClient implements SocketClient {
    getPort(): Promise<number>;
}
export declare class FixedSocketClient implements SocketClient {
    private readonly ports;
    private portIndex;
    constructor(ports: number[]);
    getPort(): Promise<number>;
}
