"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ContainerState {
    constructor(portBindings) {
        this.portBindings = portBindings;
    }
    getHostPorts() {
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
exports.ContainerState = ContainerState;
