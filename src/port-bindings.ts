import { PortMap } from "dockerode";
import { RandomSocketClient, SocketClient } from "./socket-client";

type ContainerExposedPorts = { [port: string]: {} };
type ContainerPortBindings = PortMap;

export class PortBindings {
    constructor(private readonly socketClient: SocketClient = new RandomSocketClient()) {}

    public async bind(ports: number[]): Promise<BoundPortBindings> {
        const portBindings = await this.createPortBindings(ports);
        return new BoundPortBindings(portBindings);
    }

    private async createPortBindings(ports: number[]): Promise<Map<number, number>> {
        const portBindings = new Map<number, number>();
        for (const port of ports) {
            portBindings.set(port, await this.socketClient.getPort());
        }
        return portBindings;
    }
}

export class BoundPortBindings {
    constructor(private readonly portBindings: Map<number, number>) {}

    public getMappedPort(port: number): number {
        const mappedPort = this.portBindings.get(port);
        if (!mappedPort) {
            throw new Error(`No port mapping found for "${port}". Did you forget to bind it?`);
        }
        return mappedPort;
    }

    public getExposedPorts(): ContainerExposedPorts {
        const exposedPorts: ContainerExposedPorts = {};
        for (const [k] of this.portBindings) {
            exposedPorts[k.toString()] = {};
        }
        return exposedPorts;
    }

    public getPortBindings(): ContainerPortBindings {
        const portBindings: ContainerPortBindings = {};
        for (const [k, v] of this.portBindings) {
            portBindings[k.toString()] = [{ HostPort: v.toString() }];
        }
        return portBindings;
    }
}
