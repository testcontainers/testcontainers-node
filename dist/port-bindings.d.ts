import { PortMap as DockerodePortMap } from "dockerode";
import { Port, PortString } from "./port";
import { SocketClient } from "./socket-client";
export declare class PortBinder {
    private readonly socketClient;
    constructor(socketClient?: SocketClient);
    bind(ports: Port[]): Promise<PortBindings>;
    private createPortMap;
}
export interface PortBindings {
    getMappedPort(port: Port): Port;
    getExposedPorts(): ContainerExposedPorts;
    getPortBindings(): ContainerPortBindings;
}
export declare class FakePortBindings implements PortBindings {
    private readonly portMap;
    private readonly containerExposedPorts;
    private readonly containerPortBindings;
    constructor(portMap: PortMap, containerExposedPorts: ContainerExposedPorts, containerPortBindings: ContainerPortBindings);
    getMappedPort(port: Port): Port;
    getExposedPorts(): ContainerExposedPorts;
    getPortBindings(): ContainerPortBindings;
}
export declare class PortMap {
    private readonly portMap;
    getMapping(port: Port): Port | undefined;
    setMapping(key: Port, value: Port): void;
    iterator(): Iterable<[Port, Port]>;
}
declare type ContainerExposedPorts = {
    [port in PortString]: {};
};
declare type ContainerPortBindings = DockerodePortMap;
export {};
