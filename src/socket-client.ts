import getRandomPort from "get-port";

export interface SocketClient {
    getPort(): Promise<number>;
}

export class RandomSocketClient implements SocketClient {
    public getPort(): Promise<number> {
        return getRandomPort();
    }
}

export class FixedSocketClient implements SocketClient {
    private portIndex = 0;

    constructor(private readonly ports: number[]) {}

    public getPort(): Promise<number> {
        return Promise.resolve(this.ports[this.portIndex++]);
    }
}
