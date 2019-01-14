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
