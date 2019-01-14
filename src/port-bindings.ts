import { PortMap as DockerodePortMap } from "dockerode";
import { Port, PortString } from "./port";
import { RandomSocketClient, SocketClient } from "./socket-client";

type ContainerExposedPorts = { [port in PortString]: {} };
type ContainerPortBindings = DockerodePortMap;

class PortMap {
    private readonly portMap = new Map<Port, Port>();

    public getMapping(port: Port): Port | undefined {
        return this.portMap.get(port);
    }

    public setMapping(key: Port, value: Port): void {
        this.portMap.set(key, value);
    }

    public iterator(): Iterable<[Port, Port]> {
        return this.portMap;
    }
}

export class PortBindings {
    constructor(private readonly socketClient: SocketClient = new RandomSocketClient()) {}

    public async bind(ports: Port[]): Promise<BoundPortBindings> {
        const portMap = await this.createPortMap(ports);
        return new BoundPortBindings(portMap);
    }

    private async createPortMap(ports: Port[]): Promise<PortMap> {
        const portMap = new PortMap();
        for (const port of ports) {
            portMap.setMapping(port, await this.socketClient.getPort());
        }
        return portMap;
    }
}

export class BoundPortBindings {
    constructor(private readonly portMap: PortMap) {}

    public getMappedPort(port: Port): Port {
        const mappedPort = this.portMap.getMapping(port);
        if (!mappedPort) {
            throw new Error(`No port mapping found for "${port}". Did you forget to bind it?`);
        }
        return mappedPort;
    }

    public getExposedPorts(): ContainerExposedPorts {
        const exposedPorts: ContainerExposedPorts = {};
        for (const [containerPort] of this.portMap.iterator()) {
            exposedPorts[containerPort.toString()] = {};
        }
        return exposedPorts;
    }

    public getPortBindings(): ContainerPortBindings {
        const portBindings: ContainerPortBindings = {};
        for (const [containerPort, hostPort] of this.portMap.iterator()) {
            portBindings[containerPort.toString()] = [{ HostPort: hostPort.toString() }];
        }
        return portBindings;
    }
}
