"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ContainerState {
    constructor(portBindings) {
        this.portBindings = portBindings;
    }
    getHostPorts() {
        return this.portBindings.getHostPorts();
    }
}
exports.ContainerState = ContainerState;
