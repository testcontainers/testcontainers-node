import { Port } from "./port";
export interface PortClient {
    getPort(): Promise<Port>;
}
export declare class RandomPortClient implements PortClient {
    getPort(): Promise<Port>;
}
