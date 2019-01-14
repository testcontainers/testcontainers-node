import { PortMap as DockerodePortMap } from "dockerode";
import { Port, PortString } from "./port";
import { SocketClient } from "./socket-client";
declare type ContainerExposedPorts = {
    [port in PortString]: {};
};
declare type ContainerPortBindings = DockerodePortMap;
declare class PortMap {
    private readonly portMap;
    getMapping(port: Port): Port | undefined;
    setMapping(key: Port, value: Port): void;
    iterator(): Iterable<[Port, Port]>;
}
export declare class PortBindings {
    private readonly socketClient;
    constructor(socketClient?: SocketClient);
    bind(ports: Port[]): Promise<BoundPortBindings>;
    private createPortMap;
}
export declare class BoundPortBindings {
    private readonly portMap;
    constructor(portMap: PortMap);
    getMappedPort(port: Port): Port;
    getExposedPorts(): ContainerExposedPorts;
    getPortBindings(): ContainerPortBindings;
}
export {};
