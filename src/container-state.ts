import { Port } from "./port";
import { PortBindings } from "./port-bindings";

export class ContainerState {
    constructor(private readonly portBindings: PortBindings) {}

    public getHostPorts(): Port[] {
        const portBindings = this.portBindings.getPortBindings();
        return Object.values(portBindings).map(hostPorts => {
            const hostPort = hostPorts[0].HostPort;
            if (!hostPort) {
                throw new Error();
            }
            return Number(hostPort);
        });
    }
}
