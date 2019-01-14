import getRandomPort from "get-port";
import { Port } from "./port";

export interface PortClient {
    getPort(): Promise<Port>;
}

export class RandomPortClient implements PortClient {
    public getPort(): Promise<Port> {
        return getRandomPort();
    }
}

export class FixedPortClient implements PortClient {
    private portIndex = 0;

    constructor(private readonly ports: Port[]) {}

    public getPort(): Promise<Port> {
        return Promise.resolve(this.ports[this.portIndex++]);
    }
}
