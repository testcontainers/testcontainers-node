import { PortMap } from "dockerode";
import { SocketClient } from "./socket-client";
declare type ContainerExposedPorts = {
    [port: string]: {};
};
declare type ContainerPortBindings = PortMap;
export declare class PortBindings {
    private readonly socketClient;
    constructor(socketClient?: SocketClient);
    bind(ports: number[]): Promise<StartedPortBindings>;
    private createPortBindings;
}
export declare class StartedPortBindings {
    private readonly portBindings;
    constructor(portBindings: Map<number, number>);
    getMappedPort(port: number): number;
    getExposedPorts(): ContainerExposedPorts;
    getPortBindings(): ContainerPortBindings;
}
export {};
