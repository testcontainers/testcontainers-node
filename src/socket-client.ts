import getRandomPort from "get-port";
import { Port } from "./port";

export interface SocketClient {
    getPort(): Promise<Port>;
}

export class RandomSocketClient implements SocketClient {
    public getPort(): Promise<Port> {
        return getRandomPort();
    }
}

export class FixedSocketClient implements SocketClient {
    private portIndex = 0;

    constructor(private readonly ports: Port[]) {}

    public getPort(): Promise<Port> {
        return Promise.resolve(this.ports[this.portIndex++]);
    }
}
