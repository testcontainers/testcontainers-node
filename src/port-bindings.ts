import { PortMap } from "dockerode";
import { RandomSocketClient, SocketClient } from "./socket-client";

type ContainerExposedPorts = { [port: string]: {} };
type ContainerPortBindings = PortMap;

export class PortBindings {
    constructor(private socketClient: SocketClient = new RandomSocketClient()) {}

    public async bind(ports: number[]): Promise<StartedPortBindings> {
        const result = new Map<number, number>();
        for (const port of ports) {
            result.set(port, await this.socketClient.getPort());
        }
        return new StartedPortBindings(result);
    }
}

export class StartedPortBindings {
    constructor(private portBindings: Map<number, number>) {}

    public getMappedPort(port: number): number {
        const result = this.portBindings.get(port);
        if (!result) {
            throw new Error();
        }
        return result;
    }

    public getExposedPorts(): ContainerExposedPorts {
        const result: ContainerExposedPorts = {};
        for (const [k] of this.portBindings) {
            result[k.toString()] = {};
        }
        return result;
    }

    public getPortBindings(): ContainerPortBindings {
        const result: ContainerPortBindings = {};
        for (const [k, v] of this.portBindings) {
            result[k.toString()] = [{ HostPort: v.toString() }];
        }
        return result;
    }
}
