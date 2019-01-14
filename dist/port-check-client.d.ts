import { Port } from "./port";
export interface PortCheckClient {
    isFree(port: Port): Promise<boolean>;
}
export declare class SystemPortCheckClient implements PortCheckClient {
    isFree(port: Port): Promise<boolean>;
}
export declare class BusyPortCheckClient implements PortCheckClient {
    isFree(port: Port): Promise<boolean>;
}
export declare class FreePortCheckClient implements PortCheckClient {
    isFree(port: Port): Promise<boolean>;
}
